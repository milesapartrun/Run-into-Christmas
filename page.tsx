
"use client";

import { useEffect, useState } from "react";
import {
  ArrowUpRight, Check, ChevronRight, LockKeyhole,
  Snowflake, UploadCloud, Trophy, Footprints,
  CalendarDays, X, Globe2, Heart, Route, Users
} from "lucide-react";
import { supabase } from "../lib/supabase";

type Profile = {
  id: string;
  first_name: string;
  last_name: string;
};

type Run = {
  user_id: string;
  day: number;
  status: "approved" | "pending" | "rejected";
  distance_km: number | null;
};

type Runner = {
  id: string;
  name: string;
  km: number;
  activeDays: number;
};

const TARGET_KM = 40000;
const DONATION_PER_KM = 0.01;
const CHALLENGE_YEAR = 2026;

function formatKm(value: number) {
  return value.toLocaleString("de-DE", {
    maximumFractionDigits: 2
  });
}

function formatEuro(value: number) {
  return value.toLocaleString("de-DE", {
    style: "currency",
    currency: "EUR"
  });
}

function getInitials(first: string, last: string) {
  return `${first?.[0] || ""}${last?.[0] || ""}`.toUpperCase();
}

function getChallengeDay() {
  const now = new Date();

  if (now.getFullYear() !== CHALLENGE_YEAR || now.getMonth() !== 11) {
    return 0;
  }

  return Math.min(now.getDate(), 24);
}

export default function Home() {
  const [showAuth, setShowAuth] = useState(false);
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [user, setUser] = useState<Profile | null>(null);
  const [runs, setRuns] = useState<Run[]>([]);
  const [runners, setRunners] = useState<Runner[]>([]);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [distance, setDistance] = useState("");
  const [refreshing, setRefreshing] = useState(true);

  async function loadData() {
    if (!supabase) {
      setRefreshing(false);
      return;
    }

    try {
      const { data: authData } = await supabase.auth.getUser();
      const authUser = authData.user;

      if (authUser) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, first_name, last_name")
          .eq("id", authUser.id)
          .maybeSingle();

        if (profile) setUser(profile as Profile);
      }

      const { data: allProfiles, error: profileError } = await supabase
        .from("profiles")
        .select("id, first_name, last_name");

      if (profileError) throw profileError;

      const { data: allRuns, error: runError } = await supabase
        .from("runs")
        .select("user_id, day, status, distance_km");

      if (runError) throw runError;

      const profileList = (allProfiles || []) as Profile[];
      const runList = (allRuns || []) as Run[];

      setRuns(
        authUser
          ? runList.filter((r) => r.user_id === authUser.id)
          : []
      );

      const ranking: Runner[] = profileList.map((profile) => {
        const approvedRuns = runList.filter(
          (r) =>
            r.user_id === profile.id &&
            r.status === "approved"
        );

        return {
          id: profile.id,
          name: `${profile.first_name} ${profile.last_name?.[0] || ""}.`,
          km: approvedRuns.reduce(
            (sum, r) => sum + Number(r.distance_km || 0),
            0
          ),
          activeDays: new Set(approvedRuns.map((r) => r.day)).size
        };
      });

      ranking.sort((a, b) => b.km - a.km);
      setRunners(ranking);
    } catch (error) {
      console.error("Fehler beim Laden der Challenge:", error);
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const approvedRuns = runs.filter(
    (r) => r.status === "approved"
  );

  const myKm = approvedRuns.reduce(
    (sum, r) => sum + Number(r.distance_km || 0),
    0
  );

  const myActiveDays = new Set(
    approvedRuns.map((r) => r.day)
  ).size;

  const myPending = runs.filter(
    (r) => r.status === "pending"
  ).length;

  const communityKm = runners.reduce(
    (sum, r) => sum + r.km,
    0
  );

  const progress = Math.min(
    (communityKm / TARGET_KM) * 100,
    100
  );

  const remainingKm = Math.max(
    TARGET_KM - communityKm,
    0
  );

  const donation = communityKm * DONATION_PER_KM;

  const challengeDay = getChallengeDay();

  const elapsedDays = challengeDay;
  const communityAverage =
    elapsedDays > 0 ? communityKm / elapsedDays : 0;

  const myAverage =
    myActiveDays > 0 ? myKm / myActiveDays : 0;

  const myRank =
    user
      ? runners.findIndex((r) => r.id === user.id) + 1
      : 0;

  async function submitAuth(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    if (!supabase) {
      setMessage("Bitte zuerst Supabase konfigurieren.");
      return;
    }

    setLoading(true);

    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              first_name: first.trim(),
              last_name: last.trim()
            }
          }
        });

        if (error) throw error;

        if (data.user && !data.session) {
          setMessage(
            "Fast geschafft! Bitte bestätige deine E-Mail über den Link in deinem Postfach."
          );
        } else {
          setMessage("Registrierung erfolgreich.");
          await loadData();
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error) throw error;

        setShowAuth(false);
        window.location.reload();
      }
    } catch (err) {
      setMessage(
        err instanceof Error
          ? err.message
          : "Das hat leider nicht geklappt."
      );
    } finally {
      setLoading(false);
    }
  }

  async function submitRun(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    if (!supabase || !user || selectedDay === null) {
      setMessage("Bitte melde dich zuerst an.");
      return;
    }

    const km = Number(distance.replace(",", "."));

    if (!Number.isFinite(km) || km <= 0 || km > 300) {
      setMessage("Bitte gib eine gültige Distanz zwischen 0 und 300 km ein.");
      return;
    }

    if (!uploadFile) {
      setMessage("Bitte wähle einen Laufnachweis aus.");
      return;
    }

    if (uploadFile.size > 10 * 1024 * 1024) {
      setMessage("Die Datei darf maximal 10 MB groß sein.");
      return;
    }

    const allowedTypes = [
      "image/png",
      "image/jpeg",
      "image/webp"
    ];

    if (!allowedTypes.includes(uploadFile.type)) {
      setMessage("Bitte lade ein PNG-, JPG- oder WEBP-Bild hoch.");
      return;
    }

    const now = new Date();

    if (
      now.getFullYear() !== CHALLENGE_YEAR ||
      now.getMonth() !== 11 ||
      now.getDate() !== selectedDay ||
      selectedDay > 24
    ) {
      setMessage(
        "Du kannst deinen Lauf am jeweiligen Challenge-Tag einreichen."
      );
      return;
    }

    setLoading(true);

    try {
      const { data: authData } = await supabase.auth.getUser();

      if (!authData.user) {
        throw new Error("Bitte melde dich erneut an.");
      }

      const userId = authData.user.id;

      const path =
        `${userId}/${selectedDay}/${Date.now()}-` +
        uploadFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");

      const { error: uploadError } = await supabase.storage
        .from("run-proofs")
        .upload(path, uploadFile, { upsert: false });

      if (uploadError) throw uploadError;

      const runDate =
        `${CHALLENGE_YEAR}-12-${String(selectedDay).padStart(2, "0")}`;

      const { error } = await supabase.from("runs").upsert(
        {
          user_id: userId,
          day: selectedDay,
          run_date: runDate,
          distance_km: km,
          proof_path: path,
          status: "pending"
        },
        { onConflict: "user_id,day" }
      );

      if (error) throw error;

      setMessage(
        `Deine ${formatKm(km)} km wurden eingereicht und warten auf die Prüfung.`
      );

      setDistance("");
      setUploadFile(null);

      await loadData();
    } catch (err) {
      setMessage(
        err instanceof Error
          ? err.message
          : "Der Lauf konnte nicht eingereicht werden."
      );
    } finally {
      setLoading(false);
    }
  }

  function openDay(day: number) {
    setMessage("");

    const existingRun = runs.find((r) => r.day === day);

    if (!user) {
      setMode("signup");
      setShowAuth(true);
      return;
    }

    if (existingRun?.status === "approved") {
      setMessage(
        `Tag ${day}: ${formatKm(Number(existingRun.distance_km || 0))} km bestätigt.`
      );
      return;
    }

    if (existingRun?.status === "pending") {
      setMessage(`Dein Nachweis für Tag ${day} wird geprüft.`);
      return;
    }

    if (day > challengeDay || challengeDay === 0) {
      setMessage(`Tag ${day} öffnet am ${day}. Dezember 2026.`);
      return;
    }

    setSelectedDay(day);
    setDistance("");
    setUploadFile(null);
  }

  return (
    <main>
      <nav className="nav wrap">
        <a className="brand" href="#">
          <span className="brand-mark">
            <Footprints size={19} />
          </span>
          RUN INTO <span className="brand-light">CHRISTMAS</span>
          <span className="year">’26</span>
        </a>

        <div className="nav-links">
          <a href="#challenge">Challenge</a>
          <a href="#earth">Weltchallenge</a>
          <a href="#ranking">Leaderboard</a>
          <a href="#donation">Spenden</a>
        </div>

        <button
          className="nav-cta"
          onClick={() => {
            setMode("login");
            setShowAuth(true);
          }}
        >
          {user ? "Mein Profil" : "Login"}
          <ArrowUpRight size={16} />
        </button>
      </nav>

      <section className="hero wrap">
        <div className="hero-copy">
          <div className="eyebrow">
            <Snowflake size={15} />
            24 DAYS WINTER RUNNING CHALLENGE
          </div>

          <h1>
            RUN INTO
            <br />
            <em>CHRISTMAS.</em>
          </h1>

          <p className="hero-sub">
            1.–24. Dezember 2026.
            <br />
            Gemeinsam Kilometer sammeln.
          </p>

          <p className="hero-text">
            Lauf so viel du kannst. Jeder Kilometer zählt.
            Gemeinsam laufen wir einmal um die Erde und
            sammeln dabei Spenden für Laureus Sport for Good.
          </p>

          <div className="hero-actions">
            <button
              className="button-red"
              onClick={() => {
                setMode("signup");
                setShowAuth(true);
              }}
            >
              Jetzt mitlaufen <ChevronRight size={18} />
            </button>

            <a className="text-link" href="#earth">
              Unser gemeinsames Ziel <ArrowUpRight size={16} />
            </a>
          </div>

          <div className="hero-note">
            <span className="live-dot" />
            24 TAGE · EIN TEAM · 40.000 KM
          </div>
        </div>

        <div className="hero-art">
          <div className="art-orbit orbit-one" />
          <div className="art-orbit orbit-two" />
          <div className="art-snow snow-a">✳</div>
          <div className="art-snow snow-b">✳</div>
          <div className="art-vertical">MOVE TOGETHER</div>

          <div className="art-card">
            <span>ONE COMMUNITY</span>
            <strong>
              {formatKm(communityKm)}
              <span>KM</span>
            </strong>
            <div className="art-line" />
            <span>EVERY KILOMETER COUNTS</span>
          </div>

          <div className="art-stamp">
            RUN
            <br />
            FOR
            <br />
            GOOD
            <span>✳</span>
          </div>

          <div className="art-bottom">
            EST. DECEMBER 2026 <span>✳</span> EVERY KM COUNTS
          </div>
        </div>
      </section>

      <section className="stats-band">
        <div className="wrap stats-grid">
          <div>
            <strong>{formatKm(communityKm)}</strong>
            <span>GELAUFENE KM</span>
          </div>
          <div>
            <strong>{runners.length}</strong>
            <span>REGISTRIERTE LÄUFER</span>
          </div>
          <div>
            <strong>{formatKm(communityAverage)}</strong>
            <span>KM COMMUNITY-SCHNITT / TAG</span>
          </div>
          <div>
            <strong>{formatEuro(donation)}</strong>
            <span>DEINE KM-SPENDE</span>
          </div>
        </div>
      </section>

      <section className="earth-section" id="earth">
        <div className="wrap earth-layout">
          <div className="earth-copy">
            <div className="eyebrow">
              <Globe2 size={15} /> UNSER GEMEINSAMES ZIEL
            </div>

            <h2>
              EINMAL UM
              <br />
              <em>DIE ERDE.</em>
            </h2>

            <p>
              40.000 Kilometer. 24 Tage. Eine Community.
              Jeder bestätigte Kilometer bringt uns unserem
              gemeinsamen Ziel ein Stück näher.
            </p>

            <div className="earth-number">
              <strong>{formatKm(communityKm)}</strong>
              <span>von 40.000 km</span>
            </div>

            <div
              className="earth-progress"
              role="progressbar"
              aria-valuenow={Math.round(progress)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Fortschritt der gemeinsamen Erdumrundung"
            >
              <span style={{ width: `${progress}%` }} />
            </div>

            <div className="earth-progress-labels">
              <span>{progress.toLocaleString("de-DE", {
                maximumFractionDigits: 2
              })}% geschafft</span>
              <span>{formatKm(remainingKm)} km fehlen</span>
            </div>

            <div className="earth-facts">
              <div>
                <Route size={19} />
                <span>
                  <strong>{formatKm(communityKm)}</strong>
                  Kilometer gemeinsam
                </span>
              </div>

              <div>
                <Heart size={19} />
                <span>
                  <strong>{formatEuro(donation)}</strong>
                  Spende aus den Community-Kilometern
                </span>
              </div>
            </div>
          </div>

          <div className="earth-visual">
            <div className="earth-glow" />
            <div className="earth-orbit earth-orbit-a" />
            <div className="earth-orbit earth-orbit-b" />

            <div className="earth-globe">
              <Globe2 size={190} strokeWidth={0.7} />
            </div>

            <div className="earth-target">
              <span>MISSION</span>
              <strong>40.000 KM</strong>
              <span>ONE PLANET. ONE TEAM.</span>
            </div>

            <div className="earth-percent">
              {progress.toLocaleString("de-DE", {
                maximumFractionDigits: 1
              })}%
            </div>
          </div>
        </div>
      </section>

      <section className="donation-section" id="donation">
        <div className="wrap donation-layout">
          <div>
            <div className="eyebrow">
              <Heart size={15} /> RUNNING FOR GOOD
            </div>

            <h2>
              JEDER KM.
              <br />
              <em>HILFT.</em>
            </h2>

            <p>
              Als Gründer spende ich einen Cent für jeden
              bestätigten Kilometer unserer Community.
              Bei 40.000 Kilometern kommen so 400 € zusammen.
            </p>

            <p>
              Du möchtest dich ebenfalls beteiligen?
              Am 24. Dezember freuen wir uns über jede
              zusätzliche freiwillige Spende – ganz so,
              wie es für dich möglich ist.
            </p>

            <a
              className="text-link"
              href="https://www.laureus.de/"
              target="_blank"
              rel="noreferrer"
            >
              Laureus Sport for Good kennenlernen
              <ArrowUpRight size={16} />
            </a>
          </div>

          <div className="donation-card">
            <span className="mini-label">AKTUELLER SPENDENSTAND</span>
            <strong className="donation-amount">
              {formatEuro(donation)}
            </strong>
            <span>
              von {formatEuro(TARGET_KM * DONATION_PER_KM)}
            </span>

            <div className="donation-track">
              <span style={{ width: `${progress}%` }} />
            </div>

            <div className="donation-meta">
              <span>{progress.toLocaleString("de-DE", {
                maximumFractionDigits: 1
              })}% des Spendenziels</span>
              <span>1 Cent / km</span>
            </div>

            <div className="donation-note">
              <Heart size={20} />
              <p>
                Die Kilometer-Spende wird zum Ende der
                Challenge berechnet. Zusätzliche Spenden
                werden separat geleistet.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section wrap" id="challenge">
        <div className="section-heading">
          <div>
            <div className="eyebrow red">
              <CalendarDays size={15} /> 1.–24. DEZEMBER 2026
            </div>
            <h2>
              DEIN DEZEMBER.
              <br />
              <em>DEINE KILOMETER.</em>
            </h2>
          </div>

          <p>
            Jeder Tag ist eine neue Gelegenheit, Kilometer
            zu sammeln. Lauf in deinem Tempo und trage deine
            Tagesdistanz ein. Jeder bestätigte Lauf zählt.
          </p>
        </div>

        <div className="calendar-top">
          <span>
            <b>01 — 24</b> / DEZEMBER
          </span>
          <span className="calendar-legend">
            <i className="legend-done" /> Bestätigt
            <i className="legend-today" /> Heute
            <i className="legend-locked" /> Zukünftig
          </span>
        </div>

        <div className="calendar-grid">
          {Array.from({ length: 24 }, (_, i) => {
            const day = i + 1;
            const run = runs.find((r) => r.day === day);
            const done = run?.status === "approved";
            const pending = run?.status === "pending";
            const locked = challengeDay === 0 || day > challengeDay;

            return (
              <button
                key={day}
                className={`door ${done ? "done" : ""} ${
                  pending ? "pending" : ""
                } ${day === challengeDay ? "today" : ""} ${
                  locked ? "locked" : ""
                }`}
                onClick={() => openDay(day)}
              >
                <span className="door-day">
                  {String(day).padStart(2, "0")}
                </span>

                {done ? (
                  <>
                    <Check size={23} />
                    <strong className="door-distance">
                      {formatKm(Number(run?.distance_km || 0))}
                      <small>KM</small>
                    </strong>
                  </>
                ) : pending ? (
                  <>
                    <UploadCloud size={21} />
                    <strong className="door-distance">
                      {formatKm(Number(run?.distance_km || 0))}
                      <small>KM</small>
                    </strong>
                  </>
                ) : locked ? (
                  <LockKeyhole size={18} />
                ) : (
                  <span className="door-km">+</span>
                )}

                <span className="door-label">
                  {done
                    ? "BESTÄTIGT"
                    : pending
                    ? "IN PRÜFUNG"
                    : locked
                    ? "DEZEMBER"
                    : "LAUF EINTRAGEN"}
                </span>
              </button>
            );
          })}
        </div>

        {!user && (
          <div className="calendar-gate">
            <LockKeyhole size={17} />
            <span>
              Melde dich an, um deine Kilometer zu speichern.
            </span>
            <button
              onClick={() => {
                setMode("signup");
                setShowAuth(true);
              }}
            >
              Kostenlos registrieren <ChevronRight size={16} />
            </button>
          </div>
        )}

        {user && (
          <div className="progress-card">
            <div>
              <span className="mini-label">DEINE BISHERIGE LEISTUNG</span>
              <h3>
                {formatKm(myKm)}{" "}
                <small>km bestätigt</small>
              </h3>
              <p>
                {myActiveDays} aktive Lauftage ·
                {" "}{formatKm(myAverage)} km pro aktivem Lauftag
                {myPending > 0 && ` · ${myPending} in Prüfung`}
              </p>
            </div>

            <button
              className="button-dark"
              onClick={() => openDay(challengeDay || 1)}
            >
              Kilometer eintragen <UploadCloud size={17} />
            </button>
          </div>
        )}

        {message && !showAuth && (
          <div className="inline-message">{message}</div>
        )}
      </section>

      <section className="section wrap leaderboard" id="ranking">
        <div className="section-heading">
          <div>
            <div className="eyebrow red">
              <Trophy size={15} /> DIE COMMUNITY
            </div>
            <h2>
              KILOMETER
              <br />
              <em>FÜR KILOMETER.</em>
            </h2>
          </div>

          <p>
            Wer hat bisher die meisten Kilometer gesammelt?
            Hier zählt die bestätigte Gesamtdistanz jedes
            Teilnehmers.
          </p>
        </div>

        {user && (
          <div className="personal-rank">
            <Users size={20} />
            <div>
              <span className="mini-label">DEIN AKTUELLER PLATZ</span>
              <strong>
                {myRank > 0 ? `Platz ${myRank}` : "Noch ohne Rang"}
              </strong>
            </div>
            <div className="personal-rank-km">
              {formatKm(myKm)} km
            </div>
          </div>
        )}

        <div className="leaderboard-table">
          <div className="table-head">
            <span>RANG / NAME</span>
            <span>GESAMT-KM</span>
            <span>KM / AKTIVEM TAG</span>
          </div>

          {runners.length === 0 ? (
            <div className="table-row">
              <span>Noch keine Teilnehmer</span>
              <span>0 km</span>
              <span>–</span>
            </div>
          ) : (
            runners.map((runner, i) => (
              <div
                className={`table-row ${
                  runner.id === user?.id ? "you-row" : ""
                }`}
                key={runner.id}
              >
                <span className="rank-name">
                  <b>{String(i + 1).padStart(2, "0")}</b>
                  <strong>{runner.name}</strong>
                  {i === 0 && runner.km > 0 && (
                    <span className="leader-tag">TOP RUNNER</span>
                  )}
                </span>

                <span className="rank-km">
                  {formatKm(runner.km)} km
                </span>

                <span className="rank-count">
                  {runner.activeDays > 0
                    ? `${formatKm(runner.km / runner.activeDays)} km`
                    : "–"}
                </span>
              </div>
            ))
          )}
        </div>

        <p className="table-note">
          Es zählen ausschließlich bestätigte Kilometer.
          Ausstehende Nachweise werden erst nach der Prüfung
          in der Rangliste berücksichtigt.
        </p>

        <div className="leaderboard-bottom">
          <span>
            <span className="live-dot" /> GEMEINSAM STÄRKER
          </span>
          <span>JEDER KILOMETER ZÄHLT.</span>
        </div>
      </section>

      <footer className="footer">
        <div className="wrap footer-inner">
          <a className="brand footer-brand" href="#">
            <span className="brand-mark">
              <Footprints size={19} />
            </span>
            RUN INTO <span className="brand-light">CHRISTMAS</span>
            <span className="year">’26</span>
          </a>
          <span>MOVE TOGETHER. RUN FOR GOOD.</span>
          <span>© RUN INTO CHRISTMAS 2026</span>
        </div>
      </footer>

      {selectedDay !== null && (
        <div
          className="modal-backdrop"
          onClick={() => setSelectedDay(null)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close"
              onClick={() => setSelectedDay(null)}
              aria-label="Schließen"
            >
              <X size={20} />
            </button>

            <div className="eyebrow red">
              <UploadCloud size={15} /> DEINE TAGESKILOMETER
            </div>

            <h2>
              TAG {String(selectedDay).padStart(2, "0")}
              <br />
              <em>DEIN LAUF.</em>
            </h2>

            <p>
              Wie viele Kilometer bist du heute insgesamt
              gelaufen? Trage deine Tagesdistanz ein und lade
              einen Screenshot deiner Lauf-App als Nachweis hoch.
            </p>

            <form onSubmit={submitRun}>
              <label>
                Gesamte Laufdistanz (km)
                <input
                  type="number"
                  min="0.1"
                  max="300"
                  step="0.01"
                  value={distance}
                  onChange={(e) => setDistance(e.target.value)}
                  required
                  placeholder="z. B. 6,5"
                />
              </label>

              <label className="upload-box">
                <UploadCloud size={28} />
                <strong>
                  {uploadFile
                    ? uploadFile.name
                    : "Laufnachweis auswählen"}
                </strong>
                <span>PNG, JPG oder WEBP · max. 10 MB</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) =>
                    setUploadFile(e.target.files?.[0] || null)
                  }
                  required
                />
              </label>

              <button
                className="button-red full"
                disabled={loading || !uploadFile}
              >
                {loading ? "Wird eingereicht …" : "Lauf einreichen"}
                <ChevronRight size={18} />
              </button>
            </form>

            {message && (
              <div className="inline-message">{message}</div>
            )}
          </div>
        </div>
      )}

      {showAuth && (
        <div
          className="modal-backdrop"
          onClick={() => setShowAuth(false)}
        >
          <div
            className="modal auth-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close"
              onClick={() => setShowAuth(false)}
              aria-label="Schließen"
            >
              <X size={20} />
            </button>

            <div className="eyebrow red">
              <Snowflake size={15} /> RUN INTO CHRISTMAS
            </div>

            <h2>
              {mode === "signup"
                ? "LET’S MOVE."
                : "WILLKOMMEN ZURÜCK."}
            </h2>

            <p>
              {mode === "signup"
                ? "Registriere dich und sammle mit uns Kilometer für den guten Zweck."
                : "Melde dich an, um deine Kilometer einzutragen."}
            </p>

            <div className="auth-tabs">
              <button
                className={mode === "signup" ? "active" : ""}
                onClick={() => {
                  setMode("signup");
                  setMessage("");
                }}
              >
                Registrieren
              </button>
              <button
                className={mode === "login" ? "active" : ""}
                onClick={() => {
                  setMode("login");
                  setMessage("");
                }}
              >
                Login
              </button>
            </div>

            <form onSubmit={submitAuth}>
              {mode === "signup" && (
                <div className="form-two">
                  <label>
                    Vorname
                    <input
                      value={first}
                      onChange={(e) => setFirst(e.target.value)}
                      required
                      autoComplete="given-name"
                      placeholder="Alex"
                    />
                  </label>

                  <label>
                    Nachname
                    <input
                      value={last}
                      onChange={(e) => setLast(e.target.value)}
                      required
                      autoComplete="family-name"
                      placeholder="Muster"
                    />
                  </label>
                </div>
              )}

              <label>
                E-Mail-Adresse
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="du@beispiel.de"
                />
              </label>

              <label>
                Passwort
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete={
                    mode === "signup"
                      ? "new-password"
                      : "current-password"
                  }
                  placeholder="Mindestens 8 Zeichen"
                />
              </label>

              <button
                className="button-red full"
                disabled={loading}
              >
                {loading
                  ? "Einen Moment …"
                  : mode === "signup"
                  ? "Registrieren"
                  : "Einloggen"}
                <ChevronRight size={18} />
              </button>
            </form>

            {message && (
              <div className="inline-message">{message}</div>
            )}

            <small className="legal-note">
              Bitte ergänze vor dem Start die Teilnahmebedingungen
              und Datenschutzhinweise.
            </small>
          </div>
        </div>
      )}
    </main>
  );
}

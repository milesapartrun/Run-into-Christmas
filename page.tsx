 "use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ArrowUpRight, Check, ChevronRight, LockKeyhole, Snowflake, UploadCloud, Trophy, Footprints, CalendarDays, X } from "lucide-react";
import { supabase } from "../lib/supabase";

type Profile = { id: string; first_name: string; last_name: string };
type Run = { day: number; status: "approved" | "pending" | "rejected"; distance_km?: number };

const demoRanking = [
  { name: "Lena M.", count: 18, km: 171 },
  { name: "Jonas K.", count: 16, km: 142 },
  { name: "Mia S.", count: 14, km: 116 },
  { name: "David B.", count: 12, km: 91 },
  { name: "Du bist dran", count: 0, km: 0 },
];

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
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: profile } = await supabase!.from("profiles").select("id, first_name, last_name").eq("id", data.user.id).maybeSingle();
      if (profile) setUser(profile);
      const { data: runData } = await supabase!.from("runs").select("day,status,distance_km").eq("user_id", data.user.id);
      if (runData) setRuns(runData as Run[]);
    });
  }, []);

  async function submitAuth(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    if (!supabase) { setMessage("Bitte zuerst Supabase konfigurieren (siehe README)."); return; }
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { first_name: first.trim(), last_name: last.trim() }
          }
        });
        if (error) throw error;
        if (data.user && !data.session) setMessage("Fast geschafft! Bitte bestätige deine E-Mail über den Link in deinem Postfach.");
        else setMessage("Registrierung erfolgreich. Du kannst jetzt loslegen.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.reload();
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Das hat leider nicht geklappt.");
    } finally { setLoading(false); }
  }

  async function submitRun(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !user || !selectedDay || !uploadFile) {
      setMessage("Bitte anmelden und einen Nachweis auswählen.");
      return;
    }
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    const today = new Date();
    const challengeDate = new Date(today.getFullYear(), 11, selectedDay);
    if (today.getMonth() !== 11 || today.getDate() !== selectedDay) {
      setMessage("Ein Lauf kann nur am jeweiligen Challenge-Tag eingereicht werden.");
      return;
    }
    setLoading(true);
    try {
      const path = `${auth.user.id}/${selectedDay}/${Date.now()}-${uploadFile.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error: uploadError } = await supabase.storage.from("run-proofs").upload(path, uploadFile, { upsert: false });
      if (uploadError) throw uploadError;
      const { error } = await supabase.from("runs").upsert({
        user_id: auth.user.id, day: selectedDay,
        run_date: challengeDate.toISOString().slice(0, 10),
        proof_path: path, status: "pending"
      }, { onConflict: "user_id,day" });
      if (error) throw error;
      setMessage("Nachweis eingereicht! Dein Lauf zählt nach der Prüfung.");
      setSelectedDay(null); setUploadFile(null);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Upload fehlgeschlagen.");
    } finally { setLoading(false); }
  }

  const approved = runs.filter(r => r.status === "approved").length;
  const today = new Date();
  const decemberDay = today.getMonth() === 11 ? today.getDate() : 0;

  return (
    <main>
      <nav className="nav wrap">
        <a className="brand" href="#"><span className="brand-mark"><Footprints size={19}/></span> CHRISTMAS<span className="brand-light">RUN</span><span className="year">’26</span></a>
        <div className="nav-links"><a href="#challenge">Challenge</a><a href="#ranking">Leaderboard</a><a href="#prize">Gewinnspiel</a></div>
        <button className="nav-cta" onClick={() => { setMode(user ? "login" : "signup"); setShowAuth(true); }}>{user ? "Mein Profil" : "Mitmachen"} <ArrowUpRight size={16}/></button>
      </nav>

      <section className="hero wrap">
        <div className="hero-copy">
          <div className="eyebrow"><Snowflake size={15}/> DAS WEIHNACHTS-SPECIAL 2026</div>
          <h1>RUN INTO<br/><em>CHRISTMAS.</em></h1>
          <p className="hero-sub">24 Tage. 24 Challenges.<br/>Dein Dezember, dein Lauf.</p>
          <p className="hero-text">Jeden Tag eine neue Distanz. Sammle deine Läufe, knack deine persönlichen Ziele und lauf gemeinsam mit der Community durch den Advent.</p>
          <div className="hero-actions"><button className="button-red" onClick={() => { setMode("signup"); setShowAuth(true); }}>Challenge starten <ChevronRight size={18}/></button><a className="text-link" href="#challenge">So funktioniert’s <ArrowUpRight size={16}/></a></div>
          <div className="hero-note"><span className="live-dot"/> 24 TAGE · 1 COMMUNITY · DEIN ZIEL</div>
        </div>
        <div className="hero-art" aria-label="Abstrakte sportliche Wintergrafik">
          <div className="art-orbit orbit-one"/><div className="art-orbit orbit-two"/>
          <div className="art-snow snow-a">✳</div><div className="art-snow snow-b">✳</div>
          <div className="art-vertical">MOVE THROUGH DECEMBER</div>
          <div className="art-card"><span>THE DAILY CHALLENGE</span><strong>05<span>KM</span></strong><div className="art-line"/><span>SHOW UP. MOVE FORWARD.</span></div>
          <div className="art-stamp">NO<br/>OFF<br/>DAYS<span>✳</span></div>
          <div className="art-bottom">EST. DECEMBER 2026 <span>✳</span> EVERY KM COUNTS</div>
        </div>
      </section>

      <section className="stats-band"><div className="wrap stats-grid"><div><strong>24</strong><span>TAGE CHALLENGE</span></div><div><strong>300 €</strong><span>GEWINNCHANCE</span></div><div><strong>1–24 KM</strong><span>DEINE TAGESDISTANZ</span></div><div><strong>100%</strong><span>DU KANNST GEWINNEN</span></div></div></section>

      <section className="section wrap" id="challenge">
        <div className="section-heading"><div><div className="eyebrow red"><CalendarDays size={15}/> DEIN ADVENT. DEINE CHALLENGE.</div><h2>ÖFFNE DEIN<br/><em>NÄCHSTES LEVEL.</em></h2></div><p>Die Türchen stehen für deine tägliche Laufdistanz. Ein Tag, ein Ziel. Lade deinen Nachweis hoch und hake deine Challenge ab.</p></div>
        <div className="calendar-top"><span><b>01 — 24</b> / DEZEMBER</span><span className="calendar-legend"><i className="legend-done"/> Erledigt <i className="legend-today"/> Heute <i className="legend-locked"/> Zukünftig</span></div>
        <div className="calendar-grid">{Array.from({length:24}, (_,i) => {
          const day = i + 1;
          const run = runs.find(r => r.day === day);
          const done = run?.status === "approved";
          const pending = run?.status === "pending";
          const locked = decemberDay === 0 || day > decemberDay;
          return <button key={day} className={`door ${done ? "done" : ""} ${pending ? "pending" : ""} ${day === decemberDay ? "today" : ""} ${locked ? "locked" : ""}`} onClick={() => { if (user && !locked && !done) { setSelectedDay(day); setMessage(""); } else if (!user) { setMode("signup"); setShowAuth(true); } else if (done) setMessage(`Tag ${day}: Lauf bestätigt — ${day} km Challenge geschafft!`); else setMessage(`Türchen ${day} ist noch geschlossen. Am ${day}. Dezember geht’s los!`); }}>
            <span className="door-day">{String(day).padStart(2,"0")}</span>{done ? <Check size={23}/> : locked ? <LockKeyhole size={18}/> : <span className="door-km">{day}<small>KM</small></span>}<span className="door-label">{done ? "GESCHAFFT" : pending ? "IN PRÜFUNG" : "CHALLENGE"}</span>
          </button>;
        })}</div>
        {!user && <div className="calendar-gate"><LockKeyhole size={17}/><span>Melde dich an, um deinen persönlichen Fortschritt zu speichern.</span><button onClick={() => { setMode("signup"); setShowAuth(true); }}>Jetzt registrieren <ChevronRight size={16}/></button></div>}
        {user && <div className="progress-card"><div><span className="mini-label">DEIN FORTSCHRITT</span><h3>{approved} <small>/ 24 Challenges bestätigt</small></h3></div><div className="progress-track"><span style={{width:`${approved/24*100}%`}}/></div><button className="button-dark" onClick={() => { setSelectedDay(decemberDay || 1); setMessage(""); }}>Lauf hochladen <UploadCloud size={17}/></button></div>}
        {message && !showAuth && <div className="inline-message">{message}</div>}
      </section>

      <section className="prize-section" id="prize"><div className="wrap prize-layout"><div className="prize-copy"><div className="eyebrow"><Trophy size={15}/> DAS WEIHNACHTS-GEWINNSPIEL</div><h2>DEIN EINSATZ.<br/><em>DEINE CHANCE.</em></h2><p>Gewinne einen <strong>300 € Nike-Gutschein</strong> und starte mit frischer Motivation ins neue Jahr.</p><div className="prize-rule"><span className="rule-number">01</span><p><strong>Jeder kann gewinnen.</strong><br/>Schon ein bestätigter Lauftag reicht, um im Lostopf zu sein.</p></div><div className="prize-rule"><span className="rule-number">02</span><p><strong>Jeder Lauftag = ein Los.</strong><br/>Je mehr Challenges du absolvierst, desto höher ist deine Gewinnchance. 24 bestätigte Tage = 24 Lose.</p></div><button className="button-red" onClick={() => { setMode("signup"); setShowAuth(true); }}>Dabei sein <ChevronRight size={18}/></button><small className="legal-note">Teilnahmebedingungen und Datenschutzhinweise müssen vor dem Start ergänzt und veröffentlicht werden.</small></div><div className="voucher-image"><Image src="/nike-gutschein-300.png" alt="Gestalteter 300-Euro-Nike-Gutschein" fill sizes="(max-width: 800px) 90vw, 42vw" style={{objectFit:"contain"}}/></div></div></section>

      <section className="section wrap leaderboard" id="ranking"><div className="section-heading"><div><div className="eyebrow red"><Trophy size={15}/> DIE COMMUNITY</div><h2>WER BLEIBT<br/><em>IN BEWEGUNG?</em></h2></div><p>Jeder Lauf zählt. Hier siehst du, wer die meisten Challenges erfolgreich abgeschlossen hat.</p></div><div className="leaderboard-table"><div className="table-head"><span>RANG / NAME</span><span>CHALLENGES</span><span>GESAMT-KM*</span></div>{demoRanking.map((r,i)=><div className={`table-row ${i===4?"you-row":""}`} key={r.name}><span className="rank-name"><b>{String(i+1).padStart(2,"0")}</b><strong>{r.name}</strong>{i===0&&<span className="leader-tag">TOP RUNNER</span>}</span><span className="rank-count">{r.count}<small> / 24</small></span><span className="rank-km">{r.km} km</span></div>)}</div><p className="table-note">* Demo-Daten zur Vorschau. Im Livebetrieb werden hier echte Teilnehmer und ausschließlich bestätigte Läufe angezeigt.</p><div className="leaderboard-bottom"><span><span className="live-dot"/> COMMUNITY IN ZAHLEN</span><span>JEDER KILOMETER ZÄHLT. <Snowflake size={15}/></span></div></section>

      <footer className="footer"><div className="wrap footer-inner"><a className="brand footer-brand" href="#"><span className="brand-mark"><Footprints size={19}/></span> CHRISTMAS<span className="brand-light">RUN</span><span className="year">’26</span></a><span>MOVE THROUGH DECEMBER.</span><span>© CHRISTMAS RUN 2026</span></div></footer>

      {selectedDay !== null && <div className="modal-backdrop" onClick={() => setSelectedDay(null)}><div className="modal" onClick={e => e.stopPropagation()}><button className="modal-close" onClick={() => setSelectedDay(null)} aria-label="Schließen"><X size={20}/></button><div className="eyebrow red"><UploadCloud size={15}/> DEIN LAUFNACHWEIS</div><h2>TAG {String(selectedDay).padStart(2,"0")}<br/><em>{selectedDay} KILOMETER.</em></h2><p>Lade einen Screenshot deiner Lauf-App hoch. Dein Nachweis wird nach der Prüfung bestätigt.</p><form onSubmit={submitRun}><label className="upload-box"><UploadCloud size={28}/><strong>{uploadFile ? uploadFile.name : "Screenshot auswählen"}</strong><span>PNG, JPG oder WEBP · max. 10 MB</span><input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => setUploadFile(e.target.files?.[0] || null)} required/></label><button className="button-red full" disabled={loading || !uploadFile}>{loading ? "Wird hochgeladen …" : "Nachweis einreichen"} <ChevronRight size={18}/></button></form>{message && <div className="inline-message">{message}</div>}</div></div>}

      {showAuth && <div className="modal-backdrop" onClick={() => setShowAuth(false)}><div className="modal auth-modal" onClick={e => e.stopPropagation()}><button className="modal-close" onClick={() => setShowAuth(false)} aria-label="Schließen"><X size={20}/></button><div className="eyebrow red"><Snowflake size={15}/> WERDE TEIL DER CHALLENGE</div><h2>{mode === "signup" ? "LET’S MOVE." : "WILLKOMMEN ZURÜCK."}</h2><p>{mode === "signup" ? "Registriere dich kostenlos und lauf mit uns durch den Advent." : "Melde dich an, um deinen Fortschritt zu sehen."}</p><div className="auth-tabs"><button className={mode==="signup"?"active":""} onClick={() => {setMode("signup");setMessage("");}}>Registrieren</button><button className={mode==="login"?"active":""} onClick={() => {setMode("login");setMessage("");}}>Login</button></div><form onSubmit={submitAuth}>{mode==="signup" && <div className="form-two"><label>Vorname<input value={first} onChange={e=>setFirst(e.target.value)} required autoComplete="given-name" placeholder="Alex"/></label><label>Nachname<input value={last} onChange={e=>setLast(e.target.value)} required autoComplete="family-name" placeholder="Muster"/></label></div>}<label>E-Mail-Adresse<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required autoComplete="email" placeholder="du@beispiel.de"/></label><label>Passwort<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required minLength={8} autoComplete={mode==="signup"?"new-password":"current-password"} placeholder="Mindestens 8 Zeichen"/></label><button className="button-red full" disabled={loading}>{loading ? "Einen Moment …" : mode==="signup" ? "Registrieren & E-Mail bestätigen" : "Einloggen"} <ChevronRight size={18}/></button></form>{message && <div className="inline-message">{message}</div>}<small className="legal-note">Mit der Registrierung werden die veröffentlichten Teilnahmebedingungen und Datenschutzhinweise akzeptiert.</small></div></div>}
    </main>
  );
}
# Christmas Run — Weihnachtsspecial 2026

A responsive Next.js starter for a sporty Christmas running challenge.

## Included
- German landing page with sporty winter campaign styling
- Signup/login UI wired to Supabase Auth (email confirmation)
- 24-day advent calendar and participant progress UI
- Private proof upload flow (Supabase Storage)
- Prize-draw explanation for a €300 Nike voucher
- Leaderboard preview (currently demo data)
- Initial Supabase SQL schema and row-level security policies

## Run locally
1. Install Node.js 20+.
2. Copy `.env.example` to `.env.local`.
3. Create a Supabase project and fill in the URL and anon key.
4. In Supabase Authentication settings, enable email confirmations and set the site URL / redirect URLs to your local and production URLs.
5. Run `supabase/schema.sql` in the Supabase SQL Editor.
6. Install and start:
   ```bash
   npm install
   npm run dev
   ```
7. Open http://localhost:3000.

## Publish directly on GitHub Pages (no custom domain)
This project is configured for a GitHub Pages project site using the repository name `christmas-run`.

1. Create a GitHub repository named `christmas-run` and upload the contents of this folder to the `main` branch.
2. In repository Settings → Secrets and variables → Actions, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. In repository Settings → Pages, set the build/deployment source to **GitHub Actions**.
4. Push a commit to `main`; the included workflow builds and deploys the static site.
5. The site address will be `https://YOUR-GITHUB-USERNAME.github.io/christmas-run/`.
6. In Supabase Authentication → URL Configuration, set the Site URL to that address and add it to the allowed Redirect URLs. Email confirmation redirects must match the deployed path.

If you choose a different repository name, update `repoName` in `next.config.mjs` to match it.

GitHub Pages only serves static files. Authentication and data operations in this app run in the browser through Supabase; no private service-role key should ever be added to GitHub Secrets or frontend environment variables.

## Important: before real launch
This is a starter project, not yet a production-ready competition platform.
- The leaderboard currently uses sample data; implement a safe server-side view/RPC for live data.
- Build an admin review area to approve/reject evidence. Only approved runs should count.
- Enforce challenge date, time zone, one-run-per-day and upload validation server-side (not only in the browser).
- The current upload UI limits accepted browser file types but needs robust server-side size/type validation.
- Configure Supabase Storage as private and review the storage RLS policies.
- Add proper Terms & Conditions, privacy notice, retention policy and consent text.
- Define official prize-draw terms and anti-abuse rules (duplicate accounts, eligibility, drawing method, notification of winner). Make clear that the promotion is independent of Nike and not sponsored or administered by Nike unless that is formally agreed.
- Test email confirmation, password reset, data access, and mobile layouts.
- Add an authenticated profile/dashboard route; current landing page is the visual and interaction starter.
- For the intended December 2026 event, confirm local timezone and decide whether late uploads are prohibited or can be submitted for review.

## Challenge logic
A valid run on December day N must cover N kilometres and take place on that date in the event timezone. A confirmed run counts as one raffle entry. 24 confirmed days = 24 entries. All authenticated participants with at least one confirmed day can enter, as described in the promotion rules. The final implementation should calculate raffle entries from approved runs on the server, never from client-submitted values.

## Brand assets
The generated 300 € voucher artwork is included at `public/nike-gutschein-300.png` and displayed in the prize section.

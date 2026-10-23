# Flod — Deployment and demo-day readiness (Phase 9)

## Which host, and why

**Recommended for Flod: Netlify Drop**: you drag the built `dist` folder onto a web page. No GitHub repository is needed (Flod hasn't been pushed), and no build runs on Netlify's side.

Checked on 2026-10-23 in Netlify's docs (https://docs.netlify.com/site-deploys/create-deploys/, last updated 21 Oct 2026, and the Netlify Drop quickstart): Drop needs no Git repository; a site dropped **without signing in** is protected by a temporary password until you claim it (and Netlify's CLI docs say anonymous CLI deploys are removed after one hour unless claimed). **So sign in first.** Dashboard labels change over time; follow the current page if it differs from the steps below.

**Alternative (better for the event project, if it lives on GitHub):** Vercel. Push to GitHub, import the repository at vercel.com/new (it detects Vite), and set the two `VITE_` variables in the project's Environment Variables settings before the first build (https://vercel.com/docs/frameworks/frontend/vite, updated 26 Aug 2026).

## How the settings get into the deployed app

Vite copies every `VITE_…` variable **into the JavaScript at build time** (`npm run build`). With Netlify Drop you build on your own laptop, so the two values from your `.env.local` (project URL and publishable key, both meant to be public) end up inside `dist/assets/*.js`. Nothing else is needed on Netlify. With Vercel the build runs on their side, so you enter the same two values in their dashboard instead. **Never** paste the `secret` / `service_role` key anywhere, and never paste keys into chat.

## Steps (Netlify Drop)

1. **Check the build locally**, in the Flod folder:
   ```bash
   npm run build
   ```
   It must end with "built in …". Then look inside `dist`: only `index.html`, `favicon.svg` and an `assets` folder. Optionally run `npm run preview` and open http://localhost:4173 to see the built version.
2. **Sign in** at https://app.netlify.com (create a free account yourself if you don't have one).
3. Open Netlify Drop (https://app.netlify.com/drop, or **Add new … → Deploy manually** in the dashboard).
4. **Drag the `dist` folder**, not the whole Flod folder. ⚠️ The Flod folder contains `.env.local`, `node_modules` and your source code. Only `dist` should be uploaded.
5. Wait for "Published". Netlify shows a URL like `https://<random-name>.netlify.app`. You can rename it in the site's settings.
6. **Supabase → Authentication → URL Configuration → Site URL:** set it to that URL. (Supabase's docs say Site URL is the default redirect for email confirmation and password-reset links. Flod uses email + password with confirmation off, so it isn't strictly needed, but it keeps links correct if you ever turn confirmation on.)
7. **Updating later:** change code → `npm run build` → in the Netlify site's **Deploys** page, drag the new `dist` folder again.

## Check the live site (manual, on a real phone using mobile data)

Use mobile data, **not** the laptop's Wi-Fi, to prove it works from outside your network.

1. On the phone, turn Wi-Fi off and open the Netlify URL. The **Sign in** screen appears; the tab title says "Flod".
2. Sign in as `elder1@example.com` (Asha). Expect **Home** with her past requests.
3. On the laptop (any network), open the same URL in a private window and sign in as `family1@example.com` (Ravi).
4. Phone: send ₹2,500 to `test.shop@demo-upi`. Laptop: it appears by itself. Reject it. Phone: the **Pause** warning appears by itself (and beeps if the phone isn't muted).
5. Repeat with **Confirm request** → phone shows "Ravi (demo) confirmed these details" and still says it doesn't prove the recipient is safe.
6. Let one request time out (60 s) with the phone on **Home** → Pause alert on Home.
7. **Supabase unavailable:** turn on airplane mode on the phone with the app open → within a few seconds of the app's next check (switch away and back to the browser to force one), the warning "Can't reach the server… Don't pay until you can see your family member's answer." appears. Nothing is shown as confirmed. Turn airplane mode off → **Try again** clears it.
8. In Supabase → SQL Editor, run `supabase/checks/deploy_checks.sql`: every row **PASS** (26 rows). Then run `supabase/checks/rls_checks.sql` once more: 36 × PASS.

Only after these pass, write the live URL into `README.md` and `docs/DEMO_SCRIPT.md`.

## Backup plan (if the venue network fails)

In order of preference:

1. **Phone hotspot** for the laptop; the phone itself on mobile data. Test the hotspot the day before.
2. **The laptop's own dev server** (`npm run dev`) in two windows (normal + private). It still needs internet for Supabase, but not the venue Wi-Fi if the hotspot works.
3. **A screen recording of the full live demo**, made the day before on the deployed site (approval, rejection, timeout). If you show it, say clearly that it is a recording.
4. **Automated tests as a simulation:** `npm test` runs the whole flow against the in-memory fake Supabase (no network). Say clearly: *"this is a simulation of the backend, not the live database."* Show the test names, e.g. "the elder's screen shows a rejection by itself, without Refresh".
5. **Be honest:** if nothing works, say so, then explain the design with `docs/LEARNING_GUIDE.md` §12 (architecture and data-flow diagrams) and the security checks' PASS results.

## Final checklist (the day before and one hour before)

- [ ] Supabase project opened in the dashboard **the day before** (free projects pause when unused) and again one hour before.
- [ ] `deploy_checks.sql` 26 × PASS and `rls_checks.sql` 36 × PASS on the project being demoed.
- [ ] Live URL opens on a phone using mobile data.
- [ ] Demo accounts work: `elder1@example.com` (Asha) and `family1@example.com` (Ravi), paired. Passwords in a team password manager, never in the repo or slides.
- [ ] No stale pending requests (or create fresh demo accounts and pair them in person).
- [ ] Both devices charged; browser zoom readable from a distance; sound on.
- [ ] Hotspot tested; screen recording saved locally; `npm test` passes on the laptop.
- [ ] `docs/DEMO_SCRIPT.md` rehearsed at least twice (90 s and 3 min), timed.
- [ ] Everyone can answer the questions in `docs/LEARNING_GUIDE.md` §12 "Explain it to a judge".
- [ ] `docs/DISCLOSURE.md` ready to show. Devpost submission rules checked by a teammate in a browser (we could not read them).

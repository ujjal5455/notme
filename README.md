# Flod

**Pause before you pay.** AI voice cloning lets scammers sound like a family member and push an elder to send money urgently. Flod does not try to detect fake voices. Instead, the elder sends the exact request (amount and recipient) to a family member they linked in advance, who confirms or rejects it on their own device.

> **Hackathon prototype.** Uses made-up demo data only. It never sends real money and is not an emergency or payment-safety guarantee.

## Current status

Phase 6 of 9. **The core flow works end to end** on two devices: accounts and in-person pairing (Phase 4); the elder's request is saved in Supabase and appears in the linked family member's inbox (Phase 5); the family member **confirms or rejects**, and the elder's screen **updates by itself** through Supabase Realtime, with polling every 4 seconds as the fallback (Phase 6). Phase 7 adds a countdown corrected to the **database's clock**, a large **Pause** alert on the elder's home screen when a request is rejected or runs out of time, a **best-effort beep** (the visual warning never depends on it), focus handling for keyboard and screen-reader users, and failure tests. Requires `0004_realtime.sql` and `0005_server_time.sql` to be run on your project. Phase 8 reviewed everything against the brief, added tests (88 automated) and wrote [`docs/DEMO_SCRIPT.md`](docs/DEMO_SCRIPT.md); [`docs/LEARNING_GUIDE.md`](docs/LEARNING_GUIDE.md) now covers rebuilding Flod from an empty folder. Phase 9 (deployment readiness): [`docs/DEPLOY.md`](docs/DEPLOY.md) explains how to put it online (Netlify Drop recommended), how to test it from a phone on mobile data, a backup plan and a final checklist; [`docs/DISCLOSURE.md`](docs/DISCLOSURE.md) separates pre-event work, third-party software and AI assistance. **Not yet deployed**: no live URL has been checked, so none is listed here. See [`docs/PLAN.md`](docs/PLAN.md) for progress and [`docs/BUILD_LOG.md`](docs/BUILD_LOG.md) for what was done and tested.

## Run it locally

Requirements: Node.js 20+ and npm.

```bash
npm install
npm run dev
```

You need a Supabase project and a filled-in `.env.local` first (see **Database setup** below). Without them the page stays blank and the browser console says which setting is missing. Restart `npm run dev` after changing `.env.local`.

Open the URL Vite prints (usually http://localhost:5173).

### Manual test: two accounts, two browsers (Phase 4)

Use two separate browser sessions, for example a normal window and a private/incognito window, because each one remembers its own sign-in. Use made-up emails only.

1. **Window A:** *New here? Create a demo account* → `elder1@example.com` → choose **The elder**, name `Asha (demo)` → **Show a pairing code**. You should see an 8-character code, the "Only in person" warning and a 10-minute countdown.
2. **Window B:** create `family1@example.com` → choose **A family member**, name `Ravi (demo)`.
3. Window B: type `zzzz-zzzz` → **Link** → expect "That code is not valid…".
4. Window B: type the code from window A (lower case or with a dash is fine) → **Link** → expect the inbox "Requests to confirm … linked with Asha (demo)".
5. Window A: **My family member has entered the code** → expect "Hello, Asha (demo)" and Ravi's name.
6. **Third account:** sign out in window B, create `stranger@example.com` as a family member, type the same code again → expect "That code has already been used…". The stranger sees no inbox and no names.
7. Reload both windows → each is still signed in and goes straight to its own screen.
8. In the Supabase **Table Editor**, `family_links` should have exactly one row for this pair.

Leftover test accounts can be deleted in Supabase → **Authentication → Users** (their profile, link and request rows are deleted with them).

### Manual test: a request reaches the family member (Phase 5)

Use the linked pair from the Phase 4 test (window A = elder, window B = family member).

1. Window A: **Check a money request** → amount `2500`, recipient `test.shop@demo-upi`, note `Caller said it is urgent` → **Send to family to confirm**. The button says *Sending…*, then you see "₹2,500 … Waiting for Ravi (demo) to confirm".
2. Window B: **Check for new requests** (or switch away from the tab and back) → ₹2,500 appears under "Waiting for your answer". Open it: amount, recipient, note and Asha's name match exactly. *(Since Phase 6 the request appears by itself and Confirm/Reject buttons are shown.)*
3. Reload window A → **Home** still lists the ₹2,500 request.
4. Wait 60 seconds → both windows show the request as **Unconfirmed / expired** (worked out from the deadline the database set).
5. **Third account:** sign in as `stranger@example.com`. It is not linked, so the app stops at the pairing screen and never shows any request. That the *database* also refuses (not just the screen) is proven by `rls_checks.sql` → "visibility: stranger C sees 0 requests", which passed on your project.
6. Supabase **Table Editor → money_requests**: the row's `family_id` is Ravi's user id, though the browser never sent it. `status` is `pending`.
7. **Offline:** in window A, DevTools → Network → **Offline**, try to send a request → "Could not connect…" and the form keeps what you typed. Turn **Offline** off and send again.

### Manual test: confirm / reject and live updates (Phase 6)

First run `supabase/migrations/0004_realtime.sql` in the SQL Editor (Database setup, step 3). Put windows A (Asha) and B (Ravi) **side by side**. Don't press Refresh during this test.

1. Window A: send ₹2,500 to `test.shop@demo-upi` and stay on its "Waiting for Ravi" screen.
2. Window B: within a second or two, ₹2,500 appears under "Waiting for your answer" **by itself**.
3. Window B: open it → **Reject request** → button says *Sending…*, then "You rejected this request…".
4. Window A: **by itself**, the large **Pause** warning appears.
5. Repeat with a new request and **Confirm request** → window A shows "Ravi (demo) confirmed these details" and still says it does not prove the recipient is safe.
6. **Duplicate answer:** with live updates working, an answered request's buttons disappear everywhere within a second, so a second answer is hard to produce by hand. The database's refusal is proven by `rls_checks.sql` → "respond: a second answer is refused" and "an answer after the deadline is refused"; the screen's handling (message + correcting itself) by the automated test "a second answer from an out-of-date screen is refused".
7. **Late answer:** send a request and let 60 seconds pass without answering → both windows show **Unconfirmed**; Ravi gets no buttons.
8. **Polling fallback:** in Supabase → **Database → Publications** (labels may vary), remove `money_requests` from `supabase_realtime`, then reload both windows → a notice says "Live updates are not connected. Checking for updates every few seconds." Answers still arrive, within about 4 seconds. Run `0004_realtime.sql` again to put it back.
9. **Offline:** window A → DevTools → Network → **Offline**, then switch to another browser tab and back (this makes the app check again) → a warning says "Can't reach the server… Don't pay until you can see your family member's answer." Set **No throttling** again and press **Try again** → the warning clears. *(Chrome's Offline mode may leave an already-open live connection running, so without the tab switch the warning can take much longer to appear.)*
10. **Third account:** a stranger account is never shown the request (it stays on pairing). `rls_checks.sql` → "respond: stranger C cannot approve" proves the database refuses it too.

### Manual test: timeout, warnings, sound and accessibility (Phase 7)

First run `supabase/migrations/0005_server_time.sql` in the SQL Editor. Windows A (Asha) and B (Ravi) side by side, sound on (volume low).

1. **Countdown:** A sends ₹2,500. Both detail screens show a countdown ("Time left for Ravi (demo) to answer: 0:59" / "Time left to answer: 0:59") that ticks down.
2. **Timeout + beep:** A goes back to **Home** and waits. *(Fixed in Phase 8: before that fix, a request you had opened, as happens right after sending, did not raise the Home alert when it later timed out. Re-run this step if you tested before Phase 8.)* At 0:00 a large **Pause** alert appears at the top of Home ("Your ₹2,500 request has not been confirmed. Do not pay…") and you should hear **two short beeps**. In B the buttons are replaced by "This request expired before it was answered…".
3. **Rejection + beep on any screen:** send another request; B rejects it while A is on Home → Pause alert + beeps on A. Tap **Open the ₹2,500 request** → full warning; **Back** → the Home alert is gone.
4. **Sound blocked:** mute the computer (or the tab) and repeat step 3 → the visual warning is exactly the same; nothing important is lost.
5. **Old warnings aren't repeated:** reload A → no new alert or beep for those old requests; their cards still say "Rejected by family" / "Unconfirmed — no reply".
6. **Wrong phone clock (optional):** set your computer's clock 2 minutes slow (Windows: Settings → Time & language → turn off "Set time automatically", then change it), reload A and send a request → the countdown still starts at about **1:00**, not 3:00. Turn automatic time back on afterwards.
7. **Keyboard only (A or B):** reload, put the mouse away and use **Tab / Shift+Tab / Enter / Space**. Every button and field gets a visible orange focus ring; after Ravi presses Reject with the keyboard, focus moves to "You rejected this request…" (a screen reader reads it).
8. **Zoom:** browser zoom 200% (Ctrl + +) at a phone-sized window → text wraps, nothing is cut off, no sideways scrolling.
9. **Screen reader (optional):** Windows Narrator (Ctrl + Win + Enter) reads the Pause warning as soon as it appears, and reads status badges as words ("Rejected by family"), not just colours.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the development server with live reload |
| `npm run lint` | Check code for common mistakes (oxlint) |
| `npm run typecheck` | Check TypeScript types (`tsc -b`) |
| `npm test` | Run automated tests once (Vitest) |
| `npm run test:watch` | Re-run tests whenever a file changes |
| `npm run build` | Typecheck, then build production files into `dist/` |

### What the tests cover

- **Automated (no Supabase needed):** `npm test` runs 88 tests in 14 files: validation and status rules, components, the whole app flow (sign-in, pairing, create, deliver, answer, live/polling/offline, wrong clock, warnings) against an in-memory fake Supabase (`src/test/fakeSupabase.ts`), and what the browser sends to the database (`src/lib/api/api.test.ts`).
- **Database security (needs your Supabase project):** `supabase/checks/rls_checks.sql` in the SQL Editor: 36 checks.
- **Manual (two real browsers):** the "Manual test" checklists above for Phases 4–7.

The fake proves the React code reacts correctly to each answer; only `rls_checks.sql` and the manual tests prove the real backend gives those answers.

## Database setup (Supabase)

The database lives in a free [Supabase](https://supabase.com) project. Everything it needs is in this repo:

| File | What it does |
|---|---|
| `supabase/migrations/0001_tables.sql` | Tables and constraints (profiles, family_links, pairing_codes, money_requests) |
| `supabase/migrations/0002_rls.sql` | Turns on Row Level Security; signed-in users may only **read** their own rows |
| `supabase/migrations/0003_functions.sql` | The five functions that are the **only** way to write data |
| `supabase/migrations/0004_realtime.sql` | Turns on live updates (Supabase Realtime) for `money_requests` |
| `supabase/migrations/0005_server_time.sql` | `server_now()`: lets the app correct countdowns for a phone with a wrong clock |
| `supabase/checks/rls_checks.sql` | 36 automatic security checks; prints PASS/FAIL per check |
| `supabase/checks/deploy_checks.sql` | Read-only settings check before a demo (RLS on, no anon access, read-only tables, function rights, Realtime): 26 × PASS |

### Step by step

Dashboard labels may differ slightly between Supabase versions.

1. **Create the project.** Sign in at supabase.com → **New project**. Pick a region near your users (for India, Mumbai). Save the database password in a password manager; you will not need it for this app, and it must never go into this repo.
2. **Email sign-in for the demo.** **Authentication → Sign In / Providers → Email**: keep Email enabled and turn **off "Confirm email"**. *Why:* Supabase's built-in email sender allows only a few emails per hour, which breaks a live demo. *Trade-off:* anyone can sign up with any address. Acceptable for synthetic demo accounts only; documented as a limitation.
3. **Apply the migrations, in order.** **SQL Editor → New query** → paste the whole of `0001_tables.sql` → **Run** → expect "Success. No rows returned". Repeat with `0002_rls.sql`, then `0003_functions.sql`, `0004_realtime.sql` and `0005_server_time.sql`. The editor may warn about "destructive operations" (`revoke`, `drop policy if exists`); that is expected. Each file is safe to run again if something went wrong halfway.
4. **Run the security checks.** New query → paste `supabase/checks/rls_checks.sql` → **Run**. Every row should say **PASS** (36 rows). The script creates four throwaway `@example.test` users and deletes them again. If any row says FAIL, stop and investigate before continuing.
5. **Double-check in the dashboard.** **Table Editor**: each of the four tables should show RLS as enabled. **Advisors → Security Advisor**: there should be no errors about these tables.
6. **Copy the two public settings** (needed from Phase 4). **Project Settings → API Keys** (and **Data API** for the URL): copy the **Project URL** and the **publishable key** (or the legacy **anon public** key). Then:
   ```bash
   cp .env.example .env.local
   ```
   and paste the two values into `.env.local`. Never copy the **secret** / **service_role** key: it bypasses all security and would be visible to anyone if put in browser code.

### Optional: run the same database locally (offline backup)

With Docker Desktop running, `npx supabase init` then `npx supabase start` starts a local Supabase. It applies `supabase/migrations/` automatically, and you can paste `rls_checks.sql` into the local Studio's SQL editor. Not needed for normal development.

## Prototype limitations (database)

- Pairing codes have no attempt limit (rate limiting); an 8-character code from 32 characters that expires in 10 minutes makes guessing impractical but not impossible.
- There is no "unlink" or "change family member" flow; changing a link needs a database admin.
- No limit on how many requests an elder can send.
- Email confirmation is off for the demo, so email addresses are not verified.
- A compromised family-member account could approve requests. Out of scope for this prototype.
- "Expired" is worked out from `expires_at`; the database does not run a background job to mark requests expired (it simply refuses late answers).
- This is not production-ready: no monitoring, backups policy, audit log, or abuse protection.
- Anyone who can open the app can create an account (sign-up is open and emails are not verified). Fine for synthetic demo accounts only.
- A family member may be linked to several elders in the database, but the screens show only the first linked elder's name.
- The elder's pairing screen does not notice the new link by itself; the elder taps **My family member has entered the code**.
- Live updates depend on Supabase Realtime. If it isn't connected, the app checks every 4 seconds instead and says so; if the server can't be reached at all, it shows a "Can't reach the server… don't pay" warning. A screen can still be up to a few seconds behind.
- Countdowns and the "Unconfirmed" display are corrected by the database's clock (`server_now()`, measured once when the app opens, accurate to about half the network round trip). If `0005_server_time.sql` wasn't run or the check fails, the phone's own clock is used. Either way **the database decides** whether an answer is late.
- The beep is best effort: browsers block sound until the person has tapped the page, phones may be muted, and people may not hear it. The visual warning is always shown.
- Warnings are announced (alert + beep) only for requests that turn into a warning **while the app is open**. A request that expired while the app was closed shows its "Unconfirmed" badge on reopening, without a new alert.
- Nothing runs while the app is closed: no push notifications or SMS. The elder must have the app open to see the answer.

## Environment variables

`.env.example` lists the two public placeholders; copy it to `.env.local` (ignored by Git) and fill them in. The app reads them since Phase 4. Never put a Supabase secret / service-role key in this project.

## Learning

[`docs/LEARNING_GUIDE.md`](docs/LEARNING_GUIDE.md) teaches how to rebuild this app from an empty folder: a reading path in topic order, every major file explained, diagrams, common errors, a rebuild checklist and judge Q&A. [`docs/DEMO_SCRIPT.md`](docs/DEMO_SCRIPT.md) has 90-second and 3-minute demo walkthroughs.

## This is a prototype

Flod is a hackathon prototype built with made-up data. It never moves real money, does not listen to or block phone calls, and is **not** an emergency service or a payment-safety guarantee. A confirmation means the linked family member agreed with the request's details, nothing more.

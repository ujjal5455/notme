# Flod

**Pause before you pay.** AI voice cloning lets scammers sound like a family member and push an elder to send money urgently. Flod does not try to detect fake voices. Instead, the elder sends the exact request (amount and recipient) to a family member they linked in advance, who confirms or rejects it on their own device.

> **Hackathon prototype.** Uses made-up demo data only. It never sends real money and is not an emergency or payment-safety guarantee.

## Current status

Phase 4 of 9. **Real accounts and pairing** use Supabase: sign up / sign in, choose a role (elder or family member) once, and link an elder with one family member through a one-time code shown in person. **Money requests are still local mock data** (Phase 2): they live only in the browser tab that created them, are **not sent to the other device yet**, and are lost on reload. Phase 5 moves them into the database. See [`docs/PLAN.md`](docs/PLAN.md) for progress and [`docs/BUILD_LOG.md`](docs/BUILD_LOG.md) for what was done and tested.

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

Leftover test accounts can be deleted in Supabase → **Authentication → Users** (their profile and link rows are deleted with them).

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the development server with live reload |
| `npm run lint` | Check code for common mistakes (oxlint) |
| `npm run typecheck` | Check TypeScript types (`tsc -b`) |
| `npm test` | Run automated tests once (Vitest) |
| `npm run test:watch` | Re-run tests whenever a file changes |
| `npm run build` | Typecheck, then build production files into `dist/` |

## Database setup (Supabase)

The database lives in a free [Supabase](https://supabase.com) project. Everything it needs is in this repo:

| File | What it does |
|---|---|
| `supabase/migrations/0001_tables.sql` | Tables and constraints (profiles, family_links, pairing_codes, money_requests) |
| `supabase/migrations/0002_rls.sql` | Turns on Row Level Security; signed-in users may only **read** their own rows |
| `supabase/migrations/0003_functions.sql` | The five functions that are the **only** way to write data |
| `supabase/checks/rls_checks.sql` | 36 automatic security checks; prints PASS/FAIL per check |

### Step by step

Dashboard labels may differ slightly between Supabase versions.

1. **Create the project.** Sign in at supabase.com → **New project**. Pick a region near your users (for India, Mumbai). Save the database password in a password manager; you will not need it for this app, and it must never go into this repo.
2. **Email sign-in for the demo.** **Authentication → Sign In / Providers → Email**: keep Email enabled and turn **off "Confirm email"**. *Why:* Supabase's built-in email sender allows only a few emails per hour, which breaks a live demo. *Trade-off:* anyone can sign up with any address. Acceptable for synthetic demo accounts only; documented as a limitation.
3. **Apply the migrations, in order.** **SQL Editor → New query** → paste the whole of `0001_tables.sql` → **Run** → expect "Success. No rows returned". Repeat with `0002_rls.sql`, then `0003_functions.sql`. The editor may warn about "destructive operations" (`revoke`, `drop policy if exists`); that is expected. Each file is safe to run again if something went wrong halfway.
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

## Environment variables

`.env.example` lists the two public placeholders; copy it to `.env.local` (ignored by Git) and fill them in. The app reads them since Phase 4. Never put a Supabase secret / service-role key in this project.

## Learning

[`docs/LEARNING_GUIDE.md`](docs/LEARNING_GUIDE.md) teaches how to rebuild this app from an empty folder, one phase at a time.

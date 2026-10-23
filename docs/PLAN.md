# Flod — Implementation Plan

> Status: **approved** on 2026-10-21 (approval given by starting Phase 1).
> Renamed from **Notme** to **Flod** on 2026-10-21 (name only; scope unchanged).
> Source of truth for scope: the project brief. Phase prompts: `PROMPTS.md` (renamed from `NOTME_PROMPTS.md` on 2026-10-21).

## Progress

- [x] **Phase 0** — Plan, verify rules, learning roadmap
- [x] **Phase 1** — Scaffold and run the app (mock screens)
- [x] **Phase 2** — User flows with local mock data
- [x] **Phase 3** — Supabase schema, RLS, database functions
- [x] **Phase 4** — Authentication and trusted-family pairing *(code + automated tests 2026-10-23; manual two-browser test on real Supabase passed, reported by the user 2026-10-23)*
- [x] **Phase 5** — Create requests and deliver to the linked family member *(code + automated tests 2026-10-23; manual two-browser test passed, reported by the user 2026-10-23)*
- [x] **Phase 6** — Approve/reject and real-time status updates *(code + automated tests 2026-10-23; 0004 applied and manual two-browser test passed, reported by the user 2026-10-23)*
- [x] **Phase 7** — Timeout, warnings, accessibility, failure handling *(code + automated tests 2026-10-23; 0005 applied and manual checklist passed, reported by the user 2026-10-23)*
- [ ] **Phase 8** — Tests, complete learning guide, demo script
- [ ] **Phase 9** — Deployment and hackathon readiness

---

## 1. Architecture

```
 Elder's browser                       Family member's browser
 React + TypeScript (static files)     same app, different account
           │  supabase-js  (publishable key + the user's login token)
           ▼                                   ▼
 ┌──────────────────────────────────────────────────────────┐
 │ Supabase                                                 │
 │  Auth      – who is signed in                            │
 │  Postgres  – tables + Row Level Security (who may READ)  │
 │            – small SQL functions (the ONLY way to WRITE) │
 │  Realtime  – pushes row changes to open screens          │
 └──────────────────────────────────────────────────────────┘
```

**Golden rule: all reads go through RLS; all writes go through narrowly scoped SQL functions.** Tables get SELECT policies only.

| Technology | Purpose |
|---|---|
| Vite | Dev server + bundler that turns our source into static files |
| React | Builds the UI from small components that re-render when data changes |
| TypeScript | Adds types so mistakes are caught before running |
| oxlint | Fast linter (ships with the current Vite template; replaces ESLint from the draft plan — one package instead of several) |
| Vitest + Testing Library + jsdom | Automated unit/component tests |
| Supabase Auth / Postgres / RLS / Realtime | Accounts, data, access control, live updates (from Phase 3) |
| Static host (Vercel / Netlify / Cloudflare Pages — chosen in Phase 9) | Public URL |

**Deliberately avoided:** custom backend server, Redux/state libraries, UI component libraries, router (screen chosen by role + a `view` state; revisit only if needed), notifications/SMS, payment APIs, AI APIs, local Docker Supabase for daily work (kept only as offline backup).

## 2. Phases and files

| Phase | Creates (C) / Modifies (M) |
|---|---|
| 0 | C `docs/PLAN.md`, `docs/BUILD_LOG.md`, `docs/LEARNING_GUIDE.md` |
| 1 | C `package.json`, `vite.config.ts`, `tsconfig*.json`, `.oxlintrc.json`, `index.html`, `.gitignore`, `.env.example`, `README.md`, `public/favicon.svg`, `src/main.tsx`, `src/App.tsx`, `src/styles/global.css`, `src/types/domain.ts`, `src/mock/mockData.ts`, `src/pages/{ElderHome,CreateRequest,FamilyInbox,RequestDetail,AboutSafety}.tsx`, `src/components/{Layout,StatusBadge,RequestCard}.tsx`, `src/test/setup.ts`, tests; `git init` |
| 2 | C `src/lib/validation.ts`, `src/lib/requestStatus.ts`, `src/mock/mockStore.ts`, `src/components/{RequestForm,StatusBanner,WarningPanel,FamilyResponse}.tsx`, **`src/config.ts`, `src/hooks/useNow.ts`** (pulled forward from Phase 7: the expired state needs a timeout value and a ticking clock) + tests. M pages, `App.tsx`, `Layout.tsx`, CSS, docs |
| 3 | C `supabase/migrations/0001_tables.sql`, `0002_rls.sql`, `0003_functions.sql`, `supabase/checks/rls_checks.sql` (not `supabase/tests/`, which the Supabase CLI reserves for pgTAP). M `.env.example`, `README.md`, docs |
| 4 | C `src/lib/supabaseClient.ts`, `src/auth/AuthProvider.tsx`, `src/pages/{SignIn,SignUp,ChooseRole,PairElder,PairFamily}.tsx`, `src/lib/api/{profile,pairing}.ts`; dep `@supabase/supabase-js`. M `App.tsx`, docs. **As built:** one `SignIn.tsx` with two modes (no `SignUp.tsx`); added `src/lib/api/errors.ts`, `src/auth/authContext.ts`, `src/SignedInApp.tsx`, `src/hooks/useCountdown.ts` (pulled forward from Phase 7), `src/test/fakeSupabase.ts`, `src/SignedInApp.test.tsx`; M `main.tsx`, `Layout.tsx`, `FamilyInbox.tsx`, `StatusBanner.tsx`, CSS, `README.md` |
| 5 | C `src/lib/api/requests.ts`. M CreateRequest, ElderHome, FamilyInbox, tests, docs. **As built:** also C `src/hooks/useMyRequests.ts`; M `SignedInApp.tsx`, `RequestForm.tsx`, `FamilyResponse.tsx`, `RequestDetail.tsx`, `StatusBanner.tsx`, `Layout.tsx`, `src/test/fakeSupabase.ts`, `README.md` |
| 6 | C `src/hooks/useRequestUpdates.ts`, `supabase/migrations/0004_realtime.sql`. M requests API, RequestDetail, ElderHome, docs. **As built:** also C `src/components/ConnectionNotice.tsx`, `src/lib/requestList.ts` (+ test), `src/components/FamilyResponse.test.tsx`, `src/hooks/useRequestUpdates.test.tsx`; M `FamilyResponse.tsx`, `SignedInApp.tsx`, `useMyRequests.ts`, `config.ts` (`POLL_INTERVAL_MS`), `StatusBanner.tsx`, `Layout.tsx`, fake Supabase, `README.md` |
| 7 | C `src/hooks/useCountdown.ts`, `src/lib/alertSound.ts`. M `src/config.ts`, WarningPanel, CSS, docs. **As built:** `useCountdown.ts` already existed (Phase 4); C `supabase/migrations/0005_server_time.sql`, `src/lib/api/serverTime.ts`, `src/hooks/useServerOffset.ts`, `src/hooks/useNewWarnings.ts`, `src/components/TimeLeft.tsx`, `src/lib/alertSound.ts` (+ test); M `SignedInApp.tsx`, `ElderHome.tsx`, `RequestDetail.tsx`, `CreateRequest.tsx`, `FamilyResponse.tsx`, `PairFamily.tsx`, CSS, fake Supabase, `README.md`. `WarningPanel` unchanged (the beep lives in `useNewWarnings`) |
| 8 | C `docs/DEMO_SCRIPT.md`, more tests. M `README.md`, `docs/LEARNING_GUIDE.md` |
| 9 | C `docs/DISCLOSURE.md`. M README, PLAN, BUILD_LOG, DEMO_SCRIPT |
| parallel | C `docs/USER_FLOW_FEEDBACK.md` (teammate) |

## 3. Data model (draft — implemented in Phase 3)

```
profiles        id uuid PK→auth.users | role 'elder'|'family' (set once) | display_name 1–40 | created_at
pairing_codes   code text PK (8 chars, no confusable chars) | elder_id → profiles | expires_at (now()+10 min) | used_at | used_by
family_links    id PK | elder_id UNIQUE → profiles | family_id → profiles | created_at | CHECK elder_id <> family_id
money_requests  id PK | elder_id | family_id (copied server-side from family_links) | amount_inr int CHECK 1..100000
                | recipient text 3–100 | note ≤200 null | status 'pending'|'approved'|'rejected'
                | created_at | expires_at | responded_at
```

- **RLS (read):** own profile + linked person's profile; pairing codes only to their creator; links only to their two members; requests only to their `elder_id` and `family_id`.
- **Four UI states:** `pending`, `approved`, `rejected`, `expired`. `expired` is **derived** (`pending` and now > `expires_at`) and enforced by the respond function refusing late answers. Phase 7 decides whether to also store it.
- **As built (Phase 3):** matches this draft. Additions: `pairing_codes.used_by` cascades on delete; `money_requests` has `responded_matches_status`, `not_self` and `expiry_after_creation` checks; `pgcrypto` used for random codes.

### Pairing flow (in person, before an emergency)
1. Sign up (email + password) → `create_my_profile(role, name)` (once; role immutable).
2. Elder: `create_pairing_code()` → shows large code + warning "only show in person, never read it out on a call".
3. Family: `redeem_pairing_code(code)` → one transaction checks caller is family, code valid/unused/unexpired, elder not already linked → inserts `family_links`, marks code used.
4. Both screens show who they are linked to.

## 4. Request lifecycle

1. **Create (elder):** client validation → `create_money_request(amount, recipient, note, timeout_seconds)`; server re-validates, looks up `family_id`, clamps timeout to 15–600 s, sets `expires_at` from **database time**, inserts `pending`.
2. **Deliver (family):** `select` on `money_requests` — RLS returns only rows for this family member; Realtime + refetch on focus.
3. **Respond (family):** `respond_to_request(id, decision)` = one conditional `UPDATE … WHERE id = $1 AND family_id = auth.uid() AND status = 'pending' AND expires_at > now()`; zero rows → clear error. Blocks duplicates, late answers, wrong users, reverting to pending.
4. **Back to elder:** Realtime subscription on own request; polling every ~4 s if the channel is not subscribed; failed polls show a connection message.
5. **Timeout:** client countdown from `expires_at` with server-clock offset; at zero → "Unconfirmed" warning, next step, best-effort Web Audio beep (unlocked by the Send tap). DB refuses later answers.

**Wording:** approved = "Your linked family member confirmed this request." (never "safe"). Rejected/expired = "Pause. This request has not been confirmed. Contact your family member using a number you already trust."

## 5. Risks and fallbacks

| Risk | Mitigation |
|---|---|
| Service-role key leak | Only publishable/anon key in browser; `.env*` ignored except `.env.example`; bundle scan in Phase 8 |
| Missing RLS | RLS on all tables; `rls_checks.sql` impersonates a third user |
| `security definer` misuse | `auth.uid()` checks, `set search_path = ''`, revoke from `anon`/`public` |
| Protected column edits | No INSERT/UPDATE policies; functions touch only `status`, `responded_at` |
| Duplicate / late responses | Conditional update |
| Pairing social engineering | In-person warning, single-use 10-min code, one link per elder, linked name on every request — limitation documented |
| Code brute force | ~31⁸ space + 10-min life; **no rate limit** (limitation) |
| Compromised family account | Out of scope — limitation |
| Wrong phone clock | DB time enforces; client only displays |
| XSS via note | React escaping; never `dangerouslySetInnerHTML` |
| Sound blocked | Visual warning always; sound is extra |

**External dependencies:** Supabase free tier (email rate limits → disable "Confirm email" for demo; inactive projects pause → open it the day before; fallback: local Docker Supabase). Realtime → polling fallback. Venue network → phone hotspot / local backup. Hosting → any static host or local dev server.

**Unknowns:** Devpost submission rules (403 when fetched), exact build-window times, teammates' accounts, hosting choice.

## 6. Hackyard Build 2026 — verified rules (checked 2026-10-21)

Sources (pages say "Last updated: 22 September 2026"):
- https://hackyard.org/build2026/rules
- https://hackyard.org/build2026/guide
- https://hackyard.org/build2026/faq
- https://hackyard.org/build2026

**Verified:**
- 24-hour in-person hackathon, IIT Guwahati, **24–25 October 2026**. No start/end time or timezone published on these pages.
- Pre-existing libraries, tools, designs and project foundations are **allowed if disclosed**; teams must separate pre-event work from work done in the official window; reused foundations must be meaningfully transformed onsite; **undisclosed pre-built work** is a disqualification ground. Judging focuses on onsite work.
- AI, open source, APIs allowed "when their terms permit the use", with important dependencies disclosed. **No coding-assistant-specific rule or disclosure format** is stated.
- Teams: solo or 2–4. Judging: Build 40 %, Problem 20 %, Ingenuity 20 %, Potential 20 %; "Judge the build, not the pitch."
- Use synthetic, public, or authorised data; do not expose secrets.
- Applying is free; FAQ says package pricing is emailed to selected builders. No page mentions bank details.

**Not verified:** https://hackyardbuild2026.devpost.com/ returned HTTP 403 — submission requirements (repo, video, deadline, screenshots) are **unknown** until a teammate checks it in a browser. Prizes/conduct pages not read.

**Implication:** all work before 24 Oct is logged as `[pre-event]` in `docs/BUILD_LOG.md`; tag the Git commit at the official start.

## 7. Assumptions (accepted with the plan)

1. Email + password auth; email confirmation disabled for demo; synthetic test emails (`elder1@example.com`).
2. One trusted relative per elder; elder generates code, relative redeems.
3. Whole rupees ₹1–₹1,00,000 (demo cap); demo timeout default 60 s, single config value.
4. `expired` derived from `expires_at` + enforced by respond function.
5. Realtime first, polling fallback.
6. Prompts file renamed to `PROMPTS.md` (matches the project brief) when the project was renamed to Flod.

## 8. Phase acceptance checklists

### Phase 1
- [x] `npm install` and `npm run dev` work
- [x] App renders at 375 px and desktop width
- [x] `npm run lint`, `npm run typecheck`, `npm test` pass
- [x] Types `UserRole`, `RequestStatus`, `MoneyRequest` exist
- [x] `.env*` ignored by Git (except `.env.example`)
- [x] Git initialised; initial commit made

### Phase 2
- [x] Create request → appears in mock inbox → approve/reject → elder sees status
- [x] Invalid/empty amounts rejected with helpful text
- [x] Waiting / approved / rejected / expired / empty / error states
- [x] Tests for validation and status display; mock limitation visible (header banner + README)

### Phase 3
- [x] Migrations in `supabase/migrations/` are reviewable and repeatable (applied twice in a row without errors on PGlite / PostgreSQL 18)
- [x] RLS enabled on every table; least-privilege SELECT policies only
- [x] Writes only via narrowly scoped `security definer` functions (same rules as `src/mock/mockStore.ts`)
- [x] `supabase/checks/rls_checks.sql`: 36 checks incl. a third unrelated account and a second elder; 36/36 PASS on PGlite with a Supabase stand-in
- [x] No secret in frontend code, Git history or `.env.example`
- [x] Remote DB state reported honestly: **not yet applied to a real Supabase project** (user does README steps 1–6)
- [x] User applies migrations on their Supabase project and sees 36 × PASS (manual, reported by the user on 2026-10-23)

### Phase 4
- [x] Sign up / sign in with Supabase Auth (email + password); general sign-in error; network error shown
- [x] Role chosen once and stored by `create_my_profile` (not trusted from client state); name 1–40 chars
- [x] Elder gets a single-use 10-minute code from the database; in-person warning; countdown
- [x] Family member redeems the code; invalid / used / expired / network messages shown
- [x] Relationship stored in `family_links`, read through RLS; both sides show who they are linked to
- [x] Automated: 7 gate tests against an in-memory fake; lint, typecheck, 52/52 tests, build pass
- [x] Manual: two accounts in two browsers linked on the real Supabase project (README checklist) — user, 2026-10-23
- [x] Manual: an unrelated third account cannot link with a used code or see the pair — user, 2026-10-23
- Demo shortcut: none added.

### Phase 5
- [x] Request creation goes through `create_money_request` (client + database validation; receiver, status and times set by the database)
- [x] Family inbox lists only requests RLS returns for that account (no client-side filtering)
- [x] Loading, success, empty and failure UI; a failed send never shows as success; failed refresh keeps the old list
- [x] Requests reappear after reload; new ones appear on **Check for new requests** / returning to the tab
- [x] Automated: lint, typecheck, 54/54 tests, build pass
- [x] Manual: create in one browser, see it in the linked family member's browser on the real project (README checklist) — user, 2026-10-23
- Confirm/Reject deliberately not connected yet (Phase 6).

### Phase 6
- [x] Family member sees amount, recipient, note, creation time and expiry; separate Confirm / Reject
- [x] Answers go through `respond_to_request` only; duplicates, late answers and wrong users refused by the database (rls_checks 36/36 on the hosted project); UI shows the saved result, not a guess
- [x] Realtime subscription with clean-up on unmount; reconnect handled; polling fallback every 4 s; failed checks shown as "Can't reach the server… don't pay", recovering by itself
- [x] Elder's status never implies the recipient is safe
- [x] Automated: lint, typecheck, 71/71 tests, build; `0004` re-runnable on PGlite
- [x] User runs `0004_realtime.sql` on the hosted project — user, 2026-10-23
- [x] Manual: an answer in one browser appears in the other without Refresh (README checklist) — user, 2026-10-23

### Phase 7
- [x] Demo timeout is one config value (60 s), labelled in the UI as a demo value
- [x] Expired = pending + deadline passed, shown as "Unconfirmed"; **enforced by the database** (`respond_to_request`), displayed by the client with server-time correction (`0005`)
- [x] Rejection/timeout: large high-contrast Pause warning on the request screen and on Home; best-effort beep; clear next step
- [x] Wording: no reply ≠ fraud; approval ≠ safe recipient
- [x] Failure tests: refresh, slow network, disconnected, closed family browser (= expiry), late response, duplicate click, sound blocked, wrong clock
- [x] Accessibility: labels, focus ring + focus management, ≥ 48 px tap targets, contrast measured, status never colour-only
- [x] Automated: lint, typecheck, 80/80 tests, build; `0005` re-runnable and anon-refused on PGlite
- [x] User runs `0005_server_time.sql` on the hosted project — user, 2026-10-23
- [x] Manual checklist (beep heard, keyboard only, zoom 200%, screen reader, wrong clock) — user, 2026-10-23

### Phases 8–9
See "Done when" in `PROMPTS.md`; checklists are added here when each phase starts.

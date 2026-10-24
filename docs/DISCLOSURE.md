# Flod — Disclosure list

Prepared 2026-10-23 (Phase 9). This lists what existed before the event, what third-party software and services Flod depends on, and how AI was used, so it can be shown to organisers or judges as needed.

## What the event rules say (verified, and not invented here)

Read on 2026-10-23 from https://hackyard.org/build2026/rules, https://hackyard.org/build2026/guide, https://hackyard.org/build2026/faq and https://hackyard.org/build2026 (each page says "Last updated: 22 September 2026"; unchanged since our first check on 2026-10-21):

- Pre-existing libraries, tools, designs, datasets and project foundations may be used **when disclosed**. Teams must clearly identify what existed before the event and what was built during the official window. A reused foundation must be transformed through meaningful onsite work. Undisclosed pre-built work can lead to disqualification.
- AI, open source and APIs are allowed when their terms permit the use; important dependencies must be disclosed.
- Data must be public, synthetic or authorised.
- **Not stated** on those pages: any specific disclosure format, any coding-assistant-specific rule, or the submission requirements. The Devpost page (https://hackyardbuild2026.devpost.com/) returned HTTP 403 to our tool, so its contents are **unknown**. A teammate should check it in a browser.

This document therefore does **not** claim to follow a required format; it is simply a complete, honest list.

## 1. Pre-event vs onsite work

**All of Flod is pre-event work.** It was built 21–23 October 2026, before the event (24–25 October 2026), as a **practice run**. Every commit and every `docs/BUILD_LOG.md` entry is labelled `[pre-event]`.

| Commit | Date | What |
|---|---|---|
| `9a7fee6` | 2026-10-21 | Phases 0–1: plan, docs, React + TypeScript scaffold with mock screens |
| `896e38c` | 2026-10-21 | Phases 2–3: mock request flow; database schema, RLS, functions; rename to Flod |
| `dce5b68` | 2026-10-23 | Phase 4: authentication and pairing |
| `dee1c0c` | 2026-10-23 | Phase 5: requests saved and delivered |
| `3194780` | 2026-10-23 | Phase 6: confirm/reject and live updates |
| `b0e3b9d` | 2026-10-23 | Phase 7: timeout, warnings, accessibility, failure handling |
| (later commits) | 2026-10-23 | Phases 8–9: tests, docs, demo script, deployment notes, this file |

**Plan for the event (as written on 2026-10-23):** the team intended to build a separate new project ("Notme") from scratch during the official window.

**What actually happened (updated onsite, 2026-10-24):** the team decided not to start from scratch. The whole Flod project, including its git history, was copied into the Notme folder, and Notme is being built **on top of the Flod code**. So everything in Notme up to the git tag **`pre-event-end`** (commit `f710e6f`), plus commit `2f3f631` (two pre-event docs committed late, labelled `(pre-event)`), is **pre-event work from Flod**. Every later commit is labelled `(onsite)`; `git log --oneline pre-event-end..HEAD` lists them. Planned onsite transformation: amount-only alerts (no payee), an Android app (Capacitor), push notifications (Firebase Cloud Messaging), a server-side alert function (Supabase Edge Function), and testing on Android phones. This file is updated as that work lands.

## 2. Third-party software

Versions as installed (`node_modules/*/package.json`). All are open source under permissive licences.

| Package | Version | Licence | Used for |
|---|---|---|---|
| `react`, `react-dom` | 19.3.1 | MIT | UI |
| `@supabase/supabase-js` | 2.118.0 | MIT | Talking to Supabase (auth, database, realtime) |
| `vite` | 8.3.4 | MIT | Dev server and build |
| `@vitejs/plugin-react` | 6.1.2 | MIT | React support in Vite |
| `typescript` | 6.0.3 | Apache-2.0 | Type checking |
| `oxlint` | 1.89.0 | MIT | Linting |
| `vitest` | 5.0.5 | MIT | Test runner |
| `@testing-library/react` | 16.3.3 | MIT | Component tests |
| `@testing-library/jest-dom` | 7.0.1 | MIT | Test matchers |
| `jsdom` | 29.1.1 | MIT | Pretend browser for tests |
| `@types/node`, `@types/react`, `@types/react-dom` | 24.19.2 / 19.3.0 / 19.3.0 | MIT | Type definitions |

**Template:** the project configuration was copied from the official Vite `react-ts` template (create-vite 9.3.1, part of the Vite project, MIT) in Phase 1.

**Used only for checking, not part of the app:** PGlite 0.5.10 (`@electric-sql/pglite`, PostgreSQL compiled to WebAssembly), installed in a scratch folder outside the repo, to test the SQL migrations.

**Not used:** UI component libraries, icon packs, web fonts (the app uses the system font), images, analytics, payment APIs, AI APIs.

## 3. External services

| Service | Used for | Notes |
|---|---|---|
| Supabase (free tier) | Auth, Postgres database, Row Level Security, Realtime | The app only uses the public project URL and publishable key. Free projects pause when unused |
| Static host (Netlify recommended in `docs/DEPLOY.md`) | Serving the built files | Only if deployed; see `docs/DEPLOY.md` |
| Browser Web Audio API | Best-effort warning beep | Built into browsers |

## 4. AI assistance

- **Tool:** an AI coding assistant, used throughout Phases 0–9.
- **What it did:** wrote the plan, application code, SQL migrations and security checks, automated tests and all documentation in `docs/`, under the team's direction, one approved phase at a time.
- **What the team did:** chose the problem and approach, approved each phase, reviewed the work, set up the Supabase project, ran the database security checks (36/36 PASS) and every manual two-browser checklist on real devices, and reported the results that are recorded in the build log.
- **Where to see the details:** each `docs/BUILD_LOG.md` entry ends with an "AI assistance disclosure" line and separates checks run by the AI assistant from checks run by the team.

## 5. Data

Only made-up demo data: email addresses like `elder1@example.com`, names like "Asha (demo)", UPI IDs like `test.shop@demo-upi`. No real people, contacts, health or financial information. No real money is ever moved.

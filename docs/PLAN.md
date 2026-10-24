# Notme — Onsite Implementation Plan

> Status: **approved** on 2026-10-24 (the user asked to start Phase 1).
> Brief: the project brief. Phase prompts: `PROMPTS.md`. Flod's finished pre-event plan: [`docs/flod-reference/PLAN-flod.md`](flod-reference/PLAN-flod.md) (pre-event build-log entries that say "`docs/PLAN.md` §N" mean that file).

## Progress

- [x] **Phase 0** — Onsite plan, rules re-check, docs *(2026-10-24; approved)*
- [x] **Phase 1** — Rename to Notme; amount-only request (web) *(code + automated checks 2026-10-24, commit `11504dc`; new Supabase project, 37/37 RLS checks, 28/28 deploy checks and the manual two-browser test passed, reported by the user 2026-10-24)*
- [ ] **Phase 2** — Android app with Capacitor
- [ ] **Phase 3** — Push notifications on the family phone
- [ ] **Phase 4** — Server sends the alert (Edge Function)
- [ ] **Phase 5** — Safety and failure handling on real phones
- [ ] **Phase 6** — Demo readiness and disclosure
- [ ] *Stretch, only if approved after Phase 4 works:* more family contacts, "I'll call you", red-flag options, code-word reminder, PIN before Confirm

**Start now, in parallel (user):** download and install **Android Studio 2025.2.1 or newer**. It is several GB, and nothing in Phase 2 can start without it.

---

## 1. Architecture

```
 ELDER'S PHONE (Notme app)                       FAMILY MEMBER'S PHONE (Notme app)
 React app inside Capacitor's WebView             same app, family account
   │ ① create_money_request(amount)                     ▲ ④ push notification (sound, heads-up)
   │ ② invoke send-alert(request_id)                    │ ⑤ tap → request screen → respond_to_request
   ▼                                                     │
 ┌───────────────────── Supabase (new Notme project) ─────────────────────┐
 │ Auth       – who is signed in                                          │
 │ Postgres   – tables + RLS (who may READ)                               │
 │            – SQL functions (the ONLY way app users WRITE)              │
 │ Realtime   – pushes row changes to open screens                        │
 │ Edge Function send-alert – checks the caller, finds the family         │
 │            member's device token, ③ calls FCM with a server-only key ──┼──► Firebase Cloud
 └────────────────────────────────────────────────────────────────────────┘    Messaging (Google)
   ▲ ⑥ Realtime / polling: elder sees Confirmed, or the Pause warning on Rejected / Unconfirmed
```

**Golden rules (kept from Flod):** all reads go through RLS; all app writes go through narrowly scoped SQL functions. **New:** only the Edge Function holds secrets, and only it can read device tokens.

| Technology | What it is, in plain words | Why Notme needs it |
|---|---|---|
| React + TypeScript + Vite | The Flod app: screens, logic, build into static files (`dist/`) | Already works; we reuse it |
| **Capacitor 8** | A thin Android app that shows our web build inside a built-in browser view (WebView) and lets JavaScript call phone features | Turns the web app into an installable Android app without rewriting it |
| **Android Studio** (+ Gradle, JDK, SDK) | Google's tool for building and running Android apps | Builds the APK and installs it on a phone |
| **Firebase Cloud Messaging (FCM)** | Google's free delivery service for push notifications to Android phones | The only reliable way to wake a phone whose app is closed |
| `@capacitor/push-notifications` | Capacitor plugin that asks permission, gets the phone's FCM token, and reports taps | Lets our React code use FCM |
| **Supabase Edge Function** | A small TypeScript program that runs on Supabase's servers, not on the phone | Holds the FCM secret key and sends the alert; a phone app can't keep a secret |
| Supabase Auth / Postgres / RLS / Realtime | Accounts, data, access rules, live updates (from Flod) | Unchanged core |

**Deliberately avoided:** native Kotlin/Java code, a custom backend server, database webhooks (the elder's app calls the function directly; simpler to test), a router or state library, QR/camera, SMS, iOS, Play Store, any AI API.

## 2. Phases and files

C = create, M = modify. Files are planned; each phase records "as built" here afterwards.

| Phase | Files |
|---|---|
| 0 | M the project brief, `PROMPTS.md` (local, not tracked by git); C `docs/PLAN.md`; moved Flod's plan to `docs/flod-reference/PLAN-flod.md`; M `docs/BUILD_LOG.md`, `docs/DISCLOSURE.md`, `docs/LEARNING_GUIDE.md` (Part B outline) |
| 1 | C `supabase/migrations/0006_amount_only.sql`. M `package.json`, `package-lock.json` (name), `index.html` (title), `README.md`, `src/types/domain.ts`, `src/lib/validation.ts`, `src/lib/api/requests.ts`, `src/components/{RequestForm,RequestCard,StatusBanner,FamilyResponse,Layout}.tsx`, `src/pages/RequestDetail.tsx` (+ any page showing the name "Flod"), `src/mock/{mockData,mockStore}.ts`, `src/test/fakeSupabase.ts`, `src/styles/global.css`, the tests that use recipient/note, `supabase/checks/{rls_checks,deploy_checks}.sql`, `.env.example` (comment only). **As built:** as planned, plus `src/pages/{CreateRequest,ElderHome,AboutSafety,PairFamily}.tsx` (wording/name); `.env.example` needed no change; 9 test files updated |
| 2 | C `capacitor.config.ts`, `android/` (generated by `npx cap add android`). M `package.json` (deps + `cap:sync` script), `.gitignore`, `README.md` |
| 3 | C `supabase/migrations/0007_push_tokens.sql`, `src/lib/push.ts` (permission, channel, register, listeners), `src/lib/api/pushTokens.ts`, `src/components/NotificationsBanner.tsx` + tests. M `src/SignedInApp.tsx` (open a request from a tap; register on family sign-in, unregister on sign-out), checks SQL, `.gitignore` (`google-services.json`). Not in git: `android/app/google-services.json` |
| 4 | C `supabase/functions/send-alert/index.ts`, `supabase/migrations/0008_alert_sent.sql` (`alert_sent_at`). M `src/lib/api/requests.ts` (invoke the function), `src/pages/{CreateRequest,ElderHome}.tsx` ("Alert may not have reached" + Retry), `src/test/fakeSupabase.ts` (fake `functions.invoke`), tests, `README.md` (deploy + secrets) |
| 5 | M whatever real-phone tests show is broken; `docs/LEARNING_GUIDE.md` (Android failure table) |
| 6 | M `README.md`, `docs/DEMO_SCRIPT.md`, `docs/DISCLOSURE.md`, `docs/DEPLOY.md` (Android/APK section), `docs/LEARNING_GUIDE.md` |

## 3. Data model changes

```
profiles, family_links, pairing_codes   unchanged from Flod (0001–0005)
money_requests   − recipient, − note                         (0006)
                 + alert_sent_at timestamptz null             (0008)
push_tokens      token text PK | user_id → profiles (on delete cascade) | updated_at   (0007)
                 RLS enabled and NO policies: app users cannot read or write it directly
```

| Function | Change | Rule |
|---|---|---|
| `create_money_request(p_amount_inr, p_timeout_seconds)` | replaces the 4-argument Flod version (0006); old signature dropped | caller must be an elder with a link; amount 1–100000; receiver, status and times set by the database |
| `respond_to_request(id, decision)` | unchanged | one conditional UPDATE: right request, sent to me, pending, not expired |
| `register_push_token(p_token)` | new (0007) | family accounts only; always stores `auth.uid()`; if the token was saved for another account (same phone, new sign-in) it moves to the caller |
| `unregister_push_token(p_token)` | new (0007) | deletes only the caller's own row; called on sign-out so a signed-out phone stops getting alerts |
| Edge Function `send-alert` | new (Phase 4) | reads tokens and sets `alert_sent_at` with the server-side key; the app never can |

**Why a new Supabase project:** 0006 drops columns the Flod web app needs. A separate project keeps Flod working as the backup demo. Migrations 0001–0005 are re-run there unchanged, then 0006+.

## 4. Alert lifecycle (browser → database → phone → back)

1. **Elder sends:** types the amount → client validation → `create_money_request(amount, 60)` → database copies `family_id` from `family_links`, stores `pending`, sets `expires_at` from **database time**.
2. **Elder's app asks for the alert:** `supabase.functions.invoke('send-alert', { body: { request_id } })`, carrying the elder's login token.
3. **send-alert (server):**
   1. Verify the login token; get the caller's id.
   2. Read the request **as the caller** (RLS applies): must exist, `elder_id` = caller, `pending`, not expired.
   3. Claim it with a conditional update: `alert_sent_at = now() WHERE id = … AND alert_sent_at IS NULL`. Zero rows → already sent; return without sending again.
   4. Look up `push_tokens` for that request's `family_id`.
   5. For each token, call FCM HTTP v1 `messages:send`: Android priority **high**, channel `money-alerts`, title "Money alert from Asha (demo)", body "Asha is being asked to send ₹25,000. Call her on a number you already trust, then answer in Notme.", data `{ request_id }`.
   6. Delete tokens FCM reports as invalid. If **every** send failed, release the claim (`alert_sent_at = null`) so Retry can work. Return how many were sent.
4. **Family phone:** high-importance channel → heads-up notification with sound, even if the app is closed. If the app is open, the in-app inbox updates through Realtime as in Flod.
5. **Family answers:** tap → app opens that request → **Confirm** or **Reject** → `respond_to_request` (unchanged; duplicates, late answers and other accounts are refused by the database).
6. **Back to the elder:** Realtime (polling every 4 s as fallback) → Confirmed: "Your family member confirmed this request." Rejected or no answer by the deadline: large Pause warning, best-effort beep, next step.
7. **If step 2 fails:** the request still exists and the family member still sees it when they open Notme. The elder sees "Alert may not have reached your family. Call them on a number you trust." with **Retry**.

**Four request states, unchanged:** `pending`, `approved`, `rejected`, and `expired` (derived: pending + deadline passed; enforced by `respond_to_request`).

**Wording rules:** a confirmation never says "safe"; no answer never says "scam".

## 5. Risks and fallbacks

| Risk | Mitigation / fallback |
|---|---|
| Android Studio not installed; multi-GB download on venue Wi-Fi | Start now; phone hotspot if needed. Fallback: the web app in each phone's Chrome (works today, no push) |
| Capacitor/Gradle build errors | Follow current Capacitor 8 docs; emulator as second device; rescue prompt "Android build problem" |
| Firebase setup mistakes | Phase 3 proves delivery with a Firebase console test message **before** any server code |
| FCM service-account key leaks | Only in Supabase Edge Function secrets; `.gitignore` covers `*service-account*.json` and `google-services.json`; secret scan of bundle and git history in Phase 5. (Supabase's own example keeps the key as a file next to the function; we do not.) |
| Push delayed or dropped (Doze, Xiaomi/Vivo/Oppo/Realme battery savers, Do Not Disturb, permission denied) | High priority + high-importance channel; test on the actual demo phones; "notifications are off" banner; the database, inbox and Realtime stay the truth; the elder's timeout warning covers "no answer" |
| Someone abuses `send-alert` (spam, or alerts for another person's request) | Login required; caller must own the pending request; receiver read from the database, not the request body; at most one successful alert per request |
| Elder's app loses network right after creating the request | "Alert may not have reached" + Retry; family still sees it in the inbox |
| Shared or signed-out phone keeps getting alerts | `unregister_push_token` on sign-out; a token moves to whoever registers it last |
| Lock-screen privacy | Payload limited to display name + amount; documented. PIN before Confirm is a stretch item |
| Sideloaded APK looks like a scam app | Demo only, said openly; real users would install from the Play Store |
| Supabase free-tier limits / project pausing | Fresh project today; Flod project kept as backup |
| Compromised family account | Out of scope; documented limitation (stretch: PIN, more contacts) |
| Wrong phone clock | Database time decides expiry; client only displays (Flod `0005`) |

**External services:** Supabase (free tier), Firebase Cloud Messaging (free), Google's servers carry the push payload.

**Unknowns:** official build-window end time and submission requirements (Devpost blocked to tools); which Android phones/OEMs the team will demo on; whether venue Wi-Fi blocks FCM (port 5228 and others; mobile data as fallback).

## 6. Hackyard Build 2026 — rules (re-checked 2026-10-24)

Sources, both "Last updated: 22 September 2026":
- https://hackyard.org/build2026/rules
- https://hackyard.org/build2026/guide

**Verified:**
- 24-hour in-person hackathon at IIT Guwahati, 24–25 October 2026.
- "Pre-existing libraries, tools, designs, datasets and project foundations may be used when disclosed."
- "Teams must clearly identify what existed before the event and what they built during the official window."
- "A reused foundation must be transformed through meaningful onsite work." Undisclosed pre-built work can lead to disqualification.
- "AI, open source, APIs and hardware are allowed when their terms permit the use." No coding-assistant-specific rule.
- "Use public, synthetic or authorized data."
- Guide: "If you already have a prototype, you can include a public link in the optional work-link field."

**Not stated on those pages:** start/end times, timezone, submission requirements (repo, video, deadline). https://hackyardbuild2026.devpost.com/ returned HTTP 403 again on 2026-10-24. **A teammate must open it in a browser** and note the deadline and required fields here.

**How we stay compliant:** the git tag `pre-event-end` (commit `f710e6f`) marks the last pre-event commit; `2f3f631` is a clearly labelled late commit of two pre-event docs; every later commit ends with `(onsite)`; `docs/DISCLOSURE.md` lists what came from Flod.

## 7. Assumptions (accepted with the plan unless the user says otherwise)

1. One linked family member per elder (Flod's model). More contacts = stretch.
2. The family member answers **Confirm** or **Reject** (Flod's `respond_to_request`, unchanged).
3. The elder sends **amount only**: the recipient and note columns and parameters are removed (0006).
4. A **new Supabase project** for Notme; the Flod project and web demo stay untouched as the backup.
5. One APK for both roles; the role is chosen once at sign-up (Flod).
6. Push goes only to the family member; the elder sees the answer in the app.
7. The elder's app calls `send-alert` right after creating the request (no database webhook). Limitation: if the app dies in between, no push; the request still shows in the family inbox.
8. Demo timeout stays 60 seconds (`src/config.ts`), labelled as a demo value.
9. Debug APK installed over USB for the demo; no Play Store.
10. Push text uses only the demo display name and amount.

## 8. Time plan (estimates; adjust once the deadline is known)

| Phase | Estimate | Blocked by |
|---|---|---|
| 1 Amount-only + rename | 1–1.5 h | new Supabase project (user, ~10 min) |
| 2 Android app | 1.5–2 h | Android Studio installed; USB debugging on a phone |
| 3 Push on the family phone | 1.5–2 h | Firebase project (user, ~15 min) |
| 4 Edge Function alert | 2–3 h | Firebase service-account key into Supabase secrets (user) |
| 5 Real-phone safety pass | 1.5–2 h | two devices |
| 6 Demo readiness | 1.5–2 h | Devpost requirements (teammate) |

## 9. Phase acceptance checklists

### Phase 0
- [x] the project brief and `PROMPTS.md` rewritten for the Notme Android app
- [x] Official rules re-checked and cited; unknowns listed
- [x] Current Capacitor 8, push-notification and Supabase Edge Function docs read
- [x] This plan: architecture, phases/files, data model, lifecycle, risks, assumptions
- [x] Import of Flod logged in `docs/BUILD_LOG.md`; `docs/DISCLOSURE.md` updated
- [x] `docs/LEARNING_GUIDE.md` Part B outline
- [x] Plan approved by the user (2026-10-24)

### Phase 1
- [x] No "Flod" left in app UI, `package.json`, `index.html` or README (history, pre-event migration headers and `presentation/` excepted)
- [x] `0006` removes recipient and note; amount-only `create_money_request`; old signature dropped; written to be re-runnable (`if exists`, `create or replace`); applied on the new Notme project (user, 2026-10-24)
- [x] Types, form, cards, detail screens, mocks, fake and tests have no recipient/note
- [x] `rls_checks.sql` (37) / `deploy_checks.sql` (28) updated
- [x] Both check scripts pass on the new Notme project: 37/37 and 28/28 PASS (user, 2026-10-24)
- [x] Lint, typecheck, 87/87 tests, build pass (exact results logged)
- [x] Screens checked at 375 px with the in-memory fake
- [x] Manual two-browser check on the new project (user, 2026-10-24)

### Phase 2
- [ ] Capacitor 8 added; `capacitor.config.ts` with `webDir: 'dist'`; `android/` created
- [ ] App runs on a real phone; sign-in persists after closing
- [ ] Realtime/polling, timeout warning and beep work on the phone
- [ ] Back button, 200% font, no horizontal scroll checked
- [ ] Phone ↔ other device flow works (user)

### Phase 3
- [ ] Firebase project + `google-services.json` (not in git)
- [ ] Permission asked with an explanation (Android 13+); `money-alerts` channel, high importance, sound
- [ ] Token saved via `register_push_token`; removed on sign-out; no client read access (RLS checks)
- [ ] Console test message received in foreground, background and closed states
- [ ] Tap opens the request; "notifications off" banner works

### Phase 4
- [ ] `send-alert` deployed; FCM key only in Supabase secrets
- [ ] Two devices: amount sent → push within seconds (app in background) → tap → Confirm/Reject → elder updates live
- [ ] Third account cannot trigger an alert for someone else's request; second call does not send twice
- [ ] Invoke failure shows "Alert may not have reached" + Retry

### Phase 5
- [ ] Android failure table filled from real tests
- [ ] Rejection and timeout always show the visual warning
- [ ] TalkBack, 200% font, tap targets checked
- [ ] RLS/deploy checks re-run on the Notme project (user); bundle and git history secret scan

### Phase 6
- [ ] Debug APK installed on the demo phones from a clean start
- [ ] README, DEMO_SCRIPT, DISCLOSURE, DEPLOY and LEARNING_GUIDE match what works
- [ ] Backup plan (hotspot; Flod web app, labelled) rehearsed
- [ ] Devpost requirements checked by a teammate and met

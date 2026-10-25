# Notme — Onsite Implementation Plan

> Status: **approved** on 2026-10-24 (the user asked to start Phase 1).
> Brief: the project brief. Phase prompts: `PROMPTS.md`. Flod's finished pre-event plan: [`docs/flod-reference/PLAN-flod.md`](flod-reference/PLAN-flod.md) (pre-event build-log entries that say "`docs/PLAN.md` §N" mean that file).

## Progress

- [x] **Phase 0** — Onsite plan, rules re-check, docs *(2026-10-24; approved)*
- [x] **Phase 1** — Rename to Notme; amount-only request (web) *(code + automated checks 2026-10-24, commit `11504dc`; new Supabase project, 37/37 RLS checks, 28/28 deploy checks and the manual two-browser test passed, reported by the user 2026-10-24)*
- [x] **Phase 2** — Android app with Capacitor *(2026-10-24: Capacitor 8.5.3 + `android/`; APK builds with Gradle JDK 21; runs on emulator and realme GT 6T; user reports the test works; Back button fixed and re-checked on the phone)*
- [x] **Phase 3** — Push notifications on the family phone *(2026-10-24: code, 0007, 105 tests; Firebase set up; user reports checks 45/36 PASS and console test messages in all three app states "all worked")*
- [x] **Phase 4** — Server sends the alert (Edge Function) *(2026-10-25: deployed; after fixing the server role's GRANTs (0009) and the Firebase account's IAM role, the family phone got the notification automatically, reported by the user)*
- [ ] **Phase 5** — Safety and failure handling on real phones
- [ ] **Phase 6** — Demo readiness and disclosure
- [ ] *Stretch, only if approved after Phase 4 works:* more family contacts, "I'll call you", red-flag options, code-word reminder, PIN before Confirm
- [ ] *Requested by the user (2026-10-24/25), after Phase 4:* alarm-like alert, family overlay with looping sound + vibration, elder quick-access button — see §9

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
| 2 | C `capacitor.config.ts`, `android/` (generated by `npx cap add android`). M `package.json` (deps + `cap:sync` script), `.gitignore`, `README.md`. **As built:** scripts are `android:sync` and `android:open`; also M `tsconfig.node.json`, `.gitattributes` (CRLF for `.bat`); Back-button fix found on the phone: dep `@capacitor/app`, C `src/hooks/useBackButton.ts` (+ test), M `src/SignedInApp.tsx` |
| 3 | C `supabase/migrations/0007_push_tokens.sql`, `src/lib/push.ts` (permission, channel, register, listeners), `src/lib/api/pushTokens.ts`, `src/components/NotificationsBanner.tsx` + tests. M `src/SignedInApp.tsx` (open a request from a tap; register on family sign-in, unregister on sign-out), checks SQL, `.gitignore` (`google-services.json`). Not in git: `android/app/google-services.json`. **As built:** also C `src/hooks/usePushNotifications.ts` (+ test); M `capacitor.config.ts` (`presentationOptions`), `AndroidManifest.xml` (`POST_NOTIFICATIONS`, default channel), `strings.xml`, `api.test.ts`, `SignedInApp.test.tsx`; `.gitignore` entry was already added in Phase 2 |
| 4 | C `supabase/functions/send-alert/index.ts`, `supabase/migrations/0008_alert_sent.sql` (`alert_sent_at`). M `src/lib/api/requests.ts` (invoke the function), `src/pages/{CreateRequest,ElderHome}.tsx` ("Alert may not have reached" + Retry), `src/test/fakeSupabase.ts` (fake `functions.invoke`), tests, `README.md` (deploy + secrets). **As built:** also C `supabase/functions/send-alert/fcm.ts` (+ `fcm.test.ts`), `src/components/AlertStatus.tsx`; the message is on `src/pages/RequestDetail.tsx` (not CreateRequest/ElderHome); M `src/types/domain.ts` (`alertSentAt`, `AlertState`), `SignedInApp.tsx`, `src/test/setup.ts`, `global.css`, mocks/tests, `.gitignore`, `deploy_checks.sql` |
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

## 9. Requested extras (backlog, after Phase 4)

Asked for by the user during the event. Not built yet; each needs the core flow (Phase 4) working first.

| # | Feature | Plan | Needs |
|---|---|---|---|
| E1 | **Alarm-like alert on the family phone** (continuous sound) | New channel `money-alarm` (Android can't change an existing channel's sound): self-made ~30 s alarm tone in `res/raw`, maximum importance, long vibration pattern. Phase 4's server message uses this channel | **Built 2026-10-25 without native code:** Capacitor's `createChannel({ sound })` plays `res/raw/notme_alarm.wav` (30 s, made by `scripts/make-alarm-tone.mjs`). Default vibration pattern only; a ring that repeats until answered would still need native Java. **Phone test ✅** (user: 30-second alarm with Notme in the background and closed) |
| E2 | **Overlay warning on the family phone** | Red full-screen overlay when a new request is waiting (Notme open, or after tapping the alert): elder's name, amount, "call them on a number you already trust", **Open request** / **Stop alarm**; looping alarm (Web Audio) until a button, an answer or expiry | No native code |
| E3 | **Vibration when sound isn't possible** | `@capacitor/haptics`: repeating 1 s buzz / ½ s pause for up to 30 s while the overlay shows; when closed, the channel's vibration pattern (E1) | Plugin (official, MIT); E1's native part for the closed case |
| E4 | **Elder quick-access button during a scam call** | Options, least risky first: (a) an always-present notification "Money call? Tap to check with family" (official Local Notifications plugin; reachable over the call screen from the notification shade); (b) a Quick Settings tile (small native Java `TileService`); (c) a home-screen shortcut/widget; (d) a true floating bubble over other apps | (d) needs the **"Display over other apps"** permission, a native foreground service, and is the same permission scam apps ask elders for (see `docs/USER_FLOW_FEEDBACK.md` §3). Recommended: (a), then (b) if time allows. **User chose (a)** (2026-10-25): an always-present notification on the elder's phone; tapping it opens Notme on **Send a money alert**. **Built 2026-10-25** (`@capacitor/local-notifications`, `src/lib/quickAccess.ts`, `useQuickAccess`, `QuickAccessBanner`; 10 tests); phone test pending |

Honest limits for all of them: Do Not Disturb or a fully silent phone may stop sound and vibration; realme/Xiaomi battery savers can delay or kill background work; only the visual warning is certain.

## 10. Phase acceptance checklists

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
- [x] Capacitor 8 added (8.5.3); `capacitor.config.ts` with `webDir: 'dist'`; `android/` created
- [x] Debug APK builds with Gradle JDK 21 (JBR 25 fails with Gradle 8.14.3): `app-debug.apk` 4.08 MB
- [x] App installs and opens on the emulator (sign-in screen clear of the system bars, no errors in logcat)
- [x] App runs on a real phone (realme GT 6T, RMX3853); user reports the Phase 2 test "works fine" (2026-10-24)
- [x] Phone ↔ laptop browser flow works (user, 2026-10-24)
- [x] Back button: user found it closed the app; fixed with `@capacitor/app` (`useBackButton`: Back → home screen, Back on home → minimise); 92/92 tests; APK builds and starts on the emulator
- [x] User re-checks Back on the phone (README Phase 2 test, step 5): request screen → home, home → app minimised (user, 2026-10-24)

### Phase 3
- [x] Firebase project + `google-services.json` (not in git) — user; file checked by the AI assistant
- [x] Permission asked only after an explanation and a tap (Android 13+); `money-alerts` channel, importance 5, sound; shown in the foreground too
- [x] Token saved via `register_push_token`; removed on sign-out; no client read access — code + 8 RLS checks written (45 total)
- [x] 0007 applied; `rls_checks.sql` 45 PASS and `deploy_checks.sql` 36 PASS on the Notme project — user ("all worked")
- [x] Console test message received in foreground, background and closed states; tap opens Notme — user ("all worked")
- [ ] Tap with `request_id` opens that request from a **closed** app — not reported separately; re-check in Phase 4
- [x] Lint, typecheck, 105/105 tests, APK build (without Firebase file)

### Phase 4
- [x] Function written: caller checked, own pending request only, receiver from the database, at most once, dead tokens removed, claim released on failure; helpers 9/9 tests
- [x] 0008 applied (confirmed via the API on 2026-10-25)
- [x] **Bug found live:** `permission denied for table money_requests` (service_role had no table GRANTs) → `0009_service_role_grants.sql` run by the user
- [x] **Bug found live:** `PERMISSION_DENIED … cloudmessaging.messages.create` → the user gave the Firebase service account the **Firebase Cloud Messaging API Admin** role
- [x] `send-alert` deployed; FCM key only in Supabase secrets (seen via the CLI, 2026-10-25)
- [x] Two devices: amount sent → family phone notified automatically (user, ~12:10 IST, after the IAM role fix)
- [ ] Tap opens that exact request from a closed app — user
- [x] A second call does not send twice; someone else's request → "not found" (in the function code and the fake; **not yet tried against the deployed function**)
- [x] Invoke failure / no device shows "may not have reached" / "hasn't turned on alerts" + Try again (automated tests)

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

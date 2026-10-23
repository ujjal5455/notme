# User-flow feedback and design notes for Notme (Android app)

**What this is:** a design review from the team's discussion on 2026-10-23, after building the Flod web prototype. It looks at how a real **Android app** ("Notme", to be built onsite) would work for elderly users who aren't confident with technology, during a scam call.

**What this is not:** results from testing with real users. **No user testing has been done yet.** Section 8 has a 15-minute role-play script to do that at the event.

---

## 1. The key insights

1. **In panic, people can't judge.** A scam call is designed to stop careful thinking. The elder won't remember warning signs or check where the money goes. So Notme must **not** ask the panicking person to judge anything.
2. **Move the decision to a calm person.** The elder's only task is one action: *send it to family.* Calm family members see the exact amount and payee and decide, check, or even pay it themselves.
3. **It must be faster than paying.** A UPI payment takes about 30 seconds. If sending to family takes longer, panic chooses paying. Target: **under 15 seconds, nothing to type.**
4. **Advise, never block.** Notme can't stop a UPI payment, and real emergencies (private hospital, cab after an accident) genuinely need money fast. Small plausible payments must never be blocked, and "wait" can't be a blanket rule.
5. **A phone call verifies one person, only if they pick up now.** Notme's value over a call is reaching the **whole trusted circle**, a request that **stays open until someone answers**, and the **exact details in writing**.

## 2. "Why not just call the family member?" (the three scenarios)

### 2.1 The family already knows about voice cloning, so why not just call?
They should, and Notme shouldn't replace the call. **"Call Ravi now" is the first option** in the app. Notme adds what a call can't:
- a routine practised in advance for the moment thinking stops;
- several people alerted at once, and whoever sees it first answers;
- an answer without talking (meeting, noisy road): one tap on **Reject**;
- the exact amount and payee in writing.

### 2.2 The scammer says "don't call my number, it's switched off; pay this QR or number"
- In panic, nobody will treat "don't call me" as a warning or check the payee, and the money may genuinely need to go to a hospital or a cab driver, so **"this isn't Ravi's UPI ID" is not proof of a scam.**
- What works instead: the elder **scans the QR and sends it to the circle**. The **calm family members** see "₹25,000 to City Care Hospital (`citycare@okicici`)" and judge it.
- Optional one-tap questions in the flow (*"Did they say not to call them? To keep it secret?"*) let the app, not the elder's memory, raise the warning.
- The circle must include **more than the impersonated person**, ideally someone scammers are less likely to copy (a spouse or sibling of the elder).

### 2.3 They tried calling the real person, but the phone was off or busy
- A missed call disappears; a Notme request **stays open** and **escalates** to the next contact. Ravi sees it when he's free and taps Reject in seconds.
- A **family code word**, agreed in person at setup: the elder asks *the caller* "What's our family word?" This works with **no app, no network and no answer from Ravi.**
- Real emergencies: see section 2.4.

### 2.4 Real emergencies need money now (private hospitals, cab drivers)
- **The calm person can pay instead of the elder.** The family member phones the hospital on its **official number (found on Google, not one given by the caller)** to check the patient is there, then pays the hospital directly. Answer options: **Confirm / Reject / "I'll handle this"**.
- **Size the check to the risk.** Let the family set a limit: below it (a cab fare of ₹300–₹1,000), no check; above it (voice-clone scams typically ask ₹10,000–₹1,00,000+), family confirmation strongly advised. Add up requests over 24 hours so many small amounts don't slip through.
- **If nobody is reachable**, the elder decides. Notme supports that ("pay the hospital or business directly, not a personal UPI ID", plus a button to find its official number), then an **"I decided to pay"** button tells the circle to follow up.
- **To verify before quoting:** India has rules on hospitals giving emergency treatment to road-accident victims, and a government cashless-treatment scheme. Check the current details before mentioning them to judges.

## 3. Android app: what changes compared with the web prototype

**What a native app fixes:** push notifications to family even when the app is closed (Firebase Cloud Messaging); home-screen icon and permanent sign-in; QR scanning (`upi://pay?pa=…&pn=…&am=…` fills in payee and amount); text-to-speech and vibration; PIN or fingerprint for approvals.

**What it can't do, and shouldn't try:** intercept GPay or PhonePe payments, or monitor calls. Apps that do this (via Accessibility Services or call-log access) behave like malware, Play Store policy restricts them, and the project brief rules out call interception.

**New risks an APK brings**

| Risk | Why it matters | What to do |
|---|---|---|
| Sideloading an APK | Fake "bank KYC" APKs are a top scam in India; elders are rightly told never to install APKs from links; Play Protect shows scary warnings | Play Store for real use, or the family installs it in person. For the demo, say this openly |
| Delayed notifications | Xiaomi, Vivo, Oppo and Realme (common in India) kill background apps; Doze; Do Not Disturb; Android 13+ needs the user to allow notifications | High-priority push, alarm-like sound, a setup check of battery settings, a "Send test alert" button |
| Permission prompts | Every Allow/Deny can be tapped wrongly | Elder phone: camera only (for QR codes). Family phone: notifications |
| Lock-screen buttons | Accidental or stolen-phone approvals | **Reject** from the notification; **Confirm** needs the app plus a PIN |
| Old and cheap phones | Old Android, low memory, small screens, **huge font sizes** | Test at 200% text; keep the backend compatible with old app versions |
| Shared or lost phones | Grandchildren use the phone; a lost family phone can approve | App PIN for approving; remove a device or re-pair |
| Switching apps mid-call | Many elders can't leave the call screen, and fear cutting the call | First screen: **"Hang up first. Real family will understand."** |

## 4. Scenarios still open, and how to tackle them

✅ solvable · 🟡 can be reduced · ❌ honestly unsolvable

### Elder side
| Scenario | How | |
|---|---|---|
| Never opens the app | Family installs and practises it once (fire drill); widget; sticker on the phone case: *"Money call? Press Notme"*; monthly practice reminder. Call detection is ruled out (see section 3) | ❌ (🟡 reduced) |
| Scammer says "don't tell anyone, don't use any app" | Practised rule: *"Anyone telling you not to check is a scammer"*; the family code word | 🟡 |
| Can't use the phone during the call | "Hang up first"; the flow works after the call | ✅ |
| Reading, language, eyesight | Hindi plus regional languages, warning read aloud, icons, big keypad or voice for the amount | ✅ |
| No internet or data balance | "Send as SMS" pre-written to the circle (opens the SMS app; no special permission) | ✅ |
| Scammer controls the screen (AnyDesk, screen share, malicious APK) | `FLAG_SECURE` on Notme screens; warn if an app has accessibility ("control your screen") access; approvals are server-side, so they can't be faked | 🟡 |

### Family side
| Scenario | How | |
|---|---|---|
| Nobody answers | Ask contacts one after another with short time limits, then "nobody answered" with safe advice | 🟡 |
| Family member fooled too | Confirm screen asks *"Have you spoken to Ravi yourself, on his usual number?"*, shows warning signs, suggests calling the hospital's official number | 🟡 |
| A family phone stolen or compromised | PIN or fingerprint; **every approval visible to the whole circle**; two approvals for large amounts | ✅ |
| Alerts arrive late | High-priority push, battery-settings check, weekly test alert | 🟡 |
| Alert fatigue | Only above the limit; distinct sound; no routine notifications | ✅ |
| Rubber-stamping | Huge amount and payee; Confirm needs a deliberate extra step; Reject is one tap | 🟡 |

### Scammer counter-moves
| Scenario | How | |
|---|---|---|
| "New phone, add my new number" | Adding contacts **only in person** with a code; **24-hour waiting period**; existing contacts notified | ✅ |
| SIM swap or hacked WhatsApp (the call shows Ravi's real number) | Verification goes through Ravi's **app account on his own device**, not his phone number | ✅ |
| Asking for an OTP, screen-sharing app, gift cards, crypto, cash pickup | Options in the flow → instant **"This is always a scam"** | ✅ |
| Scams that don't pretend to be family ("police / digital arrest", "bank KYC", "electricity cut") | Button wording: *"Someone is asking me for money or information"* | ✅ |
| Many small amounts under the limit | Add up requests over 24 hours | ✅ |

### Real emergencies
| Scenario | How | |
|---|---|---|
| Genuine emergency, nobody reachable | Never block; "pay the business directly"; find its official number; "I decided to pay" tells the circle | 🟡 |
| Telling a real emergency from a fake one | Not possible. Notme gets a calm person involved fast | ❌ |

### Trust, privacy, dignity
| Scenario | How | |
|---|---|---|
| Elders wary of installing apps | Play Store or installed by family in person | ✅ |
| "My family is watching my money" | The elder chooses what to send; no monitoring; the elder can remove contacts (others notified) | ✅ |
| Storing payment details | Keep the minimum; delete requests after 30 days | ✅ |

## 5. What to build in the 24 hours (priority order)

1. **Big button → scan QR → sent to the circle**, under 15 seconds.
2. **Push notifications to 2–3 contacts**, with **Confirm / Reject / "I'll handle this"**.
3. **Red-flag options** ("OTP / install an app / don't call me") → instant blunt warnings.
4. **Every approval visible to the whole circle**, plus a PIN to approve.
5. **Family code word** set up at pairing, shown as a reminder screen.

**Present as future work:** escalation timing, SMS fallback, 24-hour wait for new contacts, two approvals for large amounts, more languages and voice, `FLAG_SECURE` and accessibility warnings, 30-day deletion.

**Build-risk warning:** set up the Android build and get **one push notification working in the first few hours**. If the team knows React, React Native with Expo (or Capacitor) reuses those skills; pure Kotlin means learning a language overnight.

## 6. Honest limits to state openly

- An elder who never opens the app gets no help.
- If nobody in the circle is reachable during a genuine emergency, the elder decides alone; Notme can only advise.
- Notme cannot tell a real emergency from a fake one.
- A compromised family account can approve (reduced by PIN, circle visibility and two approvals, not removed).
- No user testing yet (see section 8).

## 7. One-sentence answers for judges

- **Why not just call?** *"A phone call verifies one person, only if they pick up right now. Notme alerts the whole trusted circle, waits for whoever can answer, and puts the exact payment in writing."*
- **What about panic?** *"In panic, people can't judge. Notme doesn't ask them to: in under 15 seconds it puts the exact payment in front of calm family members, who can check with the hospital directly and even pay it themselves, while small emergency payments are never blocked."*
- **What if they say 'don't call me'?** *"That's exactly when a call fails and Notme still works: it goes to the rest of the circle, and the family code word works without any phone at all."*

## 8. A 15-minute role-play to test with real people (do this at the event)

Use made-up details only. Ideally test with one older person and one person who isn't on the team.

1. **Setup (3 min):** give them the elder's phone with Notme installed and paired. Explain nothing beyond "this app helps you check money requests with family".
2. **Role-play (5 min):** a teammate phones them as "Ravi", panicked: accident, needs ₹25,000 now, phone broken, "don't call my number", sends a QR code. Don't help them.
3. **Watch and time (silently):** Did they open Notme at all? How many seconds to send? Where did they hesitate or tap the wrong thing? Did they read the warning? Did they try to pay anyway?
4. **Ask (5 min):** "What did the app tell you to do?" "What was confusing?" "Would you use this on a real call?"
5. **Write down** 3 things to change and change at least one before judging. Then you can tell judges: *"We tested with users and changed X."*

Record findings below.

### Findings
*(none yet)*

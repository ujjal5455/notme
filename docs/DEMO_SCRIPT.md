# Flod — Demo script

Two versions: **90 seconds** and **3 minutes**. Both use **made-up people and data only** and show only features that are built and tested (see `docs/BUILD_LOG.md`). The 60-second answer window is a **demo value**, not a real-life recommendation.

## Before the demo (do this the day before and again 10 minutes before)

- [ ] Open the Supabase project in the dashboard the **day before** (free projects pause when unused).
- [ ] The deployed URL open (see `docs/DEPLOY.md`), or `npm run dev` running on the laptop.
- [ ] **Window A** (normal window): signed in as `elder1@example.com`, **Asha (demo)**, on **Home**.
- [ ] **Window B** (private window, or a second device): signed in as `family1@example.com`, **Ravi (demo)**, on the **Inbox**. Asha and Ravi already paired.
- [ ] Both windows side by side and readable from the back of the room (browser zoom 125–150%).
- [ ] Sound on, volume medium. Tap once anywhere in window A (this allows the beep).
- [ ] No old pending requests: the Inbox says "Nothing is waiting for you right now".
- [ ] Phone hotspot ready in case the venue Wi-Fi fails.
- [ ] **Backup:** see `docs/DEPLOY.md` → "Backup plan" (hotspot → laptop dev server → screen recording → `npm test` simulation, each clearly labelled). If the network fails mid-demo, say so honestly: the "Can't reach the server… don't pay" warning that appears is itself a feature.

Made-up values used below: ₹25,000 to `hospital.desk@demo-upi`, note "Caller says Ravi had an accident"; ₹1,500 to `electricity.bill@demo-upi`.

---

## 90-second version

| Time | Say | Do |
|---|---|---|
| 0:00 | "AI can now copy a family member's voice. Scammers call an elder, sound exactly like their grandson, and demand money **now**. Flod doesn't try to detect the fake voice. It makes the elder **check the exact request** with a family member they linked in advance, on a separate channel." | Point at the two windows: "Asha, the elder, on the left. Ravi, her grandson, on his own phone on the right. They paired in person beforehand." |
| 0:15 | "Asha gets a panicked call: 'It's Ravi, I've had an accident, send ₹25,000 to this UPI ID.' Before paying, she checks." | A: **Check a money request** → `25000`, `hospital.desk@demo-upi`, note → **Send to family to confirm**. |
| 0:30 | "Asha sees 'Waiting for Ravi, do not pay yet', with a countdown. And the real Ravi sees the **exact** amount and recipient straight away, with no refresh." | Point at B: the request appears by itself. Open it. |
| 0:40 | "Ravi is fine and never asked for this. He rejects it." | B: **Reject request**. |
| 0:45 | "Asha's screen changes **by itself**: a big Pause warning, and a beep. She doesn't pay; she calls Ravi on the number she already knows." | Point at A: the Pause warning (and the beep, if heard). |
| 0:55 | "When a request **is** genuine, Ravi confirms it. Asha sees 'confirmed'. We're careful with wording: it confirms the details, not that the recipient is safe." | A: send ₹1,500 to `electricity.bill@demo-upi`. B: open → **Confirm request**. Point at A's message. |
| 1:15 | "If Ravi doesn't answer in time, it's **unconfirmed**, not proof of a scam, and Asha is told not to pay until she reaches him. Only the linked family member can see or answer a request, and the database enforces that, not the buttons. We tested it with 36 security checks." | (No action. Optionally point at the Safety tab.) |
| 1:30 | End. | |

---

## 3-minute version

Start the timeout **first**, so it expires while you talk.

| Time | Say | Do |
|---|---|---|
| 0:00 | Problem: "Voice cloning makes 'grandparent scams' far more convincing. The usual defence, detecting the fake, is an arms race. Flod takes a different approach: **don't judge the voice, verify the request**." | Show both windows. |
| 0:15 | "First, how the trust is set up. Asha and Ravi linked their accounts **in person**, with a one-time code that works once, for 10 minutes. The screen warns: never read it out on a call. A scammer on the phone can't link themselves." | (Optional, if you have a spare unpaired elder account in a third window: show **Show a pairing code** and its warning. Don't redeem it.) |
| 0:35 | "Let me start a request that nobody will answer, and we'll come back to it." | A: send ₹5,000 to `unknown.agent@demo-upi`. Leave it. Go back to **Home**. |
| 0:45 | Scenario 1, the scam: "A panicked call: 'Grandma, it's Ravi, I've had an accident, send ₹25,000 now.'" | A: send ₹25,000 to `hospital.desk@demo-upi` with the note. |
| 1:00 | "Ravi gets it instantly, with the exact amount, recipient and what the caller said. He has a countdown." | B: the request appears by itself; open it. |
| 1:10 | "He's fine. He rejects it. Asha's screen updates **on its own**: Pause, don't pay, call Ravi on a number you already trust. The warning doesn't depend on sound: browsers can block it and phones get muted. The beep is only a bonus." | B: **Reject request**. Point at A. |
| 1:30 | Scenario 2, genuine: "Asha really does need to pay the electricity bill." | A: send ₹1,500 to `electricity.bill@demo-upi`. B: **Confirm request**. |
| 1:45 | "Confirmed, but we never say 'safe'. Ravi confirmed the **details**; Asha should still check the UPI ID." | Point at A's message. |
| 1:55 | Scenario 3, no reply: "Remember the ₹5,000? Ravi never answered. After 60 seconds (a demo value) it's **Unconfirmed**: no reply isn't proof of a scam, but don't pay until you've spoken to him. Asha's home screen shows a Pause alert." | Point at A's Home alert (it should have appeared by now). If it hasn't, say "it will flip in a few seconds" and keep talking. |
| 2:10 | Security: "The browser only sends what Asha typed. The **database** decides who receives it, sets the deadline on its own clock, and refuses duplicate or late answers. Row Level Security means a stranger can't even see the request. We test this with 36 automated database checks that include a stranger account." | (Optional) B: try to answer the expired ₹5,000 if its buttons are still open in another tab → "This request has expired…". |
| 2:30 | Reliability: "Live updates use Supabase Realtime. If that fails, the app checks every 4 seconds and says so. If the server can't be reached, it tells Asha not to pay. It never shows a stale 'confirmed'." | (Optional) show the Phase 6 polling notice or offline warning only if already prepared. |
| 2:45 | Honesty: "It's a hackathon prototype with made-up data. No real money moves, it doesn't listen to calls, and if a family member's account is compromised, it can't help. We list every limitation in the README." | |
| 3:00 | End. | |

## Likely questions

See `docs/LEARNING_GUIDE.md` → §12 "Explain it to a judge" for short answers to: why not voice detection; how the family member is verified; how the amount and recipient are bound to the answer; what stops someone else approving; no reply; network failure; compromised accounts; sound; stored data; built vs future work; AI use.

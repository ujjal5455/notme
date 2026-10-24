# Flod — Presenting without nerves

Tips for the whole team on presenting Flod (or any project) calmly, without rushing or a shaky voice. Use them alongside [`DEMO_SCRIPT.md`](DEMO_SCRIPT.md).

The goal is not to stop feeling nervous. It is to **speak slowly while nervous**, which is a skill you can practise.

A shaky voice usually comes from one chain: adrenaline → fast, shallow breathing → not enough air behind your words → the voice wobbles and words trip → you notice → more adrenaline. You break that chain in two places: **your breathing** and **how fast you talk**.

---

## 1. Change what you tell yourself

- **Say "I'm excited," not "calm down."** Nerves and excitement feel the same in the body: fast heart, lots of energy. In a Harvard study (Brooks, 2014), people who said "I am excited" before speaking came across as more confident than people who tried to calm down. Changing the label is easier for your brain than switching the feeling off.
- **People can't see your nerves as clearly as you feel them.** Psychologists call this the *illusion of transparency*. Your heart is pounding, but the audience just sees a normal person talking. In one experiment, simply telling speakers this fact helped them give better talks.
- **The judges want you to do well.** They are judging Flod, not your accent or grammar. Simple, clear and honest English beats fancy English.
- **We built this.** We aren't reciting someone else's work. We understand the pairing code, Row Level Security, the approve/reject function and the live updates. Even if the words disappear for a moment, the understanding doesn't.

## 2. Days before: give your brain fewer jobs

Fear grows when your brain is juggling too much, so take jobs away from it.

1. **Learn only the first two sentences word for word.** The first 15 seconds are the worst. Once you're through them, your body settles. For Flod:
   > "AI can now copy a family member's voice. *(pause)* Scammers call an elder, sound exactly like their grandson, and demand money **now**. *(pause)* Flod doesn't try to detect the fake voice. *(pause)* It makes the elder check the exact request with a family member they linked in advance."

2. **For the rest, learn the order, not the words.** The 90-second version in [`DEMO_SCRIPT.md`](DEMO_SCRIPT.md) has 7 beats. Write them on a small card:
   `Problem → Asha sends ₹25,000 → Ravi sees it live → Ravi rejects → Pause warning → ₹1,500 confirmed → No reply + security + honesty`

3. **Use the screen as your script.** In a demo you can always say what's on screen, like "Now Asha sees 'Waiting for Ravi, do not pay yet.'" If your mind goes blank, look at the screen and describe it.

4. **Practise out loud, standing up, with the real windows open.** Reading silently in your head doesn't count. Do at least 5 full run-throughs. Record yourself on your phone once and watch it once. Feeling embarrassed is normal. Pick just one thing to fix.

5. **Practise the bad moments too:** a teammate interrupts you, the Wi-Fi drops, you forget a line. If it goes wrong on stage, your body will think "I've been here before."

6. **Split the work: one teammate talks, one clicks.** Talking while typing `hospital.desk@demo-upi` is two hard jobs at once. Splitting them halves the load. Agree in advance who says which beat.

## 3. Ten minutes before

- **Physiological sigh, 3 times:** take two short breaths in through your nose (the second one tops up your lungs), then let out one long, slow breath through your mouth. The long breath out is what slows your heart. Stanford researchers have studied this pattern for reducing stress.
- Or breathe **in for 4 counts and out for 6–8** for one minute. The rule is simple: breathe out for longer than you breathe in.
- **Warm up your voice:** hum with your lips closed for 30 seconds, then say your two opening sentences aloud, slowly, twice. A cold voice shakes more.
- Take **small sips of room-temperature water.** Skip the extra coffee or energy drink, because caffeine adds to the shaking.
- **Shake out your hands and drop your shoulders.** Tension in your shoulders and jaw goes straight into your voice.
- Run the "Before the demo" checklist in [`DEMO_SCRIPT.md`](DEMO_SCRIPT.md). A finished checklist is one less thing to worry about.

## 4. On stage

- **Plant both feet and take one breath before your first word.** Don't start talking while you're still walking up.
- **Talk at about 70% of your normal speed.** Nervous people speed up without noticing. If the 90-second version finishes in 70 seconds, you rushed.
- **Use short sentences and let your voice drop at the end of each one.** Long sentences run out of air, and that's when your voice shakes.
- **Pause instead of saying "umm."** Two seconds of silence feels endless to you but looks confident to the audience. The best place to pause is right after a key moment. When Ravi clicks **Reject**, stop talking and let them watch the Pause warning appear on Asha's screen.
- **Pick 2–3 friendly faces** in different parts of the room and talk to them, not to "the audience."
- **Use your hands to point at the screen.** It gives your nervous energy somewhere to go.

### When something goes wrong

| What happens | What you do |
|---|---|
| You trip on a word | Stop, breathe, and say the sentence again more slowly. No need to apologise. The audience forgets it in 3 seconds. |
| Your mind goes blank | Look at the screen and say what it shows, or glance at your card. Or say "Let me show you" and do the next click. |
| The demo breaks | Use the line from the script: "That's actually a feature. If the server can't be reached, Flod tells Asha not to pay." Then switch to the backup in [`DEPLOY.md`](DEPLOY.md). |
| A judge asks something hard | Pause, then repeat the question in your own words, which gives you about 5 seconds to think. Answer in two sentences. "We haven't built that yet; here's how we'd approach it" is a good answer. Honesty beats a guess, and Flod's whole design is about being honest about limits. |

## 5. A shaky voice vs a stammer

If your voice only shakes when you're nervous, everything above should help. If you've had a **stammer since childhood** (it happens even with friends when you're relaxed), a few things are different:

- **Don't push harder through a block.** Start the word gently with a little air first ("hhh-Asha") and touch the first sound lightly. This is called *easy onset*.
- **Don't swap words in a panic.** It often makes the next block worse.
- **It's fine to say at the start:** "I sometimes stammer, so give me a second when I do." Saying it removes the fear of being "found out," and audiences respond warmly.
- **A speech-language therapist can teach these properly.** If nerves feel much bigger than normal stage fright, your college counselling service can help too.

## 6. Practice drills (do these without AI)

1. **Slow read (5 minutes a day):** Read the 90-second script aloud at half speed and record it. Then read it at normal speed. Over time, your "normal" speed will slow down.
2. **Pause drill:** Say the opening sentences. At each *(pause)*, count "one-thousand-one, one-thousand-two" in your head. It will feel too long, but it isn't.
3. **Blank-out drill:** Have a teammate shout "stop!" at a random moment during a rehearsal. Breathe, look at the screen, and carry on from what it shows.
4. **Grandma test:** Explain Flod in two sentences to a family member who doesn't code. If they get it, the judges will too.
5. **Q&A drill:** Have teammates read the judge questions from §12 of [`LEARNING_GUIDE.md`](LEARNING_GUIDE.md) in random order. Answer each one in under 20 seconds.

Do at least 3 full rehearsals as a team before presenting, with at least one in front of someone outside the team. Every time you do it in front of a real person, it gets easier.

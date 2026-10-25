// Best-effort warning beep. Browsers block sound until the person has tapped the
// page, phones may be on silent, and some people can't hear it, so the VISUAL
// warning is always complete on its own. Nothing here may ever throw.

let audio: AudioContext | null = null

/** Call inside a tap or key press so that the browser allows sound later. */
export function unlockAlertSound(): void {
  try {
    if (typeof AudioContext === 'undefined') return // no Web Audio (old browser, tests)
    audio ??= new AudioContext()
    if (audio.state === 'suspended') void audio.resume()
  } catch {
    // Sound is optional; ignore any problem.
  }
}

/** Two short beeps. Returns true if they were scheduled, false if sound is not available. */
export function playAlertSound(): boolean {
  try {
    if (!audio || audio.state !== 'running') return false // never unlocked, or blocked
    const start = audio.currentTime
    for (const offset of [0, 0.35]) {
      const tone = audio.createOscillator()
      const volume = audio.createGain()
      tone.frequency.value = 880 // a clear, high note (A5)
      volume.gain.value = 0.2 // noticeable, not startling
      tone.connect(volume).connect(audio.destination)
      tone.start(start + offset)
      tone.stop(start + offset + 0.2)
    }
    return true
  } catch {
    return false
  }
}

/**
 * The family member's in-app alarm (onsite, backlog E2): the same two-tone
 * beep-beep as the notification tone, repeated every 1.2 s until stop() or
 * `maxSeconds`. In the Android app Capacitor lets a page play sound without a
 * tap first; in a normal browser an earlier tap (unlockAlertSound) is needed,
 * otherwise it stays silent. Returns stop(); never throws.
 */
export function startAlarmLoop(maxSeconds = 30): () => void {
  let ringTimer: ReturnType<typeof setInterval> | undefined
  let endTimer: ReturnType<typeof setTimeout> | undefined
  const scheduled: { stop: () => void }[] = []
  const stop = () => {
    clearInterval(ringTimer)
    clearTimeout(endTimer)
    for (const tone of scheduled.splice(0)) {
      try {
        tone.stop()
      } catch {
        // already finished
      }
    }
  }
  try {
    if (typeof AudioContext === 'undefined') return stop
    audio ??= new AudioContext()
    if (audio.state === 'suspended') void audio.resume()
    const context = audio
    const ring = () => {
      if (context.state !== 'running') return // blocked: the overlay is still fully visible
      const start = context.currentTime
      ;[960, 770, 960, 770].forEach((hz, k) => {
        const tone = context.createOscillator()
        const volume = context.createGain()
        tone.type = 'square' // harsher than a sine: sounds like an alarm
        tone.frequency.value = hz
        volume.gain.value = 0.12
        tone.connect(volume).connect(context.destination)
        tone.start(start + k * 0.22)
        tone.stop(start + k * 0.22 + 0.18)
        scheduled.push(tone)
      })
      if (scheduled.length > 40) scheduled.splice(0, scheduled.length - 40) // only recent ones can still be playing
    }
    ring()
    ringTimer = setInterval(ring, 1200)
    endTimer = setTimeout(stop, maxSeconds * 1000)
  } catch {
    // Sound is optional; the overlay itself is the warning.
  }
  return stop
}

/** Tests only: forget the audio system between tests. */
export function resetAlertSoundForTests(): void {
  audio = null
}

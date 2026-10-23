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

/** Tests only: forget the audio system between tests. */
export function resetAlertSoundForTests(): void {
  audio = null
}

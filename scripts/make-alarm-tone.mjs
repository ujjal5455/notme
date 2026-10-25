// Makes Notme's alarm tone (onsite, backlog E1): a 30-second, two-tone
// "beep-beep" alarm, synthesized here so there is no copyright question.
// Output: android/app/src/main/res/raw/notme_alarm.wav (16-bit mono PCM WAV).
//
// Run again only if you change the sound:  node scripts/make-alarm-tone.mjs
// Note: Android never changes a notification channel's sound after it is
// created on a phone, so a NEW sound also needs a new channel id in
// src/lib/push.ts (or the app reinstalled).
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const SAMPLE_RATE = 16_000
const SECONDS = 30
const VOLUME = 0.8 // 0..1

// One "ring" = high beep, low beep, high beep, low beep, then a short pause.
const PATTERN = [
  { hz: 960, ms: 180 },
  { hz: 0, ms: 40 },
  { hz: 770, ms: 180 },
  { hz: 0, ms: 40 },
  { hz: 960, ms: 180 },
  { hz: 0, ms: 40 },
  { hz: 770, ms: 180 },
  { hz: 0, ms: 360 },
]

const total = SAMPLE_RATE * SECONDS
const samples = new Int16Array(total)
const fade = Math.round(SAMPLE_RATE * 0.005) // 5 ms in/out, so beeps don't click

let i = 0
while (i < total) {
  for (const { hz, ms } of PATTERN) {
    const length = Math.round((SAMPLE_RATE * ms) / 1000)
    for (let n = 0; n < length && i < total; n++, i++) {
      if (hz === 0) continue // silence (already 0)
      const envelope = Math.min(1, n / fade, (length - n) / fade)
      // A square-ish wave (sine + a bit of its 3rd harmonic) sounds more like an alarm than a pure sine.
      const t = n / SAMPLE_RATE
      const wave = Math.sin(2 * Math.PI * hz * t) + 0.3 * Math.sin(2 * Math.PI * 3 * hz * t)
      samples[i] = Math.round((wave / 1.3) * VOLUME * envelope * 32767)
    }
  }
}

// WAV = a 44-byte header followed by the raw samples.
const dataBytes = samples.length * 2
const header = Buffer.alloc(44)
header.write('RIFF', 0)
header.writeUInt32LE(36 + dataBytes, 4)
header.write('WAVE', 8)
header.write('fmt ', 12)
header.writeUInt32LE(16, 16) // fmt chunk size
header.writeUInt16LE(1, 20) // PCM
header.writeUInt16LE(1, 22) // mono
header.writeUInt32LE(SAMPLE_RATE, 24)
header.writeUInt32LE(SAMPLE_RATE * 2, 28) // bytes per second
header.writeUInt16LE(2, 32) // bytes per sample frame
header.writeUInt16LE(16, 34) // bits per sample
header.write('data', 36)
header.writeUInt32LE(dataBytes, 40)

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'android', 'app', 'src', 'main', 'res', 'raw', 'notme_alarm.wav')
mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, Buffer.concat([header, Buffer.from(samples.buffer)]))
console.log(`Wrote ${out} (${SECONDS} s, ${Math.round((44 + dataBytes) / 1024)} KB)`)

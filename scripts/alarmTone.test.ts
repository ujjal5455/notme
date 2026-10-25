// @vitest-environment node
// The alarm tone made by scripts/make-alarm-tone.mjs (onsite, backlog E1):
// checks the file Android plays is really there and is a 30-second WAV.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const file = new URL('../android/app/src/main/res/raw/notme_alarm.wav', import.meta.url)

describe('notme_alarm.wav', () => {
  it('is a 16-bit mono PCM WAV of about 30 seconds, and not silent', () => {
    const wav = readFileSync(file)
    expect(wav.toString('ascii', 0, 4)).toBe('RIFF')
    expect(wav.toString('ascii', 8, 12)).toBe('WAVE')
    expect(wav.readUInt16LE(20)).toBe(1) // PCM
    expect(wav.readUInt16LE(22)).toBe(1) // mono
    expect(wav.readUInt16LE(34)).toBe(16) // bits per sample
    const seconds = wav.readUInt32LE(40) / wav.readUInt32LE(28)
    expect(seconds).toBeCloseTo(30, 0)
    const loudest = Math.max(...Array.from({ length: 2000 }, (_, k) => Math.abs(wav.readInt16LE(44 + k * 2))))
    expect(loudest).toBeGreaterThan(10_000)
  })
})

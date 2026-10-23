import { afterEach, describe, expect, it, vi } from 'vitest'
import { playAlertSound, resetAlertSoundForTests, unlockAlertSound } from './alertSound'

/** A pretend Web Audio system that starts "suspended", like a real browser before any tap. */
class PretendAudioContext {
  static started: number[] = []
  state: 'suspended' | 'running' = 'suspended'
  currentTime = 10
  destination = {}
  async resume() {
    this.state = 'running'
  }
  createGain() {
    return { gain: { value: 1 }, connect: (next: unknown) => next }
  }
  createOscillator() {
    return {
      frequency: { value: 440 },
      connect: (next: unknown) => next,
      start: (at: number) => PretendAudioContext.started.push(at),
      stop: () => {},
    }
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
  resetAlertSoundForTests()
  PretendAudioContext.started = []
})

describe('alertSound (best effort, never throws)', () => {
  it('with no Web Audio at all (like the test browser): returns false, no error', () => {
    expect(() => unlockAlertSound()).not.toThrow()
    expect(playAlertSound()).toBe(false)
  })

  it('is blocked before any tap, then plays two beeps after a tap unlocked it', async () => {
    vi.stubGlobal('AudioContext', PretendAudioContext)
    expect(playAlertSound()).toBe(false) // never unlocked

    unlockAlertSound() // what the first tap does
    await Promise.resolve() // let resume() finish
    expect(playAlertSound()).toBe(true)
    expect(PretendAudioContext.started).toEqual([10, 10.35])
  })

  it('returns false instead of throwing if the audio system breaks', async () => {
    class BrokenAudioContext extends PretendAudioContext {
      createOscillator(): never {
        throw new Error('audio device unavailable')
      }
    }
    vi.stubGlobal('AudioContext', BrokenAudioContext)
    unlockAlertSound()
    await Promise.resolve()
    expect(playAlertSound()).toBe(false)
  })
})

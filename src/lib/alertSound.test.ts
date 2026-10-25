import { afterEach, describe, expect, it, vi } from 'vitest'
import { playAlertSound, resetAlertSoundForTests, startAlarmLoop, unlockAlertSound } from './alertSound'

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

  it('alarm loop (onsite E2): four beeps now, again every 1.2 s, silent after stop()', async () => {
    vi.useFakeTimers()
    try {
      vi.stubGlobal('AudioContext', PretendAudioContext)
      unlockAlertSound()
      await Promise.resolve() // the app (Capacitor) or a tap lets it run
      const stop = startAlarmLoop(30)
      expect(PretendAudioContext.started).toHaveLength(4)
      vi.advanceTimersByTime(1200)
      expect(PretendAudioContext.started).toHaveLength(8)
      stop()
      vi.advanceTimersByTime(5000)
      expect(PretendAudioContext.started).toHaveLength(8)
    } finally {
      vi.useRealTimers()
    }
  })

  it('alarm loop stops by itself after maxSeconds', async () => {
    vi.useFakeTimers()
    try {
      vi.stubGlobal('AudioContext', PretendAudioContext)
      unlockAlertSound()
      await Promise.resolve()
      startAlarmLoop(3)
      vi.advanceTimersByTime(10_000)
      const afterEnd = PretendAudioContext.started.length
      vi.advanceTimersByTime(10_000)
      expect(PretendAudioContext.started).toHaveLength(afterEnd) // nothing new after 3 s
      expect(afterEnd).toBeLessThanOrEqual(4 * 4) // ring at 0, 1.2, 2.4 (and maybe 3.6 s is cut)
    } finally {
      vi.useRealTimers()
    }
  })

  it('alarm loop with no Web Audio: a harmless stop(), no error', () => {
    const stop = startAlarmLoop()
    expect(() => stop()).not.toThrow()
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

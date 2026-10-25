// Repeating vibration (onsite, backlog E3), with Capacitor and its Haptics plugin faked.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { startVibrationLoop } from './vibration'

const fake = vi.hoisted(() => ({ native: true, vibrate: vi.fn(async (_options: { duration: number }) => {}) }))

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => fake.native } }))
vi.mock('@capacitor/haptics', () => ({ Haptics: { vibrate: fake.vibrate } }))

beforeEach(() => {
  vi.useFakeTimers()
  fake.native = true
  fake.vibrate.mockClear()
})
afterEach(() => vi.useRealTimers())

describe('startVibrationLoop', () => {
  it('buzzes for 1 s now and every 1.5 s, until stop()', () => {
    const stop = startVibrationLoop(30)
    expect(fake.vibrate).toHaveBeenCalledWith({ duration: 1000 })
    vi.advanceTimersByTime(3000)
    expect(fake.vibrate).toHaveBeenCalledTimes(3) // 0, 1.5, 3.0 s
    stop()
    vi.advanceTimersByTime(10_000)
    expect(fake.vibrate).toHaveBeenCalledTimes(3)
  })

  it('stops by itself after maxSeconds', () => {
    startVibrationLoop(3)
    vi.advanceTimersByTime(3000)
    const atEnd = fake.vibrate.mock.calls.length // 0 and 1.5 s (and the 3.0 s buzz if it fires first)
    expect(atEnd).toBeGreaterThanOrEqual(2)
    vi.advanceTimersByTime(60_000)
    expect(fake.vibrate).toHaveBeenCalledTimes(atEnd) // nothing after 3 s
  })

  it('does nothing in a normal browser', () => {
    fake.native = false
    const stop = startVibrationLoop(30)
    vi.advanceTimersByTime(5000)
    expect(fake.vibrate).not.toHaveBeenCalled()
    expect(() => stop()).not.toThrow()
  })

  it('never throws if the phone cannot vibrate', async () => {
    fake.vibrate.mockRejectedValue(new Error('no vibrator'))
    expect(() => startVibrationLoop(30)()).not.toThrow()
    await Promise.resolve()
  })
})

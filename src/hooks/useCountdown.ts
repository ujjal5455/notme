import { useNow } from './useNow'

/**
 * Whole seconds left until `expiresAt`, never below 0.
 * `serverOffsetMs` will correct for a phone whose clock is wrong (Phase 7).
 */
export function useCountdown(expiresAt: string, serverOffsetMs = 0): number {
  const nowMs = useNow(1000)
  const remainingMs = Date.parse(expiresAt) - (nowMs + serverOffsetMs)
  // Round UP so "0.4 s left" still shows 1, not 0 too early.
  return Math.max(0, Math.ceil(remainingMs / 1000))
}

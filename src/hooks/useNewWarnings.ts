import { useEffect, useRef, useState } from 'react'
import { playAlertSound } from '../lib/alertSound'
import { getEffectiveStatus } from '../lib/requestStatus'
import type { MoneyRequest } from '../types/domain'

/** When (server time) a request was rejected or ran out of time, or null if it hasn't. */
function warningMoment(request: MoneyRequest, serverNowMs: number): number | null {
  const status = getEffectiveStatus(request, serverNowMs)
  if (status === 'rejected') return Date.parse(request.respondedAt ?? request.createdAt)
  if (status === 'expired') return Date.parse(request.expiresAt)
  return null
}

/**
 * For the ELDER: requests that turned into a warning (rejected or no reply)
 * while this screen was open, and that they haven't looked at yet. Plays the
 * best-effort beep once for each. Warnings from before the app was opened are
 * not announced again (their badge in the list still says what happened).
 */
export function useNewWarnings(
  requests: MoneyRequest[],
  serverNowMs: number,
  serverOffsetMs: number,
  enabled: boolean,
) {
  // When this screen opened, by the phone's clock. Calculated once.
  const [openedAtMs] = useState(() => Date.now())
  const [seenIds, setSeenIds] = useState<string[]>([])

  const newWarnings = enabled
    ? requests.filter((r) => {
        const moment = warningMoment(r, serverNowMs)
        // Convert the server-time moment to phone time before comparing.
        return moment !== null && moment - serverOffsetMs >= openedAtMs && !seenIds.includes(r.id)
      })
    : []

  // Beep once per new warning. The ref only remembers which ones already beeped.
  const beeped = useRef(new Set<string>())
  const newIds = newWarnings.map((r) => r.id).join(',')
  useEffect(() => {
    if (!newIds) return
    const fresh = newIds.split(',').filter((id) => !beeped.current.has(id))
    if (fresh.length === 0) return
    fresh.forEach((id) => beeped.current.add(id))
    playAlertSound()
  }, [newIds])

  /** Call when the elder opens or leaves a request, so it stops being "new". */
  const markSeen = (id: string) => setSeenIds((ids) => (ids.includes(id) ? ids : [...ids, id]))

  return { newWarnings, markSeen }
}

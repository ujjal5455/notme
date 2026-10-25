import { useState } from 'react'
import { canBeAnswered } from '../lib/requestStatus'
import type { MoneyRequest } from '../types/domain'

/**
 * FAMILY member (onsite, backlog E2): which request, if any, should take over
 * the screen with the red alarm overlay.
 *
 * A request does when it is still waiting for an answer and the family member
 * hasn't acknowledged it yet. Acknowledging = tapping "Open request" or
 * "Stop alarm" on the overlay, opening the request any other way (inbox, or a
 * tap on its notification). Answered or expired requests never show it.
 *
 * Kept in memory only: if Notme is restarted while a request is still waiting,
 * the overlay comes back, which is what an unanswered alert should do.
 */
export function useIncomingAlert(requests: MoneyRequest[], nowMs: number, enabled: boolean) {
  const [acknowledged, setAcknowledged] = useState<ReadonlySet<string>>(() => new Set())

  // requests are newest first, so this is the most recent unanswered alert.
  const alert = enabled
    ? (requests.find((request) => canBeAnswered(request, nowMs) && !acknowledged.has(request.id)) ?? null)
    : null

  function acknowledge(requestId: string) {
    setAcknowledged((previous) => (previous.has(requestId) ? previous : new Set(previous).add(requestId)))
  }

  return { alert, acknowledge }
}

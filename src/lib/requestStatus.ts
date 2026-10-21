import type { MoneyRequest, RequestStatus } from '../types/domain'

/**
 * The status to SHOW right now.
 * A saved "pending" request whose deadline has passed is shown as "expired".
 * An answered request keeps its answer forever, even after the deadline.
 */
export function getEffectiveStatus(request: MoneyRequest, nowMs: number): RequestStatus {
  if (request.status === 'pending' && nowMs >= Date.parse(request.expiresAt)) {
    return 'expired'
  }
  return request.status
}

/** True only while the family member is still allowed to answer. */
export function canBeAnswered(request: MoneyRequest, nowMs: number): boolean {
  return getEffectiveStatus(request, nowMs) === 'pending'
}

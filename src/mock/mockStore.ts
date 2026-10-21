// LOCAL-ONLY "database" rules for Phase 2.
//
// These are pure functions: they take the current list of requests and return
// a NEW list (they never change the old one). App.tsx keeps the list in React
// state. Nothing here leaves this browser tab.
//
// Phase 3 rebuilds the same rules as database functions, where they can be trusted.
import { REQUEST_TIMEOUT_SECONDS } from '../config'
import { getEffectiveStatus } from '../lib/requestStatus'
import type { FamilyDecision, MoneyRequest, NewRequestInput } from '../types/domain'

let localIdCounter = 0

export function createRequest(
  requests: MoneyRequest[],
  input: NewRequestInput,
  link: { elderId: string; familyId: string },
  nowMs: number,
): { requests: MoneyRequest[]; created: MoneyRequest } {
  localIdCounter += 1
  const created: MoneyRequest = {
    id: `local-${localIdCounter}`,
    elderId: link.elderId,
    familyId: link.familyId,
    amountInr: input.amountInr,
    recipient: input.recipient,
    note: input.note,
    status: 'pending', // always starts pending — the elder cannot choose this
    createdAt: new Date(nowMs).toISOString(),
    expiresAt: new Date(nowMs + REQUEST_TIMEOUT_SECONDS * 1000).toISOString(),
    respondedAt: null,
  }
  return { requests: [created, ...requests], created }
}

export type RespondResult = { ok: true; requests: MoneyRequest[] } | { ok: false; error: string }

/**
 * Record a family member's answer. Refuses (and changes nothing) when:
 * the request does not exist, belongs to someone else, was already answered,
 * or has expired. This is the rule the database will enforce in Phase 3.
 */
export function respondToRequest(
  requests: MoneyRequest[],
  requestId: string,
  familyId: string,
  decision: FamilyDecision,
  nowMs: number,
): RespondResult {
  const request = requests.find((r) => r.id === requestId)
  if (!request) {
    return { ok: false, error: 'This request could not be found.' }
  }
  if (request.familyId !== familyId) {
    return { ok: false, error: 'You can only answer requests sent to you.' }
  }
  const status = getEffectiveStatus(request, nowMs)
  if (status === 'expired') {
    return { ok: false, error: 'This request has expired, so it can no longer be answered.' }
  }
  if (status !== 'pending') {
    return { ok: false, error: 'This request has already been answered.' }
  }

  const updated: MoneyRequest = {
    ...request,
    status: decision,
    respondedAt: new Date(nowMs).toISOString(),
  }
  return { ok: true, requests: requests.map((r) => (r.id === requestId ? updated : r)) }
}

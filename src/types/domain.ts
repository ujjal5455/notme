// Shared "shapes" of the data Notme works with.
// Every page and component imports these, so the whole app agrees on one definition.

/** Which kind of account is using the app. */
export type UserRole = 'elder' | 'family'

/**
 * The four states a money request can be SHOWN in.
 * - pending:  waiting for the linked family member to answer
 * - approved: the family member confirmed the request
 *             (this does NOT prove that paying is safe)
 * - rejected: the family member rejected the request
 * - expired:  no answer before the deadline — UNCONFIRMED, not proof of fraud
 */
export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'expired'

/**
 * The status that is actually SAVED. "expired" is never saved: it is worked out
 * from expiresAt (see src/lib/requestStatus.ts), so it can never be out of date.
 */
export type StoredStatus = Exclude<RequestStatus, 'expired'>

/** The two answers a family member can give. */
export type FamilyDecision = 'approved' | 'rejected'

/** A signed-in person. Only synthetic demo names are used in this prototype. */
export interface Profile {
  id: string
  displayName: string
  role: UserRole
}

/**
 * One "I'm being asked for money, please check" alert from an elder to their
 * linked family member. Only the amount is sent: no payee, no note.
 */
export interface MoneyRequest {
  id: string
  elderId: string
  familyId: string
  /** Whole rupees. Integers avoid floating-point rounding bugs (0.1 + 0.2 !== 0.3). */
  amountInr: number
  status: StoredStatus
  /** ISO 8601 timestamps, e.g. "2026-10-21T10:00:00.000Z". */
  createdAt: string
  expiresAt: string
  respondedAt: string | null
  /** When the server rang the family member's phone (onsite, Phase 4); null if not (yet). */
  alertSentAt: string | null
}

/** What the elder sees about the phone alert for one request (onsite, Phase 4). */
export type AlertState = 'sending' | 'sent' | 'no_device' | 'failed'

/** What the elder's form produces after validation — the only part the elder controls. */
export interface NewRequestInput {
  amountInr: number
}

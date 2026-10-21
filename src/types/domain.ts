// Shared "shapes" of the data Flod works with.
// Every page and component imports these, so the whole app agrees on one definition.

/** Which kind of account is using the app. */
export type UserRole = 'elder' | 'family'

/**
 * The four states a money request can be SHOWN in.
 * - pending:  waiting for the linked family member to answer
 * - approved: the family member confirmed these exact details
 *             (this does NOT prove the recipient is safe)
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

/** One "please confirm before I pay" request from an elder to their linked family member. */
export interface MoneyRequest {
  id: string
  elderId: string
  familyId: string
  /** Whole rupees. Integers avoid floating-point rounding bugs (0.1 + 0.2 !== 0.3). */
  amountInr: number
  /** Intended recipient name or UPI ID, exactly as the elder typed it. */
  recipient: string
  note: string | null
  status: StoredStatus
  /** ISO 8601 timestamps, e.g. "2026-10-21T10:00:00.000Z". */
  createdAt: string
  expiresAt: string
  respondedAt: string | null
}

/** What the elder's form produces after validation — the parts the elder controls. */
export interface NewRequestInput {
  amountInr: number
  recipient: string
  note: string | null
}

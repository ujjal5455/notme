// Shared "shapes" of the data Notme works with.
// Every page and component imports these, so the whole app agrees on one definition.

/** Which kind of account is using the app. */
export type UserRole = 'elder' | 'family'

/**
 * The four states a money request can be shown in.
 * - pending:  waiting for the linked family member to answer
 * - approved: the family member confirmed these exact details
 *             (this does NOT prove the recipient is safe)
 * - rejected: the family member said they did not make this request
 * - expired:  no answer before the deadline — UNCONFIRMED, not proof of fraud
 *
 * Plan note: the database (Phase 3) will store only pending/approved/rejected;
 * "expired" will be worked out from expiresAt. The UI still needs all four.
 */
export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'expired'

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
  status: RequestStatus
  /** ISO 8601 timestamps, e.g. "2026-10-21T10:00:00.000Z". */
  createdAt: string
  expiresAt: string
  respondedAt: string | null
}

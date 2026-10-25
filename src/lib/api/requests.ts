import type { FamilyDecision, MoneyRequest, NewRequestInput, StoredStatus } from '../../types/domain'
import { supabase } from '../supabaseClient'
import { friendlyMessage } from './errors'

/** A money_requests row exactly as the database returns it (snake_case). */
export interface MoneyRequestRow {
  id: string
  elder_id: string
  family_id: string
  amount_inr: number
  status: StoredStatus
  created_at: string
  expires_at: string
  responded_at: string | null
  /** Added by 0008 (onsite); missing on rows from older code paths. */
  alert_sent_at?: string | null
}

export function toMoneyRequest(row: MoneyRequestRow): MoneyRequest {
  return {
    id: row.id,
    elderId: row.elder_id,
    familyId: row.family_id,
    amountInr: row.amount_inr,
    status: row.status,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    respondedAt: row.responded_at,
    alertSentAt: row.alert_sent_at ?? null,
  }
}

/**
 * Elder: ask the server to ring the linked family member's phone (onsite,
 * Phase 4). Only the request id is sent; the send-alert Edge Function checks
 * that the caller is this request's elder and finds the receiver itself.
 * Returns 'sent' (Firebase accepted it, or it was already sent) or
 * 'no_device' (the family member hasn't turned alerts on). Throws if the
 * alert could not be sent, so the screen can offer "Try again".
 */
export async function sendAlert(requestId: string): Promise<'sent' | 'no_device'> {
  const { data, error } = await supabase.functions.invoke('send-alert', { body: { request_id: requestId } })
  if (error) throw new Error('The alert could not be sent.')
  const result = data as { sent?: number; reason?: string } | null
  if (result?.reason === 'no_device') return 'no_device'
  if ((result?.sent ?? 0) > 0 || result?.reason === 'already_sent') return 'sent'
  throw new Error('The alert could not be sent.')
}

/**
 * Elder: create a request. Only what the elder chose (the amount) is sent,
 * plus the demo timeout. The database decides who receives it (from
 * family_links), the status (pending) and every timestamp (its own clock).
 */
export async function createMoneyRequest(
  input: NewRequestInput,
  timeoutSeconds: number,
): Promise<MoneyRequest> {
  const { data, error } = await supabase.rpc('create_money_request', {
    p_amount_inr: input.amountInr,
    p_timeout_seconds: timeoutSeconds,
  })
  if (error) throw new Error(friendlyMessage(error.message))
  return toMoneyRequest(data)
}

/**
 * Elder or family member: every request this account may see, newest first.
 * No filter is needed: Row Level Security only returns requests where the
 * caller is the elder who made it or the family member it was sent to.
 */
export async function listMyRequests(): Promise<MoneyRequest[]> {
  const { data, error } = await supabase
    .from('money_requests')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw new Error(friendlyMessage(error.message))
  return data.map(toMoneyRequest)
}

/**
 * Family member: approve or reject one request. The database changes it only if
 * it is still pending, not expired, and sent to the caller; otherwise it raises
 * "already answered", "expired" or "Request not found."
 */
export async function respondToRequest(
  requestId: string,
  decision: FamilyDecision,
): Promise<MoneyRequest> {
  const { data, error } = await supabase.rpc('respond_to_request', {
    p_request_id: requestId,
    p_decision: decision,
  })
  if (error) throw new Error(friendlyMessage(error.message))
  return toMoneyRequest(data)
}

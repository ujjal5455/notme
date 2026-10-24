// What the browser SENDS to the database. Security rule: the browser only sends
// what the person chose. Who they are (auth.uid()), who receives a request
// (family_links), the status and every time are decided by the database.
// (That the database really enforces this is proven by supabase/checks/rls_checks.sql.)
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { redeemPairingCode, createPairingCode } from './pairing'
import { createMyProfile } from './profile'
import { createMoneyRequest, listMyRequests, respondToRequest } from './requests'

const row = {
  id: 'req-1',
  elder_id: 'elder-1',
  family_id: 'family-1',
  amount_inr: 2500,
  status: 'pending',
  created_at: '2026-10-23T10:00:00.000Z',
  expires_at: '2026-10-23T10:01:00.000Z',
  responded_at: null,
}

const rpc = vi.fn()
const select = vi.fn()
vi.mock('../supabaseClient', () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpc(...args),
    from: (table: string) => ({ select: (columns: string) => select(table, columns) }),
  },
}))

beforeEach(() => {
  rpc.mockReset()
  select.mockReset()
})

describe('what the browser sends', () => {
  it('create request: only the amount and the timeout', async () => {
    rpc.mockResolvedValue({ data: row, error: null })
    await createMoneyRequest({ amountInr: 2500 }, 60)
    expect(rpc).toHaveBeenCalledWith('create_money_request', {
      p_amount_inr: 2500,
      p_timeout_seconds: 60,
    })
  })

  it('answer: only the request id and the decision', async () => {
    rpc.mockResolvedValue({ data: { ...row, status: 'rejected' }, error: null })
    await respondToRequest('req-1', 'rejected')
    expect(rpc).toHaveBeenCalledWith('respond_to_request', { p_request_id: 'req-1', p_decision: 'rejected' })
  })

  it('choose role: only the role and name, never a user id', async () => {
    rpc.mockResolvedValue({ data: { id: 'u1', role: 'elder', display_name: 'Asha (demo)' }, error: null })
    await createMyProfile('elder', 'Asha (demo)')
    expect(rpc).toHaveBeenCalledWith('create_my_profile', { p_role: 'elder', p_display_name: 'Asha (demo)' })
  })

  it('pairing: the elder sends nothing; the family member sends only the code', async () => {
    rpc.mockResolvedValue({ data: { code: 'P38SP4XS', expires_at: row.expires_at }, error: null })
    await createPairingCode()
    expect(rpc).toHaveBeenLastCalledWith('create_pairing_code')

    rpc.mockResolvedValue({ data: {}, error: null })
    await redeemPairingCode('p38s-p4xs')
    expect(rpc).toHaveBeenLastCalledWith('redeem_pairing_code', { p_code: 'p38s-p4xs' })
  })

  it('list requests: no user filter is sent (Row Level Security decides)', async () => {
    const order = vi.fn().mockResolvedValue({ data: [row], error: null })
    select.mockReturnValue({ order })
    const requests = await listMyRequests()
    expect(select).toHaveBeenCalledWith('money_requests', '*')
    expect(order).toHaveBeenCalledWith('created_at', { ascending: false })
    expect(requests[0]).toMatchObject({ elderId: 'elder-1', familyId: 'family-1', amountInr: 2500 })
  })
})

describe('what the browser does with refusals', () => {
  it("throws the database's own message, unchanged", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'This request has already been answered.' } })
    await expect(respondToRequest('req-1', 'approved')).rejects.toThrow('This request has already been answered.')
  })

  it('turns a network failure into a clear next step', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'TypeError: Failed to fetch' } })
    await expect(createMoneyRequest({ amountInr: 1 }, 60)).rejects.toThrow(
      'Could not connect. Check your internet connection and try again.',
    )
  })
})

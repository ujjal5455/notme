import { describe, expect, it } from 'vitest'
import type { MoneyRequest } from '../types/domain'
import { mergeLoaded, newerOf, upsertRequest } from './requestList'

function request(id: string, createdAt: string, status: MoneyRequest['status'] = 'pending'): MoneyRequest {
  return {
    id,
    elderId: 'elder-1',
    familyId: 'family-1',
    amountInr: 100,
    status,
    createdAt,
    expiresAt: '2026-10-23T10:01:00.000Z',
    respondedAt: status === 'pending' ? null : '2026-10-23T10:00:30.000Z',
    alertSentAt: null,
  }
}

const r1 = request('r1', '2026-10-23T10:00:00.000Z')
const r2 = request('r2', '2026-10-23T10:05:00.000Z')

describe('newerOf', () => {
  it('takes the incoming copy normally', () => {
    expect(newerOf(r1, { ...r1, status: 'rejected' }).status).toBe('rejected')
    expect(newerOf(undefined, r1)).toBe(r1)
  })

  it('never lets an old "pending" copy undo a known answer', () => {
    const answered = { ...r1, status: 'approved' as const }
    expect(newerOf(answered, r1)).toBe(answered)
  })
})

describe('upsertRequest', () => {
  it('adds a new request at the top (newest first)', () => {
    expect(upsertRequest([r1], r2).map((r) => r.id)).toEqual(['r2', 'r1'])
  })

  it('replaces an existing request without duplicating it, and does not change the old array', () => {
    const list = [r2, r1]
    const result = upsertRequest(list, { ...r1, status: 'rejected' })
    expect(result.map((r) => `${r.id}:${r.status}`)).toEqual(['r2:pending', 'r1:rejected'])
    expect(list[1].status).toBe('pending')
  })
})

describe('mergeLoaded', () => {
  it('uses the loaded list as the truth, but keeps answers it already knows about', () => {
    const previous = [{ ...r1, status: 'rejected' as const }]
    const loaded = [r1, r2] // a slow poll that started before the answer was saved
    expect(mergeLoaded(previous, loaded).map((r) => `${r.id}:${r.status}`)).toEqual([
      'r2:pending',
      'r1:rejected',
    ])
  })
})

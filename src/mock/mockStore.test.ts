import { describe, expect, it } from 'vitest'
import { REQUEST_TIMEOUT_SECONDS } from '../config'
import { createRequest, respondToRequest } from './mockStore'

const link = { elderId: 'elder-1', familyId: 'family-1' }
const input = { amountInr: 2500, recipient: 'shop@demo-upi', note: null }
const t0 = Date.parse('2026-10-21T10:00:00.000Z')

function oneRequest() {
  return createRequest([], input, link, t0)
}

describe('createRequest', () => {
  it('adds a pending request with a deadline, without changing the old list', () => {
    const before: never[] = []
    const { requests, created } = createRequest(before, input, link, t0)
    expect(before).toHaveLength(0) // original list untouched
    expect(requests).toEqual([created])
    expect(created.status).toBe('pending')
    expect(created.familyId).toBe('family-1')
    expect(Date.parse(created.expiresAt) - t0).toBe(REQUEST_TIMEOUT_SECONDS * 1000)
  })
})

describe('respondToRequest', () => {
  it('records an approval from the linked family member', () => {
    const { requests, created } = oneRequest()
    const result = respondToRequest(requests, created.id, 'family-1', 'approved', t0 + 5_000)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.requests[0].status).toBe('approved')
      expect(result.requests[0].respondedAt).not.toBeNull()
    }
  })

  it('refuses a second answer (no duplicate or changed responses)', () => {
    const { requests, created } = oneRequest()
    const first = respondToRequest(requests, created.id, 'family-1', 'rejected', t0 + 5_000)
    if (!first.ok) throw new Error('first answer should work')
    const second = respondToRequest(first.requests, created.id, 'family-1', 'approved', t0 + 6_000)
    expect(second).toEqual({ ok: false, error: expect.stringMatching(/already been answered/i) })
  })

  it('refuses a late answer after the deadline', () => {
    const { requests, created } = oneRequest()
    const late = t0 + REQUEST_TIMEOUT_SECONDS * 1000
    const result = respondToRequest(requests, created.id, 'family-1', 'approved', late)
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/expired/i) })
  })

  it('refuses an answer from someone the request was not sent to', () => {
    const { requests, created } = oneRequest()
    const result = respondToRequest(requests, created.id, 'stranger-9', 'approved', t0 + 5_000)
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/only answer requests sent to you/i) })
  })

  it('refuses an unknown request id', () => {
    const result = respondToRequest([], 'nope', 'family-1', 'approved', t0)
    expect(result.ok).toBe(false)
  })
})

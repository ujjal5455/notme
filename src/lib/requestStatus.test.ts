import { describe, expect, it } from 'vitest'
import type { MoneyRequest } from '../types/domain'
import { canBeAnswered, getEffectiveStatus } from './requestStatus'

const deadline = Date.parse('2026-10-21T10:01:00.000Z')

function makeRequest(overrides: Partial<MoneyRequest> = {}): MoneyRequest {
  return {
    id: 'r1',
    elderId: 'e1',
    familyId: 'f1',
    amountInr: 500,
    recipient: 'shop@demo-upi',
    note: null,
    status: 'pending',
    createdAt: '2026-10-21T10:00:00.000Z',
    expiresAt: '2026-10-21T10:01:00.000Z',
    respondedAt: null,
    ...overrides,
  }
}

describe('getEffectiveStatus', () => {
  it('is pending before the deadline', () => {
    expect(getEffectiveStatus(makeRequest(), deadline - 1)).toBe('pending')
  })

  it('becomes expired exactly at the deadline', () => {
    expect(getEffectiveStatus(makeRequest(), deadline)).toBe('expired')
  })

  it('keeps an answer after the deadline (an approval never "expires" back)', () => {
    expect(getEffectiveStatus(makeRequest({ status: 'approved' }), deadline + 60_000)).toBe(
      'approved',
    )
    expect(getEffectiveStatus(makeRequest({ status: 'rejected' }), deadline + 60_000)).toBe(
      'rejected',
    )
  })
})

describe('canBeAnswered', () => {
  it('is true only while pending', () => {
    expect(canBeAnswered(makeRequest(), deadline - 1)).toBe(true)
    expect(canBeAnswered(makeRequest(), deadline)).toBe(false)
    expect(canBeAnswered(makeRequest({ status: 'approved' }), deadline - 1)).toBe(false)
  })
})

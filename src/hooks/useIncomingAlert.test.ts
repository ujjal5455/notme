import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { MoneyRequest } from '../types/domain'
import { useIncomingAlert } from './useIncomingAlert'

const now = Date.parse('2026-10-25T12:00:00.000Z')

function request(id: string, fields: Partial<MoneyRequest> = {}): MoneyRequest {
  return {
    id,
    elderId: 'elder-1',
    familyId: 'family-1',
    amountInr: 2500,
    status: 'pending',
    createdAt: '2026-10-25T11:59:50.000Z',
    expiresAt: '2026-10-25T12:00:50.000Z', // 50 s left
    respondedAt: null,
    alertSentAt: null,
    ...fields,
  }
}

describe('useIncomingAlert (family alarm overlay)', () => {
  it('picks the newest request that is still waiting', () => {
    const requests = [request('new'), request('older')] // newest first, as the app keeps them
    const { result } = renderHook(() => useIncomingAlert(requests, now, true))
    expect(result.current.alert?.id).toBe('new')
  })

  it('never alarms for answered or expired requests', () => {
    const requests = [
      request('answered', { status: 'rejected', respondedAt: '2026-10-25T11:59:55.000Z' }),
      request('expired', { expiresAt: '2026-10-25T11:59:59.000Z' }),
    ]
    const { result } = renderHook(() => useIncomingAlert(requests, now, true))
    expect(result.current.alert).toBeNull()
  })

  it('once acknowledged, moves on to the next waiting request, then none', () => {
    const requests = [request('new'), request('older')]
    const { result } = renderHook(() => useIncomingAlert(requests, now, true))
    act(() => result.current.acknowledge('new'))
    expect(result.current.alert?.id).toBe('older')
    act(() => result.current.acknowledge('older'))
    expect(result.current.alert).toBeNull()
  })

  it('is off for the elder', () => {
    const { result } = renderHook(() => useIncomingAlert([request('new')], now, false))
    expect(result.current.alert).toBeNull()
  })
})

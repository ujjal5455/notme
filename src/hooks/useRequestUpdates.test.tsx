import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fake } from '../test/fakeSupabase'
import type { MoneyRequest } from '../types/domain'
import { useRequestUpdates } from './useRequestUpdates'

vi.mock('../lib/supabaseClient', async () => ({
  supabase: (await import('../test/fakeSupabase')).fake.supabase,
}))
// Poll every 20 ms instead of 4 s, so the fallback can be watched quickly.
vi.mock('../config', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../config')>()),
  POLL_INTERVAL_MS: 20,
}))

beforeEach(async () => {
  fake.reset()
  await fake.createPairedAccounts()
  await fake.signInAs('elder1@example.com')
})

function setup() {
  const onChange = vi.fn<(request: MoneyRequest) => void>()
  const onPoll = vi.fn(async () => {})
  const hook = renderHook(() => useRequestUpdates('user-1', onChange, onPoll))
  return { onChange, onPoll, ...hook }
}

describe('useRequestUpdates', () => {
  it('goes live, catches up once, and passes on each change it hears', async () => {
    const { result, onChange, onPoll } = setup()
    expect(result.current.status).toBe('connecting')
    await waitFor(() => expect(result.current.status).toBe('live'))
    expect(onPoll).toHaveBeenCalledTimes(1) // the catch-up

    await fake.supabase.rpc('create_money_request', { p_amount_inr: 700, p_recipient: 'shop@demo-upi' })
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange.mock.calls[0][0]).toMatchObject({ amountInr: 700, status: 'pending' }) // camelCase
  })

  it('falls back to polling, admits being offline, and recovers', async () => {
    fake.state.realtime = 'fail'
    const { result, onPoll } = setup()
    await waitFor(() => expect(result.current.status).toBe('polling'))
    await waitFor(() => expect(onPoll.mock.calls.length).toBeGreaterThanOrEqual(2))

    onPoll.mockRejectedValue(new Error('Could not connect.'))
    await waitFor(() => expect(result.current.status).toBe('offline'))

    onPoll.mockResolvedValue(undefined)
    await waitFor(() => expect(result.current.status).toBe('polling'))
  })

  it('recovers from "offline" by itself even while live updates are connected', async () => {
    const onChange = vi.fn()
    const onPoll = vi.fn(async () => {})
    onPoll.mockRejectedValueOnce(new Error('Could not connect.')) // the catch-up fails
    const seen: string[] = [] // every status, because "offline" only lasts one 20 ms poll here
    const { result } = renderHook(() => {
      const value = useRequestUpdates('user-1', onChange, onPoll)
      seen.push(value.status)
      return value
    })
    await waitFor(() => expect(seen).toContain('offline'))
    await waitFor(() => expect(result.current.status).toBe('live')) // a later poll succeeded
  })

  it('switches to polling when a live connection drops, and back when it returns', async () => {
    const { result } = setup()
    await waitFor(() => expect(result.current.status).toBe('live'))
    fake.setChannelStatus('CHANNEL_ERROR')
    await waitFor(() => expect(result.current.status).toBe('polling'))
    fake.setChannelStatus('SUBSCRIBED')
    await waitFor(() => expect(result.current.status).toBe('live'))
  })

  it('leaves nothing running after the screen closes', async () => {
    fake.state.realtime = 'fail'
    const { result, onPoll, unmount } = setup()
    await waitFor(() => expect(result.current.status).toBe('polling'))
    unmount()
    const callsAtUnmount = onPoll.mock.calls.length
    await new Promise((resolve) => setTimeout(resolve, 100)) // 5 poll intervals
    expect(onPoll.mock.calls.length).toBe(callsAtUnmount)
    expect(fake.openChannelCount()).toBe(0)
  })
})

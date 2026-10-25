// Push notifications with the plugin wrapper (src/lib/push.ts) and the token API
// replaced by fakes: no phone or Firebase needed.
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PushHandlers, PushPermission } from '../lib/push'
import { usePushNotifications } from './usePushNotifications'

const fakePush = vi.hoisted(() => ({
  supported: true,
  permission: 'granted' as PushPermission,
  afterRequest: 'granted' as PushPermission,
  handlers: null as PushHandlers | null,
  stop: vi.fn(async () => {}),
}))

vi.mock('../lib/push', () => ({
  pushSupported: () => fakePush.supported,
  createAlertChannel: vi.fn(async () => {}),
  getPushPermission: vi.fn(async () => fakePush.permission),
  requestPushPermission: vi.fn(async () => fakePush.afterRequest),
  startPush: vi.fn(async (handlers: PushHandlers) => {
    fakePush.handlers = handlers
    return fakePush.stop
  }),
}))

const api = vi.hoisted(() => ({
  registerPushToken: vi.fn(async (_token: string) => {}),
  unregisterPushToken: vi.fn(async (_token: string) => {}),
}))
vi.mock('../lib/api/pushTokens', () => api)

beforeEach(() => {
  fakePush.supported = true
  fakePush.permission = 'granted'
  fakePush.afterRequest = 'granted'
  fakePush.handlers = null
  fakePush.stop.mockClear()
  api.registerPushToken.mockReset().mockResolvedValue(undefined)
  api.unregisterPushToken.mockReset().mockResolvedValue(undefined)
})

/** Wait until the hook has started listening, i.e. permission was granted. */
async function started() {
  await waitFor(() => expect(fakePush.handlers).not.toBeNull())
  return fakePush.handlers as PushHandlers
}

describe('usePushNotifications', () => {
  it('does nothing for an elder or in a browser', async () => {
    const elder = renderHook(() => usePushNotifications(false, () => {}))
    fakePush.supported = false
    const browser = renderHook(() => usePushNotifications(true, () => {}))
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(elder.result.current.permission).toBe('unsupported')
    expect(browser.result.current.permission).toBe('unsupported')
    expect(fakePush.handlers).toBeNull()
  })

  it('already allowed: saves the device token in Supabase', async () => {
    const { result } = renderHook(() => usePushNotifications(true, () => {}))
    const handlers = await started()
    expect(result.current.permission).toBe('granted')
    act(() => handlers.onToken('fcm-token-1'))
    await waitFor(() => expect(api.registerPushToken).toHaveBeenCalledWith('fcm-token-1'))
  })

  it('never asks by itself; "Turn on alerts" asks, then starts', async () => {
    fakePush.permission = 'prompt'
    const { result } = renderHook(() => usePushNotifications(true, () => {}))
    await waitFor(() => expect(result.current.permission).toBe('prompt'))
    expect(fakePush.handlers).toBeNull()

    await act(() => result.current.turnOn())
    expect(result.current.permission).toBe('granted')
    await started()
  })

  it('refused: stays off and does not start', async () => {
    fakePush.permission = 'prompt'
    fakePush.afterRequest = 'denied'
    const { result } = renderHook(() => usePushNotifications(true, () => {}))
    await waitFor(() => expect(result.current.permission).toBe('prompt'))
    await act(() => result.current.turnOn())
    expect(result.current.permission).toBe('denied')
    expect(fakePush.handlers).toBeNull()
  })

  it('tapping an alert opens that request with the newest callback', async () => {
    const first = vi.fn()
    const second = vi.fn()
    const { rerender } = renderHook(({ open }) => usePushNotifications(true, open), {
      initialProps: { open: first },
    })
    const handlers = await started()
    rerender({ open: second })
    act(() => handlers.onOpenRequest('req-42'))
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledWith('req-42')
  })

  it('shows a clear message when the token cannot be saved', async () => {
    api.registerPushToken.mockRejectedValue(new Error('Could not connect.'))
    const { result } = renderHook(() => usePushNotifications(true, () => {}))
    const handlers = await started()
    act(() => handlers.onToken('fcm-token-1'))
    await waitFor(() => expect(result.current.error).toBe('Alerts are not set up yet: Could not connect.'))
  })

  it('before sign-out, removes this phone token; a failure does not block sign-out', async () => {
    const { result } = renderHook(() => usePushNotifications(true, () => {}))
    const handlers = await started()
    act(() => handlers.onToken('fcm-token-1'))
    await act(() => result.current.forgetDevice())
    expect(api.unregisterPushToken).toHaveBeenCalledWith('fcm-token-1')

    act(() => handlers.onToken('fcm-token-2'))
    api.unregisterPushToken.mockRejectedValue(new Error('offline'))
    await expect(act(() => result.current.forgetDevice())).resolves.toBeUndefined()
  })

  it('stops listening when the screen goes away', async () => {
    const { unmount } = renderHook(() => usePushNotifications(true, () => {}))
    await started()
    unmount()
    await waitFor(() => expect(fakePush.stop).toHaveBeenCalledTimes(1))
  })
})

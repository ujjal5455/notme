// The elder's quick button, with the plugin wrapper (src/lib/quickAccess.ts) faked.
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PushPermission } from '../lib/push'
import { useQuickAccess } from './useQuickAccess'

const fake = vi.hoisted(() => ({
  supported: true,
  permission: 'granted' as PushPermission,
  afterRequest: 'granted' as PushPermission,
  onTap: null as null | (() => void),
  show: vi.fn(async (_familyName: string) => {}),
  hide: vi.fn(async () => {}),
  stop: vi.fn(async () => {}),
}))

vi.mock('../lib/quickAccess', () => ({
  quickAccessSupported: () => fake.supported,
  getQuickAccessPermission: vi.fn(async () => fake.permission),
  requestQuickAccessPermission: vi.fn(async () => fake.afterRequest),
  showQuickAccess: fake.show,
  hideQuickAccess: fake.hide,
  onQuickAccessTap: vi.fn(async (onTap: () => void) => {
    fake.onTap = onTap
    return fake.stop
  }),
}))

beforeEach(() => {
  fake.supported = true
  fake.permission = 'granted'
  fake.afterRequest = 'granted'
  fake.onTap = null
  fake.show.mockReset().mockResolvedValue(undefined)
  fake.hide.mockReset().mockResolvedValue(undefined)
  fake.stop.mockClear()
})

describe('useQuickAccess', () => {
  it('does nothing for a family member or in a browser', async () => {
    const family = renderHook(() => useQuickAccess(false, 'Ravi', () => {}))
    fake.supported = false
    const browser = renderHook(() => useQuickAccess(true, 'Ravi', () => {}))
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(family.result.current.permission).toBe('unsupported')
    expect(browser.result.current.permission).toBe('unsupported')
    expect(fake.show).not.toHaveBeenCalled()
  })

  it('already allowed: puts the button back every time the app opens', async () => {
    renderHook(() => useQuickAccess(true, 'Ravi (demo)', () => {}))
    await waitFor(() => expect(fake.show).toHaveBeenCalledWith('Ravi (demo)'))
  })

  it('never asks by itself; "Add the quick button" asks, then shows it', async () => {
    fake.permission = 'prompt'
    const { result } = renderHook(() => useQuickAccess(true, 'Ravi', () => {}))
    await waitFor(() => expect(result.current.permission).toBe('prompt'))
    expect(fake.show).not.toHaveBeenCalled()
    await act(() => result.current.turnOn())
    await waitFor(() => expect(fake.show).toHaveBeenCalledTimes(1))
  })

  it('tapping the button opens "Send a money alert" (newest callback)', async () => {
    const first = vi.fn()
    const second = vi.fn()
    const { rerender } = renderHook(({ open }) => useQuickAccess(true, 'Ravi', open), {
      initialProps: { open: first },
    })
    await waitFor(() => expect(fake.onTap).not.toBeNull())
    rerender({ open: second })
    act(() => fake.onTap?.())
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
  })

  it('shows an error if the button cannot be added, and remove() never throws', async () => {
    fake.show.mockRejectedValue(new Error('boom'))
    const { result } = renderHook(() => useQuickAccess(true, 'Ravi', () => {}))
    await waitFor(() => expect(result.current.error).toBe('The quick button could not be added.'))
    fake.hide.mockRejectedValue(new Error('offline'))
    await expect(act(() => result.current.remove())).resolves.toBeUndefined()
    expect(fake.hide).toHaveBeenCalledTimes(1)
  })

  it('stops listening for taps when the screen goes away', async () => {
    const { unmount } = renderHook(() => useQuickAccess(true, 'Ravi', () => {}))
    await waitFor(() => expect(fake.onTap).not.toBeNull())
    unmount()
    await waitFor(() => expect(fake.stop).toHaveBeenCalledTimes(1))
  })
})

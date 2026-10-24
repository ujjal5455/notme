// The Android Back button, with Capacitor's App plugin replaced by a fake:
// we can "press Back" by calling the listener the hook registered.
import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useBackButton } from './useBackButton'

const plugin = vi.hoisted(() => ({
  native: true,
  listener: null as null | (() => void),
  remove: vi.fn(),
  minimizeApp: vi.fn(async () => {}),
}))

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => plugin.native },
}))
vi.mock('@capacitor/app', () => ({
  App: {
    addListener: vi.fn(async (_event: string, fn: () => void) => {
      plugin.listener = fn
      return { remove: plugin.remove }
    }),
    minimizeApp: plugin.minimizeApp,
  },
}))

/** Wait for the (async) listener registration, then press Back. */
async function pressBack() {
  await vi.waitFor(() => expect(plugin.listener).not.toBeNull())
  plugin.listener?.()
}

beforeEach(() => {
  plugin.native = true
  plugin.listener = null
  plugin.remove.mockClear()
  plugin.minimizeApp.mockClear()
})

describe('useBackButton', () => {
  it('lets the screen handle Back (e.g. go home) and does not minimise', async () => {
    const onBack = vi.fn(() => true)
    renderHook(() => useBackButton(onBack))
    await pressBack()
    expect(onBack).toHaveBeenCalledTimes(1)
    expect(plugin.minimizeApp).not.toHaveBeenCalled()
  })

  it('minimises the app when already on the home screen', async () => {
    renderHook(() => useBackButton(() => false))
    await pressBack()
    expect(plugin.minimizeApp).toHaveBeenCalledTimes(1)
  })

  it('always uses the newest handler (the current screen)', async () => {
    const first = vi.fn(() => true)
    const second = vi.fn(() => true)
    const { rerender } = renderHook(({ onBack }) => useBackButton(onBack), { initialProps: { onBack: first } })
    rerender({ onBack: second })
    await pressBack()
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
  })

  it('removes the listener when the screen goes away', async () => {
    const { unmount } = renderHook(() => useBackButton(() => true))
    await vi.waitFor(() => expect(plugin.listener).not.toBeNull())
    unmount()
    await vi.waitFor(() => expect(plugin.remove).toHaveBeenCalledTimes(1))
  })

  it('does nothing in a normal browser', async () => {
    plugin.native = false
    renderHook(() => useBackButton(() => true))
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(plugin.listener).toBeNull()
  })
})

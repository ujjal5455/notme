import { useEffect, useRef, useState } from 'react'
import type { PushPermission } from '../lib/push'
import {
  getQuickAccessPermission,
  hideQuickAccess,
  onQuickAccessTap,
  quickAccessSupported,
  requestQuickAccessPermission,
  showQuickAccess,
} from '../lib/quickAccess'

/**
 * The ELDER's quick button in the notification shade (onsite, backlog E4 a).
 *
 * - Never asks for permission by itself: QuickAccessBanner explains first,
 *   then the elder taps "Add the quick button".
 * - Once allowed, the button is put back every time Notme opens (newer
 *   Android versions let people swipe it away).
 * - Tapping it calls `onOpen` (SignedInApp opens "Send a money alert").
 * - Before sign-out, `remove()` takes it away.
 *
 * `enabled` is false for family members and in a normal browser.
 */
export function useQuickAccess(enabled: boolean, familyName: string, onOpen: () => void) {
  const [permission, setPermission] = useState<PushPermission>('unsupported')
  const [error, setError] = useState<string | null>(null)

  const latestOnOpen = useRef(onOpen)
  useEffect(() => {
    latestOnOpen.current = onOpen
  })

  const active = enabled && quickAccessSupported()

  // Current permission, and listen for taps on the quick button.
  useEffect(() => {
    if (!active) return
    let cancelled = false
    let stop: (() => Promise<void>) | null = null
    getQuickAccessPermission()
      .then((current) => {
        if (!cancelled) setPermission(current)
      })
      .catch(() => {
        if (!cancelled) setError('Could not check notification settings.')
      })
    onQuickAccessTap(() => latestOnOpen.current())
      .then((stopListening) => {
        if (cancelled) void stopListening()
        else stop = stopListening
      })
      .catch(() => {})
    return () => {
      cancelled = true
      if (stop) void stop()
    }
  }, [active])

  // Allowed: (re)show the button.
  useEffect(() => {
    if (!active || permission !== 'granted') return
    showQuickAccess(familyName)
      .then(() => setError(null))
      .catch(() => setError('The quick button could not be added.'))
  }, [active, permission, familyName])

  async function turnOn() {
    try {
      setPermission(await requestQuickAccessPermission())
    } catch {
      setError('Could not ask for permission.')
    }
  }

  /** Before sign-out. Never blocks it. */
  async function remove() {
    if (!active) return
    try {
      await hideQuickAccess()
    } catch {
      // Ignored: signing out matters more.
    }
  }

  return { permission: active ? permission : 'unsupported', error, turnOn, remove }
}

import { useEffect, useRef, useState } from 'react'
import { registerPushToken, unregisterPushToken } from '../lib/api/pushTokens'
import {
  createAlertChannel,
  getPushPermission,
  pushSupported,
  requestPushPermission,
  startPush,
  type PushPermission,
} from '../lib/push'

/**
 * Push notifications for a FAMILY member's phone (onsite, Phase 3).
 *
 * 1. On start: create the loud "money-alerts" channel and read the permission.
 *    Nothing is asked automatically: the person taps "Turn on alerts" after
 *    reading why (NotificationsBanner).
 * 2. Once allowed: listen for taps, get the device token and save it in
 *    Supabase (register_push_token), so the server can ring this phone.
 * 3. Before sign-out: forgetDevice() removes the token, so a signed-out phone
 *    stops getting alerts.
 *
 * `enabled` is false for elders and in a normal browser, so nothing happens.
 */
export function usePushNotifications(
  enabled: boolean,
  onOpenRequest: (requestId: string) => void,
  onReceived?: () => void,
) {
  const [permission, setPermission] = useState<PushPermission>('unsupported')
  const [error, setError] = useState<string | null>(null)
  const token = useRef<string | null>(null)

  // Always use the newest callbacks (they know the current screen and data).
  const latestOnOpen = useRef(onOpenRequest)
  const latestOnReceived = useRef(onReceived)
  useEffect(() => {
    latestOnOpen.current = onOpenRequest
    latestOnReceived.current = onReceived
  })

  const active = enabled && pushSupported()

  // 1. Channel + current permission.
  useEffect(() => {
    if (!active) return
    let cancelled = false
    void (async () => {
      try {
        await createAlertChannel()
        const current = await getPushPermission()
        if (!cancelled) setPermission(current)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not check alert settings.')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [active])

  // 2. Allowed: listen, register, save the token.
  useEffect(() => {
    if (!active || permission !== 'granted') return
    let cancelled = false
    let stop: (() => Promise<void>) | null = null
    startPush({
      onToken: (value) => {
        token.current = value
        registerPushToken(value)
          .then(() => setError(null))
          .catch((e: unknown) =>
            setError(`Alerts are not set up yet: ${e instanceof Error ? e.message : 'could not save this phone.'}`),
          )
      },
      onError: (message) => setError(`Alerts are not set up yet: ${message}`),
      onOpenRequest: (requestId) => latestOnOpen.current(requestId),
      onReceived: () => latestOnReceived.current?.(),
    })
      .then((stopListening) => {
        if (cancelled) void stopListening()
        else stop = stopListening
      })
      .catch((e: unknown) =>
        setError(`Alerts are not set up yet: ${e instanceof Error ? e.message : 'could not start.'}`),
      )
    return () => {
      cancelled = true
      if (stop) void stop()
    }
  }, [active, permission])

  /** Shows Android's permission dialog. Call from a button tap, after explaining why. */
  async function turnOn() {
    try {
      setPermission(await requestPushPermission())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not ask for permission.')
    }
  }

  /** Before signing out. Never blocks sign-out: if it fails (offline), the next account to sign in here takes the token over. */
  async function forgetDevice() {
    if (!token.current) return
    try {
      await unregisterPushToken(token.current)
    } catch {
      // Ignored on purpose: see above.
    }
    token.current = null
  }

  return { permission: active ? permission : 'unsupported', error, turnOn, forgetDevice }
}

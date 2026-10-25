// A thin wrapper around Capacitor's push-notification plugin (onsite, Phase 3).
// Keeping every plugin call in one small file makes the rest of the app easy
// to read and lets tests replace this file with a fake.
//
// How push works: Firebase Cloud Messaging (FCM) gives this phone a "device
// token" (its address for notifications). We save it in Supabase. In Phase 4
// a server-side function sends an alert to that address, and Android shows it
// even when Notme is closed.
import { Capacitor } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'

/** Same id as default_notification_channel_id in android/app/src/main/res/values/strings.xml. */
export const ALERT_CHANNEL_ID = 'money-alerts'

/** 'unsupported' = a normal browser (no push there); the others are Android's answer. */
export type PushPermission = 'unsupported' | 'prompt' | 'granted' | 'denied'

export function pushSupported(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('PushNotifications')
}

function toPermission(receive: string): PushPermission {
  if (receive === 'granted') return 'granted'
  if (receive === 'denied') return 'denied'
  return 'prompt' // 'prompt' or 'prompt-with-rationale': we may still ask
}

/** Reports the current permission without asking anything. */
export async function getPushPermission(): Promise<PushPermission> {
  if (!pushSupported()) return 'unsupported'
  const { receive } = await PushNotifications.checkPermissions()
  return toPermission(receive)
}

/** Shows Android's "Allow Notme to send you notifications?" dialog (Android 13+). */
export async function requestPushPermission(): Promise<PushPermission> {
  if (!pushSupported()) return 'unsupported'
  const { receive } = await PushNotifications.requestPermissions()
  return toPermission(receive)
}

/**
 * The loud channel money alerts use (Android 8+). Importance 5 = sound and a
 * banner over other apps. Safe to call at every start: if the person changed
 * the channel's settings on their phone, Android keeps their choice.
 */
export async function createAlertChannel(): Promise<void> {
  await PushNotifications.createChannel({
    id: ALERT_CHANNEL_ID,
    name: 'Money alerts',
    description: 'When the elder you are linked with is asked to send money',
    importance: 5,
    visibility: 1, // shown on the lock screen: an alert is urgent
    vibration: true,
  })
}

export interface PushHandlers {
  /** FCM gave this phone its device token (again on every start; it can change). */
  onToken: (token: string) => void
  onError: (message: string) => void
  /** The person tapped an alert that names a request. */
  onOpenRequest: (requestId: string) => void
}

/** Starts listening, then asks FCM for the device token. Returns a function that stops listening. */
export async function startPush(handlers: PushHandlers): Promise<() => Promise<void>> {
  const listeners = await Promise.all([
    PushNotifications.addListener('registration', (token) => handlers.onToken(token.value)),
    PushNotifications.addListener('registrationError', (error) => handlers.onError(error.error)),
    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      const requestId: unknown = action.notification.data?.request_id
      if (typeof requestId === 'string' && requestId !== '') handlers.onOpenRequest(requestId)
    }),
  ])
  await PushNotifications.register()
  return async () => {
    await Promise.all(listeners.map((listener) => listener.remove()))
  }
}

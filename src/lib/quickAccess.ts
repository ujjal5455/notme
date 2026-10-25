// The elder's quick button during a scam call (onsite, backlog E4 option a).
// A quiet notification that stays in the pull-down shade: "Money call? Tap
// here first." The shade can be pulled down over the phone-call screen, so the
// elder can open Notme without hanging up or hunting for the app icon.
//
// Uses Capacitor's official Local Notifications plugin (no server, no push).
// Like src/lib/push.ts, every plugin call lives in this one small file.
import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import type { PushPermission } from './push'

/** Quiet channel: shows in the shade, no sound, no pop-up. */
export const QUICK_CHANNEL_ID = 'quick-check'
/** One fixed id, so showing it again replaces it instead of adding a second one. */
export const QUICK_NOTIFICATION_ID = 7001
const QUICK_KIND = 'quick-check'

export function quickAccessSupported(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('LocalNotifications')
}

function toPermission(display: string): PushPermission {
  if (display === 'granted') return 'granted'
  if (display === 'denied') return 'denied'
  return 'prompt'
}

export async function getQuickAccessPermission(): Promise<PushPermission> {
  if (!quickAccessSupported()) return 'unsupported'
  const { display } = await LocalNotifications.checkPermissions()
  return toPermission(display)
}

/** Android's "Allow Notme to send you notifications?" dialog. Call from a tap. */
export async function requestQuickAccessPermission(): Promise<PushPermission> {
  if (!quickAccessSupported()) return 'unsupported'
  const { display } = await LocalNotifications.requestPermissions()
  return toPermission(display)
}

/** Puts (or puts back) the quick button in the notification shade. */
export async function showQuickAccess(familyName: string): Promise<void> {
  // The plugin's docs: a notification on a channel that doesn't exist never shows.
  await LocalNotifications.createChannel({
    id: QUICK_CHANNEL_ID,
    name: 'Quick check button',
    description: 'Keeps a Notme button in your notifications for money calls',
    importance: 2, // low: no sound, no pop-up, still in the shade
    visibility: 1,
  })
  await LocalNotifications.schedule({
    notifications: [
      {
        id: QUICK_NOTIFICATION_ID,
        title: 'Money call? Tap here first.',
        body: `Check with ${familyName} in Notme before you pay anyone.`,
        channelId: QUICK_CHANNEL_ID,
        ongoing: true, // can't be swiped away on most Android versions
        autoCancel: false, // stays after a tap
        extra: { kind: QUICK_KIND },
      },
    ],
  })
}

export async function hideQuickAccess(): Promise<void> {
  await LocalNotifications.cancel({ notifications: [{ id: QUICK_NOTIFICATION_ID }] })
}

/** Calls `onTap` when the elder taps the quick button. Returns a function that stops listening. */
export async function onQuickAccessTap(onTap: () => void): Promise<() => Promise<void>> {
  const listener = await LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
    if (action.notification.extra?.kind === QUICK_KIND) onTap()
  })
  return () => listener.remove()
}

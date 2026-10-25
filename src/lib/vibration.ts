// Repeating vibration while the family member's alarm overlay shows (onsite,
// backlog E3): 1 second buzz, ½ second pause, for up to `maxSeconds`.
// Uses Capacitor's official Haptics plugin in the Android app; in a browser
// it does nothing. Like the beep, it is best effort and never throws: the
// red overlay is the warning that is always shown.
import { Capacitor } from '@capacitor/core'
import { Haptics } from '@capacitor/haptics'

const BUZZ_MS = 1000
const EVERY_MS = 1500

export function startVibrationLoop(maxSeconds = 30): () => void {
  if (!Capacitor.isNativePlatform()) return () => {}
  const buzz = () => {
    Haptics.vibrate({ duration: BUZZ_MS }).catch(() => {})
  }
  buzz()
  const timer = setInterval(buzz, EVERY_MS)
  const end = setTimeout(() => clearInterval(timer), maxSeconds * 1000)
  return () => {
    clearInterval(timer)
    clearTimeout(end)
  }
}

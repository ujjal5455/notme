import type { PushPermission } from '../lib/push'

interface QuickAccessBannerProps {
  permission: PushPermission
  error: string | null
  familyName: string
  onTurnOn: () => void
}

/**
 * For the ELDER on Android (onsite, backlog E4 a): explains the quick button
 * and adds it when they tap. Never blocks the app.
 */
export function QuickAccessBanner({ permission, error, familyName, onTurnOn }: QuickAccessBannerProps) {
  if (permission === 'unsupported') return null

  if (permission === 'prompt') {
    return (
      <div className="notice" role="status">
        <p>
          <strong>Add a quick button for money calls.</strong> Notme can keep a button in your
          notifications. If someone calls asking for money, pull down from the top of the screen and
          tap it to check with {familyName}, without hanging up.
        </p>
        <button type="button" className="button-primary" onClick={onTurnOn}>
          Add the quick button
        </button>
      </div>
    )
  }

  if (permission === 'denied') {
    return (
      <p className="notice" role="status">
        <strong>The quick button is off.</strong> To add it: phone{' '}
        <strong>Settings → Apps → Notme → Notifications</strong> → allow.
      </p>
    )
  }

  return error ? (
    <p className="field-error" role="alert">
      {error}
    </p>
  ) : null
}

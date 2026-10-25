import type { PushPermission } from '../lib/push'

interface NotificationsBannerProps {
  permission: PushPermission
  error: string | null
  elderName: string
  onTurnOn: () => void
}

/**
 * For the FAMILY member on Android (onsite, Phase 3): explains why alerts
 * matter and lets them turn alerts on. Never blocks the app: without alerts,
 * requests still appear while Notme is open.
 */
export function NotificationsBanner({ permission, error, elderName, onTurnOn }: NotificationsBannerProps) {
  if (permission === 'unsupported') return null

  if (permission === 'prompt') {
    return (
      <div className="notice" role="status">
        <p>
          <strong>Turn on alerts.</strong> When {elderName} is asked for money, your phone will ring
          with an alert, even when Notme is closed.
        </p>
        <button type="button" className="button-primary" onClick={onTurnOn}>
          Turn on alerts
        </button>
      </div>
    )
  }

  if (permission === 'denied') {
    return (
      <p className="notice" role="status">
        <strong>Alerts are off.</strong> You will only see {elderName}&apos;s requests while Notme is
        open. To turn alerts on: phone <strong>Settings → Apps → Notme → Notifications</strong> →
        allow.
      </p>
    )
  }

  // Granted: say nothing unless setting up failed.
  return error ? (
    <p className="field-error" role="alert">
      {error}
    </p>
  ) : null
}

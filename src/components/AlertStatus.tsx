import type { AlertState } from '../types/domain'

interface AlertStatusProps {
  state: AlertState | undefined
  familyName: string
  onRetry: () => void
}

/**
 * What the ELDER sees about the phone alert (onsite, Phase 4). "Sent" means
 * Firebase accepted it, not that the family member has seen it, so the
 * waiting banner above still says "Do not pay yet". When it may not have
 * reached them, the next step is a phone call, plus a way to try again.
 */
export function AlertStatus({ state, familyName, onRetry }: AlertStatusProps) {
  if (!state) return null

  if (state === 'sending' || state === 'sent') {
    return (
      <p className="alert-status" role="status">
        {state === 'sending' ? `Alerting ${familyName}'s phone…` : `Alert sent to ${familyName}'s phone.`}
      </p>
    )
  }

  const problem =
    state === 'no_device'
      ? `${familyName} hasn't turned on Notme alerts on their phone, so it won't ring.`
      : `The alert may not have reached ${familyName}'s phone.`
  return (
    <div className="alert-status alert-status-problem" role="alert">
      <p>
        {problem} <strong>Call them now on a number you already trust.</strong>
      </p>
      <button type="button" className="button-secondary" onClick={onRetry}>
        Try again
      </button>
    </div>
  )
}

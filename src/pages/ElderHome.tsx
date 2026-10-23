import { RequestCard } from '../components/RequestCard'
import { formatInr } from '../lib/format'
import type { MoneyRequest, Profile } from '../types/domain'

interface ElderHomeProps {
  elder: Profile
  familyMember: Profile | undefined
  requests: MoneyRequest[]
  /** Requests that were rejected or ran out of time while the app was open, not yet opened. */
  newWarnings: MoneyRequest[]
  nowMs: number
  onCreateRequest: () => void
  onOpenRequest: (requestId: string) => void
  onRefresh: () => void
}

export function ElderHome({
  elder,
  familyMember,
  requests,
  newWarnings,
  nowMs,
  onCreateRequest,
  onOpenRequest,
  onRefresh,
}: ElderHomeProps) {
  return (
    <section aria-labelledby="elder-home-title">
      {newWarnings.length > 0 && (
        <div className="warning" role="alert">
          {/* One paragraph, like WarningPanel, so the sentence reads as a whole. */}
          <p>
            <strong className="warning-title">Pause.</strong>{' '}
            {newWarnings.length === 1
              ? `Your ${formatInr(newWarnings[0].amountInr)} request has not been confirmed.`
              : `${newWarnings.length} of your requests have not been confirmed.`}{' '}
            Do not pay. Contact your family member using a number you already trust.
          </p>
          {newWarnings.map((request) => (
            <button key={request.id} type="button" onClick={() => onOpenRequest(request.id)}>
              Open the {formatInr(request.amountInr)} request
            </button>
          ))}
        </div>
      )}

      <h1 id="elder-home-title">Hello, {elder.displayName}</h1>
      <p>
        Someone asking you for money urgently? Before you pay, ask{' '}
        <strong>{familyMember?.displayName ?? 'your family member'}</strong> to confirm it.
      </p>

      <button type="button" className="button-primary" onClick={onCreateRequest}>
        Check a money request
      </button>

      <h2>Your requests</h2>
      {requests.length === 0 ? (
        <p className="empty-state">You have not sent any requests yet.</p>
      ) : (
        <ul className="request-list">
          {requests.map((request) => (
            <li key={request.id}>
              <RequestCard request={request} nowMs={nowMs} onOpen={onOpenRequest} />
            </li>
          ))}
        </ul>
      )}

      <button type="button" className="button-secondary" onClick={onRefresh}>
        Refresh
      </button>
    </section>
  )
}

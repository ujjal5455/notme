import { StatusBadge } from '../components/StatusBadge'
import { formatDateTime, formatInr } from '../lib/format'
import type { MoneyRequest, Profile, UserRole } from '../types/domain'

interface RequestDetailProps {
  request: MoneyRequest | undefined
  elder: Profile | undefined
  familyMember: Profile | undefined
  viewerRole: UserRole
  onBack: () => void
}

export function RequestDetail({
  request,
  elder,
  familyMember,
  viewerRole,
  onBack,
}: RequestDetailProps) {
  if (!request) {
    return (
      <section>
        <h1>Request not found</h1>
        <button type="button" className="button-secondary" onClick={onBack}>
          Back
        </button>
      </section>
    )
  }

  const needsWarning = request.status === 'rejected' || request.status === 'expired'

  return (
    <section aria-labelledby="detail-title">
      <h1 id="detail-title">{formatInr(request.amountInr)}</h1>
      <StatusBadge status={request.status} />

      {needsWarning && viewerRole === 'elder' && (
        // Phase 2 turns this into a reusable WarningPanel; Phase 7 adds sound.
        <div className="warning" role="alert">
          <p className="warning-title">Pause. Do not pay yet.</p>
          <p>
            This request has not been confirmed. Contact your family member using a number you
            already trust.
          </p>
        </div>
      )}

      {request.status === 'approved' && (
        <p className="notice">
          Your linked family member confirmed these details. This does not prove the recipient is
          safe.
        </p>
      )}

      <dl className="details">
        <dt>Recipient</dt>
        <dd>{request.recipient}</dd>
        <dt>What they were told</dt>
        <dd>{request.note ?? 'No note'}</dd>
        <dt>From</dt>
        <dd>{elder?.displayName ?? 'Unknown'}</dd>
        <dt>Sent to</dt>
        <dd>{familyMember?.displayName ?? 'Unknown'}</dd>
        <dt>Sent at</dt>
        <dd>{formatDateTime(request.createdAt)}</dd>
        <dt>Answer needed by</dt>
        <dd>{formatDateTime(request.expiresAt)}</dd>
      </dl>

      {viewerRole === 'family' && request.status === 'pending' && (
        <p className="notice">Confirm and Reject buttons are added in Phase 2.</p>
      )}

      <button type="button" className="button-secondary" onClick={onBack}>
        Back
      </button>
    </section>
  )
}

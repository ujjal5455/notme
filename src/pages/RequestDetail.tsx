import { FamilyResponse } from '../components/FamilyResponse'
import { StatusBadge } from '../components/StatusBadge'
import { StatusBanner } from '../components/StatusBanner'
import { formatDateTime, formatInr } from '../lib/format'
import { getEffectiveStatus } from '../lib/requestStatus'
import type { FamilyDecision, MoneyRequest, Profile, UserRole } from '../types/domain'

interface RequestDetailProps {
  request: MoneyRequest | undefined
  elder: Profile | undefined
  familyMember: Profile | undefined
  viewerRole: UserRole
  nowMs: number
  onRespond: (requestId: string, decision: FamilyDecision) => string | null
  onBack: () => void
}

export function RequestDetail({
  request,
  elder,
  familyMember,
  viewerRole,
  nowMs,
  onRespond,
  onBack,
}: RequestDetailProps) {
  if (!request) {
    return (
      <section>
        <h1>Request not found</h1>
        <p className="empty-state">
          It may have been created in another browser tab. In this local demo, requests are not
          shared between tabs or devices.
        </p>
        <button type="button" className="button-secondary" onClick={onBack}>
          Back
        </button>
      </section>
    )
  }

  const status = getEffectiveStatus(request, nowMs)
  const elderName = elder?.displayName ?? 'The elder'
  const familyName = familyMember?.displayName ?? 'your family member'

  return (
    <section aria-labelledby="detail-title">
      <h1 id="detail-title">{formatInr(request.amountInr)}</h1>
      <p className="detail-recipient">
        to <strong>{request.recipient}</strong>
      </p>
      <StatusBadge status={status} />

      {viewerRole === 'elder' ? (
        <StatusBanner status={status} familyName={familyName} />
      ) : (
        <FamilyResponse
          status={status}
          elderName={elderName}
          onRespond={(decision) => onRespond(request.id, decision)}
        />
      )}

      <dl className="details">
        <dt>What they were told</dt>
        <dd>{request.note ?? 'No note'}</dd>
        <dt>From</dt>
        <dd>{elderName}</dd>
        <dt>Sent to</dt>
        <dd>{familyMember?.displayName ?? 'Unknown'}</dd>
        <dt>Sent at</dt>
        <dd>{formatDateTime(request.createdAt)}</dd>
        <dt>Answer needed by</dt>
        <dd>{formatDateTime(request.expiresAt)}</dd>
        {request.respondedAt && (
          <>
            <dt>Answered at</dt>
            <dd>{formatDateTime(request.respondedAt)}</dd>
          </>
        )}
      </dl>

      <button type="button" className="button-secondary" onClick={onBack}>
        Back
      </button>
    </section>
  )
}

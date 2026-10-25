import { AlertStatus } from '../components/AlertStatus'
import { FamilyResponse } from '../components/FamilyResponse'
import { StatusBadge } from '../components/StatusBadge'
import { StatusBanner } from '../components/StatusBanner'
import { TimeLeft } from '../components/TimeLeft'
import { formatDateTime, formatInr } from '../lib/format'
import { getEffectiveStatus } from '../lib/requestStatus'
import type { AlertState, FamilyDecision, MoneyRequest, Profile, UserRole } from '../types/domain'

interface RequestDetailProps {
  request: MoneyRequest | undefined
  elder: Profile | undefined
  familyMember: Profile | undefined
  viewerRole: UserRole
  nowMs: number
  /** Elder only: how the phone alert went (onsite, Phase 4). */
  alert?: AlertState
  onRetryAlert?: () => void
  onRespond: (requestId: string, decision: FamilyDecision) => Promise<void>
  onBack: () => void
}

export function RequestDetail({
  request,
  elder,
  familyMember,
  viewerRole,
  nowMs,
  alert,
  onRetryAlert,
  onRespond,
  onBack,
}: RequestDetailProps) {
  if (!request) {
    return (
      <section>
        <h1>Request not found</h1>
        <p className="empty-state">
          It may not have loaded yet, or it is not one of your requests. Go back and tap{' '}
          <strong>Refresh</strong>.
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
      <p className="detail-subtitle">
        {viewerRole === 'family'
          ? `${elderName} is being asked to pay this amount.`
          : 'The amount you are being asked to pay.'}
      </p>
      <StatusBadge status={status} />
      {status === 'pending' && (
        <TimeLeft
          expiresAt={request.expiresAt}
          nowMs={nowMs}
          label={viewerRole === 'family' ? 'Time left to answer' : `Time left for ${familyName} to answer`}
        />
      )}

      {viewerRole === 'elder' ? (
        <>
          <StatusBanner status={status} familyName={familyName} />
          {status === 'pending' && (
            <AlertStatus state={alert} familyName={familyName} onRetry={() => onRetryAlert?.()} />
          )}
        </>
      ) : (
        <FamilyResponse
          status={status}
          elderName={elderName}
          onRespond={(decision) => onRespond(request.id, decision)}
        />
      )}

      <dl className="details">
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

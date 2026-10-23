import { RequestCard } from '../components/RequestCard'
import type { MoneyRequest, Profile } from '../types/domain'

interface ElderHomeProps {
  elder: Profile
  familyMember: Profile | undefined
  requests: MoneyRequest[]
  nowMs: number
  onCreateRequest: () => void
  onOpenRequest: (requestId: string) => void
  onRefresh: () => void
}

export function ElderHome({
  elder,
  familyMember,
  requests,
  nowMs,
  onCreateRequest,
  onOpenRequest,
  onRefresh,
}: ElderHomeProps) {
  return (
    <section aria-labelledby="elder-home-title">
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

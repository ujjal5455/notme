import { RequestCard } from '../components/RequestCard'
import { canBeAnswered } from '../lib/requestStatus'
import type { MoneyRequest, Profile } from '../types/domain'

interface FamilyInboxProps {
  familyMember: Profile
  requests: MoneyRequest[]
  nowMs: number
  onOpenRequest: (requestId: string) => void
}

export function FamilyInbox({ familyMember, requests, nowMs, onOpenRequest }: FamilyInboxProps) {
  const waiting = requests.filter((request) => canBeAnswered(request, nowMs))
  const earlier = requests.filter((request) => !canBeAnswered(request, nowMs))

  return (
    <section aria-labelledby="inbox-title">
      <h1 id="inbox-title">Requests to confirm</h1>
      <p>
        Signed in as <strong>{familyMember.displayName}</strong>. Only requests from your linked
        family member appear here.
      </p>

      <h2>Waiting for your answer</h2>
      {waiting.length === 0 ? (
        <p className="empty-state">Nothing is waiting for you right now.</p>
      ) : (
        <ul className="request-list">
          {waiting.map((request) => (
            <li key={request.id}>
              <RequestCard request={request} nowMs={nowMs} onOpen={onOpenRequest} />
            </li>
          ))}
        </ul>
      )}

      {earlier.length > 0 && (
        <>
          <h2>Earlier requests</h2>
          <ul className="request-list">
            {earlier.map((request) => (
              <li key={request.id}>
                <RequestCard request={request} nowMs={nowMs} onOpen={onOpenRequest} />
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

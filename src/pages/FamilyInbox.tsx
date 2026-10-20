import { RequestCard } from '../components/RequestCard'
import type { MoneyRequest, Profile } from '../types/domain'

interface FamilyInboxProps {
  familyMember: Profile
  requests: MoneyRequest[]
  onOpenRequest: (requestId: string) => void
}

export function FamilyInbox({ familyMember, requests, onOpenRequest }: FamilyInboxProps) {
  return (
    <section aria-labelledby="inbox-title">
      <h1 id="inbox-title">Requests to confirm</h1>
      <p>
        Signed in as <strong>{familyMember.displayName}</strong>. Only requests from your linked
        family member appear here.
      </p>

      {requests.length === 0 ? (
        <p className="empty-state">No requests right now.</p>
      ) : (
        <ul className="request-list">
          {requests.map((request) => (
            <li key={request.id}>
              <RequestCard request={request} onOpen={onOpenRequest} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

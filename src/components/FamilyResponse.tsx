import { useState } from 'react'
import type { FamilyDecision, RequestStatus } from '../types/domain'

interface FamilyResponseProps {
  status: RequestStatus
  elderName: string
  /** Returns an error message if the answer was refused, or null if it was saved. */
  onRespond: (decision: FamilyDecision) => string | null
}

/** What the FAMILY MEMBER sees: Confirm/Reject while pending, otherwise the outcome. */
export function FamilyResponse({ status, elderName, onRespond }: FamilyResponseProps) {
  const [error, setError] = useState<string | null>(null)

  function answer(decision: FamilyDecision) {
    setError(onRespond(decision))
  }

  if (status === 'pending') {
    return (
      <div className="family-response">
        <h2>Is this request genuine?</h2>
        <p>
          Only confirm if you know about this payment and the amount and recipient are exactly
          right.
        </p>
        <button type="button" className="button-primary" onClick={() => answer('approved')}>
          Confirm request
        </button>
        <button type="button" className="button-danger" onClick={() => answer('rejected')}>
          Reject request
        </button>
        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}
      </div>
    )
  }

  const outcome: Record<Exclude<RequestStatus, 'pending'>, string> = {
    approved: `You confirmed this request. ${elderName} can see your answer.`,
    rejected: `You rejected this request. ${elderName} is shown a warning not to pay.`,
    expired: `This request expired before it was answered, so it can no longer be confirmed. ${elderName} is shown an "unconfirmed" warning. Consider calling them on a number they know.`,
  }

  return (
    <div className="family-response">
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
      <p className="notice">{outcome[status]}</p>
    </div>
  )
}

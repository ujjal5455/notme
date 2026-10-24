import { useEffect, useRef, useState } from 'react'
import type { FamilyDecision, RequestStatus } from '../types/domain'

interface FamilyResponseProps {
  status: RequestStatus
  elderName: string
  /** Saves the answer. Throws the database's message if it was refused. */
  onRespond: (decision: FamilyDecision) => Promise<void>
}

/** What the FAMILY MEMBER sees: Confirm/Reject while pending, otherwise the outcome. */
export function FamilyResponse({ status, elderName, onRespond }: FamilyResponseProps) {
  const [sending, setSending] = useState<FamilyDecision | null>(null)
  const [error, setError] = useState<string | null>(null)

  // When the buttons disappear (answered, or time ran out), move keyboard and
  // screen-reader focus to the outcome, instead of losing it to the top of the page.
  const outcomeRef = useRef<HTMLDivElement>(null)
  const previousStatus = useRef(status)
  useEffect(() => {
    if (previousStatus.current === 'pending' && status !== 'pending') outcomeRef.current?.focus()
    previousStatus.current = status
  }, [status])

  async function answer(decision: FamilyDecision) {
    if (sending) return // a double tap must not send twice
    setSending(decision)
    setError(null)
    try {
      await onRespond(decision)
      // Nothing else to do: the saved request comes back with its new status,
      // so this component redraws with the outcome below.
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.')
    } finally {
      setSending(null)
    }
  }

  if (status === 'pending') {
    return (
      <div className="family-response">
        <h2>Is this request genuine?</h2>
        <p>
          Before you answer, call {elderName} on a number you already trust. Only confirm if you
          know about this payment and the amount is exactly right.
        </p>
        <button
          type="button"
          className="button-primary"
          disabled={sending !== null}
          onClick={() => answer('approved')}
        >
          {sending === 'approved' ? 'Sending…' : 'Confirm request'}
        </button>
        <button
          type="button"
          className="button-danger"
          disabled={sending !== null}
          onClick={() => answer('rejected')}
        >
          {sending === 'rejected' ? 'Sending…' : 'Reject request'}
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
    <div className="family-response" ref={outcomeRef} tabIndex={-1}>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
      <p className="notice" role="status">
        {outcome[status]}
      </p>
    </div>
  )
}

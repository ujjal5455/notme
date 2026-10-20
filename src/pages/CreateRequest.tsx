import { useState, type FormEvent } from 'react'
import type { Profile } from '../types/domain'

interface CreateRequestProps {
  familyMember: Profile | undefined
  onCancel: () => void
}

/**
 * Phase 1: layout only. The form does not send anything yet.
 * Phase 2 adds controlled inputs, validation and a mock "send".
 */
export function CreateRequest({ familyMember, onCancel }: CreateRequestProps) {
  const [showScaffoldNotice, setShowScaffoldNotice] = useState(false)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault() // stop the browser from reloading the page
    setShowScaffoldNotice(true)
  }

  return (
    <section aria-labelledby="create-title">
      <h1 id="create-title">Check a money request</h1>
      <p>
        Enter exactly what you are being asked to pay.{' '}
        {familyMember?.displayName ?? 'Your family member'} will see these details and confirm or
        reject them.
      </p>

      <form className="form" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="amount">Amount in rupees (₹)</label>
          <input id="amount" name="amount" inputMode="numeric" autoComplete="off" />
        </div>

        <div className="field">
          <label htmlFor="recipient">Who are you paying? (UPI ID or name)</label>
          <input id="recipient" name="recipient" autoComplete="off" />
        </div>

        <div className="field">
          <label htmlFor="note">
            What did they tell you? <span className="optional">(optional)</span>
          </label>
          <textarea id="note" name="note" rows={3} />
        </div>

        <button type="submit" className="button-primary">
          Send to family to confirm
        </button>
        <button type="button" className="button-secondary" onClick={onCancel}>
          Cancel
        </button>
      </form>

      {showScaffoldNotice && (
        <p className="notice" role="status">
          Not connected yet: sending is added in Phase 2. Nothing was sent.
        </p>
      )}
    </section>
  )
}

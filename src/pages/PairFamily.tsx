import { type FormEvent, useState } from 'react'
import { redeemPairingCode } from '../lib/api/pairing'

interface PairFamilyProps {
  /** Called after the code was accepted, so the app can reload the account. */
  onLinked: () => void
}

/** Family member: type the code the elder shows you in person. */
export function PairFamily({ onLinked }: PairFamilyProps) {
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)
    // Same clean-up the database does: keep only letters and numbers.
    if (code.replace(/[^A-Za-z0-9]/g, '').length !== 8) {
      setErrorMessage('The code has 8 letters and numbers, like P38S-P4XS.')
      return
    }

    setBusy(true)
    try {
      await redeemPairingCode(code)
      onLinked()
    } catch (error) {
      // The database's messages (not valid / already used / expired) are written for people.
      setErrorMessage(error instanceof Error ? error.message : 'Could not link. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section aria-labelledby="pair-family-title">
      <h1 id="pair-family-title">Link with your elder</h1>
      <p>
        Ask your elder to open Flod and tap <strong>Show a pairing code</strong>. Type the code you
        see on their screen while you are together.
      </p>
      <p className="notice">
        Never accept a code read out on a phone call or sent in a message. Someone may be pretending
        to be your family.
      </p>

      <form className="form" onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="pairing-code">Pairing code (8 letters and numbers)</label>
          <input
            id="pairing-code"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            maxLength={12}
            aria-invalid={errorMessage ? true : undefined}
            aria-describedby={errorMessage ? 'pairing-error' : undefined}
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </div>

        {errorMessage && (
          <p id="pairing-error" className="field-error" role="alert">
            {errorMessage}
          </p>
        )}

        <button type="submit" className="button-primary" disabled={busy}>
          {busy ? 'Linking…' : 'Link'}
        </button>
      </form>
    </section>
  )
}

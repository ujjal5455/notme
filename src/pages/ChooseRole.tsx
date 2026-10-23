import { type FormEvent, useState } from 'react'
import { createMyProfile } from '../lib/api/profile'
import type { UserRole } from '../types/domain'

interface ChooseRoleProps {
  /** Called after the profile is saved, so the app can reload the account. */
  onChosen: () => void
}

/** First visit after sign-up: choose elder or family member, once, and a display name. */
export function ChooseRole({ onChosen }: ChooseRoleProps) {
  const [role, setRole] = useState<UserRole | null>(null)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)
    // Quick checks here for a friendly message; the database checks the same rules again.
    if (!role) {
      setErrorMessage('Choose who will use this phone.')
      return
    }
    if (!name.trim()) {
      setErrorMessage('Enter a name your family member will recognise.')
      return
    }

    setBusy(true)
    try {
      await createMyProfile(role, name)
      onChosen()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section aria-labelledby="role-title">
      <h1 id="role-title">Who will use this phone?</h1>
      <p className="notice">
        You choose this once. <strong>It cannot be changed later.</strong>
      </p>

      <form className="form" onSubmit={handleSubmit} noValidate>
        <fieldset className="choice-group">
          <legend>I am…</legend>
          <label className="choice">
            <input
              type="radio"
              name="role"
              value="elder"
              checked={role === 'elder'}
              onChange={() => setRole('elder')}
            />
            <span>
              <strong>The elder</strong> — I want my family to confirm money requests before I pay.
            </span>
          </label>
          <label className="choice">
            <input
              type="radio"
              name="role"
              value="family"
              checked={role === 'family'}
              onChange={() => setRole('family')}
            />
            <span>
              <strong>A family member</strong> — I will confirm or reject requests from my elder.
            </span>
          </label>
        </fieldset>

        <div className="field">
          <label htmlFor="display-name">Your name</label>
          <p id="name-hint" className="field-hint">
            Shown to your family member. Demo: use a made-up name, e.g. "Asha (demo)".
          </p>
          <input
            id="display-name"
            maxLength={40}
            autoComplete="off"
            aria-describedby="name-hint"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {errorMessage && (
          <p className="field-error" role="alert">
            {errorMessage}
          </p>
        )}

        <button type="submit" className="button-primary" disabled={busy}>
          {busy ? 'Saving…' : 'Continue'}
        </button>
      </form>
    </section>
  )
}

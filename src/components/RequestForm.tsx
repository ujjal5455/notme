import { useState, type FormEvent } from 'react'
import { validateRequestForm, type RequestFormErrors, type RequestFormValues } from '../lib/validation'
import type { NewRequestInput } from '../types/domain'

const EMPTY_VALUES: RequestFormValues = { amount: '' }

interface RequestFormProps {
  /** Saves the request. If it throws, the form shows the error message and keeps what was typed. */
  onSubmit: (input: NewRequestInput) => Promise<void> | void
  onCancel: () => void
}

/**
 * The elder's alert form: ONE field, the amount. A panicking person should
 * have as little as possible to type. The input is "controlled": React state
 * holds the text, and the input only shows what the state says.
 */
export function RequestForm({ onSubmit, onCancel }: RequestFormProps) {
  const [values, setValues] = useState<RequestFormValues>(EMPTY_VALUES)
  const [errors, setErrors] = useState<RequestFormErrors>({})
  const [busy, setBusy] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  function updateAmount(value: string) {
    setValues({ amount: value })
    // Hide the old error as soon as the person starts fixing it.
    setErrors({})
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault() // stop the browser from reloading the page
    if (busy) return // a double tap must not send twice
    setSubmitError(null)
    const result = validateRequestForm(values)
    if (!result.ok) {
      setErrors(result.errors)
      // Move keyboard/screen-reader focus to the field that needs fixing.
      document.getElementById('amount')?.focus()
      return
    }

    setBusy(true)
    try {
      await onSubmit(result.data)
    } catch (error) {
      // e.g. "Could not connect…" or the database's "Link a family member before sending a request."
      setSubmitError(error instanceof Error ? error.message : 'Could not send. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      <div className="field">
        <label htmlFor="amount">Amount in rupees (₹)</label>
        <p id="amount-hint" className="field-hint">
          Whole rupees, for example 25000
        </p>
        <input
          id="amount"
          name="amount"
          className="amount-input"
          inputMode="numeric"
          autoComplete="off"
          value={values.amount}
          onChange={(event) => updateAmount(event.target.value)}
          aria-invalid={errors.amount ? true : undefined}
          aria-describedby={errors.amount ? 'amount-hint amount-error' : 'amount-hint'}
        />
        {errors.amount && (
          <p id="amount-error" className="field-error">
            {errors.amount}
          </p>
        )}
      </div>

      {submitError && (
        <p className="field-error" role="alert">
          {submitError}
        </p>
      )}

      <button type="submit" className="button-primary" disabled={busy}>
        {busy ? 'Sending…' : 'Send alert to family'}
      </button>
      <button type="button" className="button-secondary" onClick={onCancel}>
        Cancel
      </button>
    </form>
  )
}

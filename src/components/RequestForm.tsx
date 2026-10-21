import { useState, type FormEvent } from 'react'
import {
  NOTE_MAX_LENGTH,
  validateRequestForm,
  type RequestFormErrors,
  type RequestFormValues,
} from '../lib/validation'
import type { NewRequestInput } from '../types/domain'

const EMPTY_VALUES: RequestFormValues = { amount: '', recipient: '', note: '' }
const FIELD_ORDER: (keyof RequestFormValues)[] = ['amount', 'recipient', 'note']

interface RequestFormProps {
  onSubmit: (input: NewRequestInput) => void
  onCancel: () => void
}

/**
 * The elder's request form. Every input is "controlled": React state holds
 * the text, and the input only shows what the state says.
 */
export function RequestForm({ onSubmit, onCancel }: RequestFormProps) {
  const [values, setValues] = useState<RequestFormValues>(EMPTY_VALUES)
  const [errors, setErrors] = useState<RequestFormErrors>({})

  function updateField(field: keyof RequestFormValues, value: string) {
    setValues((previous) => ({ ...previous, [field]: value }))
    // Hide this field's old error as soon as the person starts fixing it.
    setErrors((previous) => ({ ...previous, [field]: undefined }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault() // stop the browser from reloading the page
    const result = validateRequestForm(values)
    if (!result.ok) {
      setErrors(result.errors)
      // Move keyboard/screen-reader focus to the first field that needs fixing.
      const firstInvalid = FIELD_ORDER.find((field) => result.errors[field])
      if (firstInvalid) document.getElementById(firstInvalid)?.focus()
      return
    }
    onSubmit(result.data)
  }

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      <div className="field">
        <label htmlFor="amount">Amount in rupees (₹)</label>
        <p id="amount-hint" className="field-hint">
          Whole rupees, for example 2500
        </p>
        <input
          id="amount"
          name="amount"
          inputMode="numeric"
          autoComplete="off"
          value={values.amount}
          onChange={(event) => updateField('amount', event.target.value)}
          aria-invalid={errors.amount ? true : undefined}
          aria-describedby={errors.amount ? 'amount-hint amount-error' : 'amount-hint'}
        />
        {errors.amount && (
          <p id="amount-error" className="field-error">
            {errors.amount}
          </p>
        )}
      </div>

      <div className="field">
        <label htmlFor="recipient">Who are you paying? (UPI ID or name)</label>
        <input
          id="recipient"
          name="recipient"
          autoComplete="off"
          value={values.recipient}
          onChange={(event) => updateField('recipient', event.target.value)}
          aria-invalid={errors.recipient ? true : undefined}
          aria-describedby={errors.recipient ? 'recipient-error' : undefined}
        />
        {errors.recipient && (
          <p id="recipient-error" className="field-error">
            {errors.recipient}
          </p>
        )}
      </div>

      <div className="field">
        <label htmlFor="note">
          What did they tell you? <span className="optional">(optional)</span>
        </label>
        <textarea
          id="note"
          name="note"
          rows={3}
          value={values.note}
          onChange={(event) => updateField('note', event.target.value)}
          aria-invalid={errors.note ? true : undefined}
          aria-describedby={errors.note ? 'note-count note-error' : 'note-count'}
        />
        <p id="note-count" className="field-hint">
          {values.note.trim().length} / {NOTE_MAX_LENGTH} characters
        </p>
        {errors.note && (
          <p id="note-error" className="field-error">
            {errors.note}
          </p>
        )}
      </div>

      <button type="submit" className="button-primary">
        Send to family to confirm
      </button>
      <button type="button" className="button-secondary" onClick={onCancel}>
        Cancel
      </button>
    </form>
  )
}

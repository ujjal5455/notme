// Checks the elder's form before a request is created.
// The same limits are enforced AGAIN by the database (create_money_request,
// migration 0006), because anything checked only in the browser can be bypassed.
import type { NewRequestInput } from '../types/domain'
import { formatInr } from './format'

export const MIN_AMOUNT_INR = 1
export const MAX_AMOUNT_INR = 100_000 // demo cap

/** Raw text exactly as typed into the form. Inputs always give us strings. */
export interface RequestFormValues {
  amount: string
}

/** One message per field that has a problem; fields without problems are absent. */
export type RequestFormErrors = Partial<Record<keyof RequestFormValues, string>>

export type ValidationResult =
  | { ok: true; data: NewRequestInput }
  | { ok: false; errors: RequestFormErrors }

export function validateRequestForm(values: RequestFormValues): ValidationResult {
  const errors: RequestFormErrors = {}

  // Amount: allow "25,000" or "25000"; reject decimals, minus signs, letters.
  const amountText = values.amount.trim().replace(/[,\s]/g, '')
  let amountInr = 0
  if (amountText === '') {
    errors.amount = 'Enter the amount you are being asked to pay.'
  } else if (!/^\d+$/.test(amountText)) {
    errors.amount = 'Use whole rupees and numbers only, for example 2500.'
  } else {
    amountInr = Number(amountText)
    if (amountInr < MIN_AMOUNT_INR) {
      errors.amount = `The amount must be at least ${formatInr(MIN_AMOUNT_INR)}.`
    } else if (amountInr > MAX_AMOUNT_INR) {
      errors.amount = `In this demo the amount can be at most ${formatInr(MAX_AMOUNT_INR)}.`
    }
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors }
  }
  return { ok: true, data: { amountInr } }
}

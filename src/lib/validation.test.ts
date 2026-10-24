import { describe, expect, it } from 'vitest'
import { validateRequestForm } from './validation'

function amountError(amount: string) {
  const result = validateRequestForm({ amount })
  return result.ok ? null : result.errors.amount
}

describe('validateRequestForm', () => {
  it('accepts a valid amount and tidies it', () => {
    const result = validateRequestForm({ amount: ' 25,000 ' })
    expect(result).toEqual({ ok: true, data: { amountInr: 25000 } })
  })

  it.each([
    ['', /enter the amount/i],
    ['   ', /enter the amount/i],
    ['abc', /whole rupees/i],
    ['-500', /whole rupees/i],
    ['10.50', /whole rupees/i],
    ['1e5', /whole rupees/i],
    ['0', /at least ₹1/i],
    ['100001', /at most ₹1,00,000/i],
  ])('rejects amount %j with a helpful message', (amount, message) => {
    expect(amountError(amount)).toMatch(message)
  })

  it('accepts the smallest and largest allowed amounts', () => {
    expect(amountError('1')).toBeNull()
    expect(amountError('100000')).toBeNull()
  })

  it('produces only the amount: nothing else is ever sent', () => {
    const result = validateRequestForm({ amount: '2500' })
    expect(result.ok && Object.keys(result.data)).toEqual(['amountInr'])
  })
})

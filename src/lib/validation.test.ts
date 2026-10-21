import { describe, expect, it } from 'vitest'
import { validateRequestForm, type RequestFormValues } from './validation'

const valid: RequestFormValues = { amount: '2500', recipient: 'shop@demo-upi', note: '' }

function amountError(amount: string) {
  const result = validateRequestForm({ ...valid, amount })
  return result.ok ? null : result.errors.amount
}

describe('validateRequestForm', () => {
  it('accepts a valid request and tidies the values', () => {
    const result = validateRequestForm({ amount: ' 25,000 ', recipient: '  shop@demo-upi ', note: ' ' })
    expect(result).toEqual({
      ok: true,
      data: { amountInr: 25000, recipient: 'shop@demo-upi', note: null },
    })
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

  it('requires a recipient of sensible length', () => {
    const empty = validateRequestForm({ ...valid, recipient: '' })
    const short = validateRequestForm({ ...valid, recipient: 'ab' })
    const long = validateRequestForm({ ...valid, recipient: 'x'.repeat(101) })
    expect(empty.ok ? null : empty.errors.recipient).toMatch(/who you are being asked to pay/i)
    expect(short.ok ? null : short.errors.recipient).toMatch(/at least 3/i)
    expect(long.ok ? null : long.errors.recipient).toMatch(/under 100/i)
  })

  it('limits the optional note to 200 characters', () => {
    const result = validateRequestForm({ ...valid, note: 'x'.repeat(201) })
    expect(result.ok ? null : result.errors.note).toMatch(/under 200/i)
  })

  it('reports every problem at once', () => {
    const result = validateRequestForm({ amount: '', recipient: '', note: '' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(Object.keys(result.errors).sort()).toEqual(['amount', 'recipient'])
  })
})

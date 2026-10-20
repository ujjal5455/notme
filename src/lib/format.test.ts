import { describe, expect, it } from 'vitest'
import { formatInr } from './format'

describe('formatInr', () => {
  it('adds the rupee sign and Indian digit grouping', () => {
    expect(formatInr(100000)).toBe('₹1,00,000')
  })

  it('shows small amounts without decimals', () => {
    expect(formatInr(1500)).toBe('₹1,500')
  })
})

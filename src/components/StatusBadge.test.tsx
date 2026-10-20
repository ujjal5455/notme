import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { RequestStatus } from '../types/domain'
import { StatusBadge } from './StatusBadge'

describe('StatusBadge', () => {
  const cases: [RequestStatus, string][] = [
    ['pending', 'Waiting for family'],
    ['approved', 'Confirmed by family'],
    ['rejected', 'Rejected by family'],
    ['expired', 'Unconfirmed — no reply'],
  ]

  it.each(cases)('shows readable text for %s (not colour alone)', (status, label) => {
    render(<StatusBadge status={status} />)
    expect(screen.getByText(label)).toBeInTheDocument()
  })

  it('never calls an expired request a scam', () => {
    render(<StatusBadge status="expired" />)
    expect(screen.queryByText(/scam|fraud/i)).not.toBeInTheDocument()
  })
})

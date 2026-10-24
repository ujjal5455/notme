import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StatusBanner } from './StatusBanner'

const family = 'Ravi (demo)'

describe('StatusBanner (elder view)', () => {
  it('pending: tells the elder to wait and not pay', () => {
    render(<StatusBanner status="pending" familyName={family} />)
    expect(screen.getByRole('status')).toHaveTextContent(/waiting for ravi.*do not pay yet/i)
  })

  it('approved: confirms the request without claiming the payment is safe', () => {
    render(<StatusBanner status="approved" familyName={family} />)
    const banner = screen.getByRole('status')
    expect(banner).toHaveTextContent(/confirmed this request/i)
    expect(banner).toHaveTextContent(/does not prove that paying is safe/i)
  })

  it('rejected: shows the prominent pause warning', () => {
    render(<StatusBanner status="rejected" familyName={family} />)
    const warning = screen.getByRole('alert')
    expect(warning).toHaveTextContent(
      'Pause. This request has not been confirmed. Contact your family member using a number you already trust.',
    )
    expect(warning).toHaveTextContent(/rejected this request/i)
  })

  it('expired: warns, but says no reply is not proof of a scam', () => {
    render(<StatusBanner status="expired" familyName={family} />)
    const warning = screen.getByRole('alert')
    expect(warning).toHaveTextContent(/has not been confirmed/i)
    expect(warning).toHaveTextContent(/no reply is not proof of a scam/i)
    expect(warning).not.toHaveTextContent(/(this|it) (is|was) (a )?(scam|fraud)/i)
  })
})

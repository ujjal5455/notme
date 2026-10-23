import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { REQUEST_TIMEOUT_SECONDS } from './config'
import { mockElder, mockFamily, mockRequests } from './mock/mockData'
import { SignedInApp } from './SignedInApp'

function click(name: string | RegExp) {
  fireEvent.click(screen.getByRole('button', { name }))
}

function renderAsElder(onSignOut = () => {}) {
  render(<SignedInApp profile={mockElder} linkedPerson={mockFamily} onSignOut={onSignOut} />)
}

function renderAsFamily() {
  render(<SignedInApp profile={mockFamily} linkedPerson={mockElder} onSignOut={() => {}} initialRequests={mockRequests} />)
}

/** As the elder: fill in and send a request for ₹2,500. */
function createRequestAsElder() {
  click(/check a money request/i)
  fireEvent.change(screen.getByLabelText(/amount in rupees/i), { target: { value: '2500' } })
  fireEvent.change(screen.getByLabelText(/who are you paying/i), {
    target: { value: 'test.shop@demo-upi' },
  })
  click(/send to family/i)
}

afterEach(() => {
  vi.useRealTimers()
})

describe('SignedInApp (real people, requests still local until Phase 5)', () => {
  it('elder starts on home, sees who they are signed in as, and can sign out', () => {
    const onSignOut = vi.fn()
    renderAsElder(onSignOut)
    expect(screen.getByRole('heading', { level: 1, name: /hello, asha/i })).toBeInTheDocument()
    expect(screen.getByText(/no real money is sent/i)).toBeInTheDocument()
    expect(screen.getByText(/money requests still stay in this browser tab/i)).toBeInTheDocument()
    // No more demo role switch: the role comes from the account.
    expect(screen.queryByRole('button', { name: 'Family' })).not.toBeInTheDocument()
    click('Sign out')
    expect(onSignOut).toHaveBeenCalledTimes(1)
  })

  it('elder creates a request and waits for the linked family member', () => {
    renderAsElder()
    createRequestAsElder()
    expect(screen.getByRole('heading', { level: 1, name: '₹2,500' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(/waiting for ravi/i)
    // The elder can never answer their own request.
    expect(screen.queryByRole('button', { name: 'Confirm request' })).not.toBeInTheDocument()
  })

  it('a request nobody answers turns into an "unconfirmed" warning', () => {
    vi.useFakeTimers()
    renderAsElder()
    createRequestAsElder()
    act(() => {
      vi.advanceTimersByTime((REQUEST_TIMEOUT_SECONDS + 1) * 1000)
    })
    const warning = screen.getByRole('alert')
    expect(warning).toHaveTextContent(/has not been confirmed/i)
    expect(warning).toHaveTextContent(/may be busy or offline/i)
  })

  it('shows helpful text for an invalid amount and stays on the form', () => {
    renderAsElder()
    click(/check a money request/i)
    fireEvent.change(screen.getByLabelText(/amount in rupees/i), { target: { value: '-50' } })
    click(/send to family/i)
    expect(screen.getByText(/whole rupees and numbers only/i)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /check a money request/i })).toBeInTheDocument()
  })

  it('family member starts on the inbox, linked with the elder', () => {
    renderAsFamily()
    expect(screen.getByRole('heading', { name: /requests to confirm/i })).toBeInTheDocument()
    expect(screen.getByText('Asha (demo)')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /waiting for your answer/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /₹25,000/ })).toBeInTheDocument()
  })

  it('family member confirms a pending request', () => {
    renderAsFamily()
    click(/₹25,000/)
    click('Confirm request')
    expect(screen.getByText(/you confirmed this request/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Confirm request' })).not.toBeInTheDocument()
  })

  it('family member rejects a pending request', () => {
    renderAsFamily()
    click(/₹25,000/)
    click('Reject request')
    expect(screen.getByText(/you rejected this request/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reject request' })).not.toBeInTheDocument()
  })
})

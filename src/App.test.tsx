import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { REQUEST_TIMEOUT_SECONDS } from './config'

function click(name: string | RegExp) {
  fireEvent.click(screen.getByRole('button', { name }))
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

describe('App (Phase 2 local mock flow)', () => {
  it('starts on the elder home screen and says the demo is local only', () => {
    render(<App />)
    expect(screen.getByRole('heading', { level: 1, name: /hello, asha/i })).toBeInTheDocument()
    expect(screen.getByText(/not shared with other devices/i)).toBeInTheDocument()
    expect(screen.getByText(/no real money is sent/i)).toBeInTheDocument()
  })

  it('elder creates → family confirms → elder sees "confirmed"', () => {
    render(<App />)
    createRequestAsElder()
    expect(screen.getByRole('heading', { level: 1, name: '₹2,500' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(/waiting for ravi/i)

    click('Family') // same request, now seen by the family member
    click('Confirm request')
    expect(screen.getByText(/you confirmed this request/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Confirm request' })).not.toBeInTheDocument()

    click('Elder')
    expect(screen.getByRole('status')).toHaveTextContent(/ravi \(demo\) confirmed these details/i)
  })

  it('elder creates → family rejects → elder sees the pause warning', () => {
    render(<App />)
    createRequestAsElder()
    click('Family')
    click('Reject request')
    click('Elder')
    expect(screen.getByRole('alert')).toHaveTextContent(/pause\. this request has not been confirmed/i)
  })

  it('new request appears in the family inbox under "Waiting for your answer"', () => {
    render(<App />)
    createRequestAsElder()
    click('Back')
    click('Family')
    const waitingHeading = screen.getByRole('heading', { name: /waiting for your answer/i })
    expect(waitingHeading).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /₹2,500/ })).toBeInTheDocument()
  })

  it('a request nobody answers turns into an "unconfirmed" warning', () => {
    vi.useFakeTimers()
    render(<App />)
    createRequestAsElder()
    act(() => {
      vi.advanceTimersByTime((REQUEST_TIMEOUT_SECONDS + 1) * 1000)
    })
    const warning = screen.getByRole('alert')
    expect(warning).toHaveTextContent(/has not been confirmed/i)
    expect(warning).toHaveTextContent(/may be busy or offline/i)

    // The family member can no longer answer it.
    click('Family')
    expect(screen.queryByRole('button', { name: 'Confirm request' })).not.toBeInTheDocument()
    expect(screen.getByText(/expired before it was answered/i)).toBeInTheDocument()
  })

  it('shows helpful text for an invalid amount and stays on the form', () => {
    render(<App />)
    click(/check a money request/i)
    fireEvent.change(screen.getByLabelText(/amount in rupees/i), { target: { value: '-50' } })
    click(/send to family/i)
    expect(screen.getByText(/whole rupees and numbers only/i)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /check a money request/i })).toBeInTheDocument()
  })
})

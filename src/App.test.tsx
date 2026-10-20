import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App (Phase 1 mock screens)', () => {
  it('starts on the elder home screen with the demo notice', () => {
    render(<App />)
    expect(screen.getByRole('heading', { level: 1, name: /hello, asha/i })).toBeInTheDocument()
    expect(screen.getByText(/no real money is sent/i)).toBeInTheDocument()
  })

  it('switches to the family inbox when "Family" is pressed', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Family' }))
    expect(screen.getByRole('heading', { name: /requests to confirm/i })).toBeInTheDocument()
  })

  it('opens a request and shows the warning for a rejected one', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /₹80,000/ }))
    expect(screen.getByRole('heading', { level: 1, name: '₹80,000' })).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent(/has not been confirmed/i)
  })

  it('does not pretend to send a request in Phase 1', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /check a money request/i }))
    fireEvent.click(screen.getByRole('button', { name: /send to family/i }))
    expect(screen.getByRole('status')).toHaveTextContent(/nothing was sent/i)
  })
})

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { RequestForm } from './RequestForm'

function setup() {
  const onSubmit = vi.fn()
  render(<RequestForm onSubmit={onSubmit} onCancel={() => {}} />)
  const amount = screen.getByLabelText(/amount in rupees/i)
  const recipient = screen.getByLabelText(/who are you paying/i)
  const submit = screen.getByRole('button', { name: /send to family/i })
  return { onSubmit, amount, recipient, submit }
}

describe('RequestForm', () => {
  it('shows helpful errors and does not submit when empty', () => {
    const { onSubmit, amount, submit } = setup()
    fireEvent.click(submit)
    expect(screen.getByText(/enter the amount you are being asked to pay/i)).toBeInTheDocument()
    expect(screen.getByText(/enter who you are being asked to pay/i)).toBeInTheDocument()
    expect(amount).toHaveAttribute('aria-invalid', 'true')
    expect(amount).toHaveFocus() // focus jumps to the first problem
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('rejects a non-numeric amount', () => {
    const { onSubmit, amount, recipient, submit } = setup()
    fireEvent.change(amount, { target: { value: 'five hundred' } })
    fireEvent.change(recipient, { target: { value: 'shop@demo-upi' } })
    fireEvent.click(submit)
    expect(screen.getByText(/whole rupees and numbers only/i)).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('clears a field error once the person edits that field', () => {
    const { amount, submit } = setup()
    fireEvent.click(submit)
    fireEvent.change(amount, { target: { value: '5' } })
    expect(screen.queryByText(/enter the amount/i)).not.toBeInTheDocument()
  })

  it('submits clean data when valid', () => {
    const { onSubmit, amount, recipient, submit } = setup()
    fireEvent.change(amount, { target: { value: '2,500' } })
    fireEvent.change(recipient, { target: { value: ' shop@demo-upi ' } })
    fireEvent.click(submit)
    expect(onSubmit).toHaveBeenCalledWith({
      amountInr: 2500,
      recipient: 'shop@demo-upi',
      note: null,
    })
  })
})

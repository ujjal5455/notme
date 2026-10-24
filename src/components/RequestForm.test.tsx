import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { RequestForm } from './RequestForm'

function setup() {
  const onSubmit = vi.fn()
  render(<RequestForm onSubmit={onSubmit} onCancel={() => {}} />)
  const amount = screen.getByLabelText(/amount in rupees/i)
  const submit = screen.getByRole('button', { name: /send alert to family/i })
  return { onSubmit, amount, submit }
}

describe('RequestForm', () => {
  it('has only one field: the amount (no payee, no note)', () => {
    setup()
    expect(screen.getAllByRole('textbox')).toHaveLength(1)
    expect(screen.queryByLabelText(/who are you paying|what did they tell you/i)).not.toBeInTheDocument()
  })

  it('shows a helpful error and does not submit when empty', () => {
    const { onSubmit, amount, submit } = setup()
    fireEvent.click(submit)
    expect(screen.getByText(/enter the amount you are being asked to pay/i)).toBeInTheDocument()
    expect(amount).toHaveAttribute('aria-invalid', 'true')
    expect(amount).toHaveFocus() // focus jumps to the problem
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('rejects a non-numeric amount', () => {
    const { onSubmit, amount, submit } = setup()
    fireEvent.change(amount, { target: { value: 'five hundred' } })
    fireEvent.click(submit)
    expect(screen.getByText(/whole rupees and numbers only/i)).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('clears the error once the person edits the amount', () => {
    const { amount, submit } = setup()
    fireEvent.click(submit)
    fireEvent.change(amount, { target: { value: '5' } })
    expect(screen.queryByText(/enter the amount/i)).not.toBeInTheDocument()
  })

  it('submits clean data when valid', () => {
    const { onSubmit, amount, submit } = setup()
    fireEvent.change(amount, { target: { value: ' 2,500 ' } })
    fireEvent.click(submit)
    expect(onSubmit).toHaveBeenCalledWith({ amountInr: 2500 })
  })
})

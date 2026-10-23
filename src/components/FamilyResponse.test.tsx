import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { FamilyResponse } from './FamilyResponse'

describe('FamilyResponse', () => {
  it('while sending: both buttons are disabled, and a double tap sends only once', async () => {
    let finish = () => {}
    const onRespond = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)))
    render(<FamilyResponse status="pending" elderName="Asha (demo)" onRespond={onRespond} />)

    fireEvent.click(screen.getByRole('button', { name: 'Reject request' }))
    expect(screen.getByRole('button', { name: 'Sending…' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Confirm request' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Sending…' }))
    expect(onRespond).toHaveBeenCalledTimes(1)
    expect(onRespond).toHaveBeenCalledWith('rejected')

    await act(async () => finish())
    expect(screen.getByRole('button', { name: 'Reject request' })).toBeEnabled()
  })

  it("shows the database's message when the answer is refused", async () => {
    const onRespond = vi.fn(async () => {
      throw new Error('This request has expired, so it can no longer be answered.')
    })
    render(<FamilyResponse status="pending" elderName="Asha (demo)" onRespond={onRespond} />)
    fireEvent.click(screen.getByRole('button', { name: 'Confirm request' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('This request has expired')
  })
})

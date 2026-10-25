import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { QuickAccessBanner } from './QuickAccessBanner'

const family = 'Ravi (demo)'

describe('QuickAccessBanner (elder, Android)', () => {
  it('shows nothing in a normal browser or once the button is there', () => {
    const { container, rerender } = render(
      <QuickAccessBanner permission="unsupported" error={null} familyName={family} onTurnOn={() => {}} />,
    )
    expect(container).toBeEmptyDOMElement()
    rerender(<QuickAccessBanner permission="granted" error={null} familyName={family} onTurnOn={() => {}} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('explains the button, then adds it only when tapped', () => {
    const onTurnOn = vi.fn()
    render(<QuickAccessBanner permission="prompt" error={null} familyName={family} onTurnOn={onTurnOn} />)
    expect(screen.getByRole('status')).toHaveTextContent(/pull down from the top of the screen/i)
    expect(screen.getByRole('status')).toHaveTextContent(/check with ravi \(demo\), without hanging up/i)
    fireEvent.click(screen.getByRole('button', { name: 'Add the quick button' }))
    expect(onTurnOn).toHaveBeenCalledTimes(1)
  })

  it('says how to allow it when notifications were refused', () => {
    render(<QuickAccessBanner permission="denied" error={null} familyName={family} onTurnOn={() => {}} />)
    expect(screen.getByRole('status')).toHaveTextContent(/quick button is off.*settings → apps → notme → notifications/i)
  })

  it('shows a set-up failure', () => {
    render(<QuickAccessBanner permission="granted" error="The quick button could not be added." familyName={family} onTurnOn={() => {}} />)
    expect(screen.getByRole('alert')).toHaveTextContent('The quick button could not be added.')
  })
})

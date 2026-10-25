import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { NotificationsBanner } from './NotificationsBanner'

const elder = 'Asha (demo)'

describe('NotificationsBanner (family member, Android)', () => {
  it('shows nothing in a normal browser', () => {
    const { container } = render(
      <NotificationsBanner permission="unsupported" error={null} elderName={elder} onTurnOn={() => {}} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('explains why, then asks only when the button is tapped', () => {
    const onTurnOn = vi.fn()
    render(<NotificationsBanner permission="prompt" error={null} elderName={elder} onTurnOn={onTurnOn} />)
    expect(screen.getByRole('status')).toHaveTextContent(/when asha \(demo\) is asked for money/i)
    expect(onTurnOn).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Turn on alerts' }))
    expect(onTurnOn).toHaveBeenCalledTimes(1)
  })

  it('says how to turn alerts back on when they were refused', () => {
    render(<NotificationsBanner permission="denied" error={null} elderName={elder} onTurnOn={() => {}} />)
    expect(screen.getByRole('status')).toHaveTextContent(/alerts are off.*settings → apps → notme → notifications/i)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('stays quiet when alerts work, and shows a set-up failure', () => {
    const { rerender, container } = render(
      <NotificationsBanner permission="granted" error={null} elderName={elder} onTurnOn={() => {}} />,
    )
    expect(container).toBeEmptyDOMElement()
    rerender(
      <NotificationsBanner permission="granted" error="Alerts are not set up yet: offline" elderName={elder} onTurnOn={() => {}} />,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Alerts are not set up yet: offline')
  })
})

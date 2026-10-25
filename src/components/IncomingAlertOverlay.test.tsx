import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { MoneyRequest } from '../types/domain'
import { IncomingAlertOverlay } from './IncomingAlertOverlay'

const loops = vi.hoisted(() => ({
  stopSound: vi.fn(),
  stopVibration: vi.fn(),
  startAlarmLoop: vi.fn(),
  startVibrationLoop: vi.fn(),
}))
vi.mock('../lib/alertSound', () => ({ startAlarmLoop: loops.startAlarmLoop }))
vi.mock('../lib/vibration', () => ({ startVibrationLoop: loops.startVibrationLoop }))

const now = Date.parse('2026-10-25T12:00:00.000Z')
const request: MoneyRequest = {
  id: 'req-1',
  elderId: 'elder-1',
  familyId: 'family-1',
  amountInr: 25000,
  status: 'pending',
  createdAt: '2026-10-25T11:59:55.000Z',
  expiresAt: '2026-10-25T12:00:55.000Z',
  respondedAt: null,
  alertSentAt: null,
}

beforeEach(() => {
  for (const fn of Object.values(loops)) fn.mockReset()
  loops.startAlarmLoop.mockReturnValue(loops.stopSound)
  loops.startVibrationLoop.mockReturnValue(loops.stopVibration)
})

function setup() {
  const onOpen = vi.fn()
  const onStop = vi.fn()
  const view = render(
    <IncomingAlertOverlay request={request} elderName="Asha (demo)" nowMs={now} onOpen={onOpen} onStop={onStop} />,
  )
  return { onOpen, onStop, ...view }
}

describe('IncomingAlertOverlay', () => {
  it('covers the screen as an alert dialog with the amount, who, and what to do', () => {
    setup()
    const dialog = screen.getByRole('alertdialog', { name: 'Asha (demo) is being asked to send ₹25,000' })
    expect(dialog).toHaveTextContent(/call asha \(demo\) on a number you already trust/i)
    expect(dialog).toHaveTextContent('Time left to answer: 0:55')
    expect(dialog).not.toHaveTextContent(/this is a scam|it is a scam/i)
  })

  it('rings and vibrates for up to 30 s, and stops both when it goes away', () => {
    const { unmount } = setup()
    expect(loops.startAlarmLoop).toHaveBeenCalledWith(30)
    expect(loops.startVibrationLoop).toHaveBeenCalledWith(30)
    unmount()
    expect(loops.stopSound).toHaveBeenCalledTimes(1)
    expect(loops.stopVibration).toHaveBeenCalledTimes(1)
  })

  it('puts focus on "Open request"; the buttons and Escape do what they say', () => {
    const { onOpen, onStop } = setup()
    expect(screen.getByRole('button', { name: 'Open request' })).toHaveFocus()
    fireEvent.click(screen.getByRole('button', { name: 'Open request' }))
    expect(onOpen).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'Stop alarm' }))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onStop).toHaveBeenCalledTimes(2)
  })
})

import { useEffect, useRef } from 'react'
import { startAlarmLoop } from '../lib/alertSound'
import { formatInr } from '../lib/format'
import { startVibrationLoop } from '../lib/vibration'
import type { MoneyRequest } from '../types/domain'
import { TimeLeft } from './TimeLeft'

interface IncomingAlertOverlayProps {
  request: MoneyRequest
  elderName: string
  nowMs: number
  onOpen: () => void
  onStop: () => void
}

/**
 * FAMILY member (onsite, backlog E2 + E3): a full-screen red warning that
 * covers Notme the moment a new request is waiting, with a looping alarm and
 * a repeating vibration, for up to 30 seconds or until a button is pressed.
 * Sound and vibration are best effort; the screen itself is the warning.
 * No flashing (safe for people with photosensitive epilepsy).
 */
export function IncomingAlertOverlay({ request, elderName, nowMs, onOpen, onStop }: IncomingAlertOverlayProps) {
  const openButton = useRef<HTMLButtonElement>(null)

  // Ring and buzz while this request's overlay is up; stop when it goes away.
  useEffect(() => {
    const stopSound = startAlarmLoop(30)
    const stopVibration = startVibrationLoop(30)
    return () => {
      stopSound()
      stopVibration()
    }
  }, [request.id])

  // Keyboard and screen-reader focus go straight to the main action.
  useEffect(() => {
    openButton.current?.focus()
  }, [request.id])

  // Escape = Stop alarm, like closing any dialog.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onStop()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onStop])

  return (
    <div
      className="incoming-overlay"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="incoming-title"
      aria-describedby="incoming-body"
    >
      <p className="incoming-label">⚠ Money alert</p>
      <h1 id="incoming-title">
        {elderName} is being asked to send {formatInr(request.amountInr)}
      </h1>
      <p id="incoming-body">
        Before you answer, call {elderName} on a number you already trust. Scammers can copy a
        family member&apos;s voice.
      </p>
      <TimeLeft expiresAt={request.expiresAt} nowMs={nowMs} label="Time left to answer" />
      <button ref={openButton} type="button" className="incoming-open" onClick={onOpen}>
        Open request
      </button>
      <button type="button" className="incoming-stop" onClick={onStop}>
        Stop alarm
      </button>
    </div>
  )
}

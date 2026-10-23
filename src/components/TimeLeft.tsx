interface TimeLeftProps {
  expiresAt: string
  /** "Now" in server time (the phone's clock corrected by the server offset). */
  nowMs: number
  /** e.g. "Time left to answer" (family) or "Waiting up to" (elder). */
  label: string
}

/** A quiet countdown to a request's deadline. */
export function TimeLeft({ expiresAt, nowMs, label }: TimeLeftProps) {
  // Round UP so "0.4 s left" still shows 0:01, not 0:00 too early.
  const seconds = Math.max(0, Math.ceil((Date.parse(expiresAt) - nowMs) / 1000))
  const text = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
  if (seconds === 0) return null // the "Unconfirmed" warning takes over
  return (
    <p className="time-left">
      {/* role="timer": screen readers don't announce every tick (that would be unusable);
          the important moment is announced by the warning's role="alert" instead. */}
      {label}: <span role="timer">{text}</span>
    </p>
  )
}

import { useEffect, useState } from 'react'

/**
 * The current time in milliseconds, refreshed every `intervalMs`.
 * Components using it re-render on each tick, so a pending request turns
 * "expired" on screen as soon as its deadline passes.
 */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timerId = setInterval(() => setNow(Date.now()), intervalMs)
    // Cleanup: stop the timer when the component disappears,
    // otherwise it would keep running in the background forever.
    return () => clearInterval(timerId)
  }, [intervalMs])

  return now
}

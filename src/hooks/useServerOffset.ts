import { useEffect, useState } from 'react'
import { measureServerOffset } from '../lib/api/serverTime'

/**
 * The difference between the database clock and this phone's clock (ms), measured
 * once when the signed-in app opens. 0 until measured, or if measuring fails:
 * countdowns then use the phone's own clock. Display only: the database still
 * decides whether an answer is late.
 */
export function useServerOffset(): number {
  const [offsetMs, setOffsetMs] = useState(0)

  useEffect(() => {
    let ignore = false
    measureServerOffset()
      .then((offset) => {
        if (!ignore) setOffsetMs(offset)
      })
      .catch(() => {
        // Keep 0. Nothing important depends on it (see above).
      })
    return () => {
      ignore = true
    }
  }, [])

  return offsetMs
}

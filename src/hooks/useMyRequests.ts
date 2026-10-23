import { useEffect, useState } from 'react'
import { listMyRequests } from '../lib/api/requests'
import type { MoneyRequest } from '../types/domain'

/** The signed-in user's requests (RLS decides which), with loading and error states. */
export function useMyRequests(userId: string) {
  const [requests, setRequests] = useState<MoneyRequest[]>([])
  // Starts true, so the first screen says "Loading…" rather than a misleading "no requests".
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let ignore = false
    listMyRequests()
      .then((rows) => {
        if (ignore) return
        setRequests(rows)
        setError(null)
      })
      .catch((e: unknown) => {
        // Keep the old list on screen; just say it could not be refreshed.
        if (!ignore) setError(e instanceof Error ? e.message : 'Could not load requests.')
      })
      .finally(() => {
        if (!ignore) setLoading(false)
      })
    return () => {
      ignore = true
    }
  }, [userId, reloadKey])

  // Load again whenever the person comes back to this tab or app, so a request
  // sent while they were away shows up. (Phase 6 adds live updates.)
  useEffect(() => {
    function handleVisible() {
      if (document.visibilityState === 'visible') setReloadKey((k) => k + 1)
    }
    document.addEventListener('visibilitychange', handleVisible)
    return () => document.removeEventListener('visibilitychange', handleVisible)
  }, [])

  /** Load the whole list again. */
  const reload = () => setReloadKey((k) => k + 1)

  /** Put one new or changed request into the list, newest first, without reloading everything. */
  const upsert = (changed: MoneyRequest) =>
    setRequests((previous) =>
      [changed, ...previous.filter((r) => r.id !== changed.id)].sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt),
      ),
    )

  return { requests, loading, error, reload, upsert }
}

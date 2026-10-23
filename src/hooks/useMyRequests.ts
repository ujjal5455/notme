import { useCallback, useEffect, useState } from 'react'
import { listMyRequests } from '../lib/api/requests'
import { mergeLoaded, upsertRequest } from '../lib/requestList'
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
        setRequests((previous) => mergeLoaded(previous, rows))
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

  // Load again whenever the person comes back to this tab or app.
  useEffect(() => {
    function handleVisible() {
      if (document.visibilityState === 'visible') setReloadKey((k) => k + 1)
    }
    document.addEventListener('visibilitychange', handleVisible)
    return () => document.removeEventListener('visibilitychange', handleVisible)
  }, [])

  /** Load the whole list again (Refresh / Try again buttons). Failures show the error banner. */
  const reload = () => setReloadKey((k) => k + 1)

  /**
   * Load the whole list again for polling. Unlike reload(), it returns a Promise
   * that REJECTS on failure, so the caller can tell the person they are offline.
   */
  const refetch = useCallback(async () => {
    const rows = await listMyRequests()
    setRequests((previous) => mergeLoaded(previous, rows))
    setError(null)
  }, [])

  /** Put one new or changed request into the list without reloading everything. */
  const upsert = useCallback((changed: MoneyRequest) => {
    setRequests((previous) => upsertRequest(previous, changed))
  }, [])

  return { requests, loading, error, reload, refetch, upsert }
}

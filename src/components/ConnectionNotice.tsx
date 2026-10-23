import type { LiveStatus } from '../hooks/useRequestUpdates'

interface ConnectionNoticeProps {
  live: LiveStatus
  /** Set when loading the list failed (e.g. the first load). */
  loadError: string | null
  onRetry: () => void
}

/** Tells the person how fresh the screen is. Says nothing while all is well. */
export function ConnectionNotice({ live, loadError, onRetry }: ConnectionNoticeProps) {
  if (live === 'offline' || loadError) {
    return (
      <div className="warning" role="alert">
        <strong className="warning-title">Can&apos;t reach the server.</strong>
        <p>
          This screen may be out of date. Don&apos;t pay until you can see your family
          member&apos;s answer.
        </p>
        {loadError && <p>{loadError}</p>}
        <button type="button" onClick={onRetry}>
          Try again
        </button>
      </div>
    )
  }
  if (live === 'polling') {
    return (
      <p className="notice" role="status">
        Live updates are not connected. Checking for updates every few seconds.
      </p>
    )
  }
  return null
}

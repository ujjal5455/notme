interface WarningPanelProps {
  reason: 'rejected' | 'expired'
  familyName: string
}

/**
 * The big "pause" warning shown to the elder. Calm, direct, and honest:
 * a rejection or a missing reply means "unconfirmed" — not "proven scam".
 * Phase 7 adds a best-effort sound; this visual warning is always shown.
 */
export function WarningPanel({ reason, familyName }: WarningPanelProps) {
  return (
    <div className="warning" role="alert">
      {/* One paragraph so the exact sentence reads correctly (and copies) as a whole. */}
      <p>
        <strong className="warning-title">Pause.</strong> This request has not been confirmed.
        Contact your family member using a number you already trust.
      </p>
      {reason === 'rejected' ? (
        <p>
          <strong>{familyName}</strong> rejected this request. Do not pay unless you speak to them
          directly and they say it is genuine.
        </p>
      ) : (
        <p>
          <strong>{familyName}</strong> did not answer in time. No reply is not proof of a scam:
          they may be busy or offline. Still, do not pay until you have spoken to them.
        </p>
      )}
    </div>
  )
}

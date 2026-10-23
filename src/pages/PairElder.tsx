import { useState } from 'react'
import { useCountdown } from '../hooks/useCountdown'
import { createPairingCode, getMyLinks, type PairingCode } from '../lib/api/pairing'

interface PairElderProps {
  userId: string
  /** Called once the link exists, so the app can reload the account. */
  onLinked: () => void
}

/** "P38SP4XS" → "P38S-P4XS": two groups are easier to read off a screen. */
function formatCode(code: string): string {
  return `${code.slice(0, 4)}-${code.slice(4)}`
}

function CodeDisplay({ pairing }: { pairing: PairingCode }) {
  const seconds = useCountdown(pairing.expiresAt)
  const time = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
  return (
    <>
      {/* The label spells the code letter by letter so a screen reader does not try to say it as a word. */}
      <p className="pairing-code" aria-label={`Pairing code: ${pairing.code.split('').join(' ')}`}>
        {formatCode(pairing.code)}
      </p>
      <p role="status">{seconds > 0 ? `Expires in ${time}` : 'This code has expired. Make a new one.'}</p>
    </>
  )
}

/** Elder: show a one-time code for the family member to type in, while together in person. */
export function PairElder({ userId, onLinked }: PairElderProps) {
  const [pairing, setPairing] = useState<PairingCode | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function makeCode() {
    setBusy(true)
    setMessage(null)
    try {
      setPairing(await createPairingCode())
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not make a code. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  async function checkLinked() {
    setBusy(true)
    setMessage(null)
    try {
      const links = await getMyLinks(userId)
      if (links.length > 0) onLinked()
      else setMessage('Not linked yet. Ask your family member to type the code, then press this again.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not check. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section aria-labelledby="pair-elder-title">
      <h1 id="pair-elder-title">Link your family member</h1>
      <p>
        Choose one family member you trust. They will confirm money requests for you. Do this{' '}
        <strong>now, before any emergency</strong>.
      </p>

      <div className="warning">
        <strong className="warning-title">Only in person.</strong>
        Show this code to your family member while you are together. Never read it out on a phone
        call, and never send it in a message.
      </div>

      {pairing && <CodeDisplay key={pairing.code} pairing={pairing} />}

      {message && (
        <p className="field-error" role="alert">
          {message}
        </p>
      )}

      {pairing && (
        <button type="button" className="button-primary" onClick={checkLinked} disabled={busy}>
          My family member has entered the code
        </button>
      )}
      <button
        type="button"
        className={pairing ? 'button-secondary' : 'button-primary'}
        onClick={makeCode}
        disabled={busy}
      >
        {pairing ? 'Make a new code' : 'Show a pairing code'}
      </button>
    </section>
  )
}

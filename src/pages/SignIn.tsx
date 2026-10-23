import { type FormEvent, useState } from 'react'
import { NETWORK_MESSAGE } from '../lib/api/errors'
import { supabase } from '../lib/supabaseClient'

type Mode = 'signIn' | 'signUp'

/** Sign in, or create a demo account. One screen with two modes. */
export function SignIn() {
  const [mode, setMode] = useState<Mode>('signIn')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [infoMessage, setInfoMessage] = useState<string | null>(null)

  function switchMode() {
    setMode(mode === 'signIn' ? 'signUp' : 'signIn')
    setErrorMessage(null)
    setInfoMessage(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)
    setInfoMessage(null)
    if (!email.trim() || !password) {
      setErrorMessage('Enter an email and a password.')
      return
    }

    setBusy(true)
    const credentials = { email: email.trim(), password }
    try {
      const { data, error } =
        mode === 'signIn'
          ? await supabase.auth.signInWithPassword(credentials)
          : await supabase.auth.signUp(credentials)

      if (error) {
        if (/fetch|network/i.test(error.message)) setErrorMessage(NETWORK_MESSAGE)
        else if (mode === 'signIn') {
          // Deliberately general: do not reveal whether this email has an account.
          setErrorMessage('Email or password is not right. Please try again.')
        } else {
          setErrorMessage(
            'Could not create the account. Use a made-up email that has no account yet, and a password of at least 6 characters.',
          )
        }
      } else if (mode === 'signUp' && !data.session) {
        // Happens when "Confirm email" is still ON in the Supabase dashboard.
        setInfoMessage(
          'Account created, but it needs email confirmation first. For this demo, turn off "Confirm email" in Supabase (see README), then sign in.',
        )
      }
      // On success there is nothing else to do here: AuthProvider hears about the
      // new session through onAuthStateChange, and App moves to the next screen.
    } catch {
      setErrorMessage(NETWORK_MESSAGE)
    } finally {
      setBusy(false)
    }
  }

  const isSignIn = mode === 'signIn'

  return (
    <section aria-labelledby="signin-title">
      <h1 id="signin-title">{isSignIn ? 'Sign in' : 'Create a demo account'}</h1>
      <p className="notice">
        Demo only: use a made-up email such as <strong>elder1@example.com</strong> and a password
        you do not use anywhere else.
      </p>

      <form className="form" onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          {!isSignIn && (
            <p id="password-hint" className="field-hint">
              At least 6 characters.
            </p>
          )}
          <input
            id="password"
            type="password"
            autoComplete={isSignIn ? 'current-password' : 'new-password'}
            aria-describedby={isSignIn ? undefined : 'password-hint'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {errorMessage && (
          <p className="field-error" role="alert">
            {errorMessage}
          </p>
        )}
        {infoMessage && (
          <p className="notice" role="status">
            {infoMessage}
          </p>
        )}

        <button type="submit" className="button-primary" disabled={busy}>
          {busy ? 'Please wait…' : isSignIn ? 'Sign in' : 'Create account'}
        </button>
      </form>

      <button type="button" className="button-secondary" onClick={switchMode}>
        {isSignIn ? 'New here? Create a demo account' : 'Already have an account? Sign in'}
      </button>
    </section>
  )
}

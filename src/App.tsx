import { useAuth } from './auth/authContext'
import { Layout } from './components/Layout'
import { ChooseRole } from './pages/ChooseRole'
import { PairElder } from './pages/PairElder'
import { PairFamily } from './pages/PairFamily'
import { SignIn } from './pages/SignIn'
import { SignedInApp } from './SignedInApp'

/**
 * The gate. Each person passes the same checkpoints, in order:
 * signed in? → has a profile (role)? → linked with a family member? → the app.
 */
export default function App() {
  const auth = useAuth()

  if (auth.status === 'loading') {
    return (
      <Layout>
        <p className="loading" role="status">
          Loading…
        </p>
      </Layout>
    )
  }

  if (auth.status === 'signedOut') {
    return (
      <Layout>
        <SignIn />
      </Layout>
    )
  }

  if (auth.status === 'error') {
    return (
      <Layout account={{ displayName: null, onSignOut: auth.signOut }}>
        <section>
          <h1>Something went wrong</h1>
          <p className="field-error" role="alert">
            {auth.message}
          </p>
          <button type="button" className="button-primary" onClick={auth.retry}>
            Try again
          </button>
        </section>
      </Layout>
    )
  }

  // From here on TypeScript knows auth.status is 'signedIn'.
  const { profile, link } = auth
  const account = { displayName: profile?.displayName ?? null, onSignOut: auth.signOut }

  if (!profile) {
    return (
      <Layout account={account}>
        <ChooseRole onChosen={auth.refresh} />
      </Layout>
    )
  }

  if (!link) {
    return (
      <Layout account={account}>
        {profile.role === 'elder' ? (
          <PairElder userId={auth.user.id} onLinked={auth.refresh} />
        ) : (
          <PairFamily onLinked={auth.refresh} />
        )}
      </Layout>
    )
  }

  // key: if a different person signs in on this device, start the app fresh.
  return (
    <SignedInApp
      key={profile.id}
      profile={profile}
      linkedPerson={link.linkedPerson}
      onSignOut={auth.signOut}
    />
  )
}

import { useState } from 'react'
import { Layout } from './components/Layout'
import { REQUEST_TIMEOUT_SECONDS } from './config'
import { useMyRequests } from './hooks/useMyRequests'
import { useNow } from './hooks/useNow'
import { createMoneyRequest } from './lib/api/requests'
import { AboutSafety } from './pages/AboutSafety'
import { CreateRequest } from './pages/CreateRequest'
import { ElderHome } from './pages/ElderHome'
import { FamilyInbox } from './pages/FamilyInbox'
import { RequestDetail } from './pages/RequestDetail'
import type { NewRequestInput, Profile, UserRole } from './types/domain'
import type { View } from './types/view'

interface SignedInAppProps {
  /** The signed-in person (from Supabase). Their role can never be switched. */
  profile: Profile
  /** The person they are linked with (from Supabase). */
  linkedPerson: Profile
  onSignOut: () => void
}

function homeFor(role: UserRole): View {
  return role === 'elder' ? { name: 'elderHome' } : { name: 'familyInbox' }
}

/** The switchboard for a signed-in, linked person. Requests come from Supabase (Phase 5). */
export function SignedInApp({ profile, linkedPerson, onSignOut }: SignedInAppProps) {
  const role = profile.role
  const elder = role === 'elder' ? profile : linkedPerson
  const familyMember = role === 'family' ? profile : linkedPerson

  const [view, setView] = useState<View>(() => homeFor(role))
  // Row Level Security sends only this person's requests, so no filtering is needed here.
  const { requests, loading, error, reload, upsert } = useMyRequests(profile.id)
  // Re-render every second so pending requests turn "expired" on time.
  const nowMs = useNow()

  // Every screen change goes through here, so each new screen starts at the top.
  function goTo(nextView: View) {
    setView(nextView)
    window.scrollTo(0, 0)
  }

  function openRequest(requestId: string) {
    goTo({ name: 'requestDetail', requestId })
  }

  function findPerson(id: string): Profile | undefined {
    return [profile, linkedPerson].find((person) => person.id === id)
  }

  /** May throw (no connection, not linked…); RequestForm shows the message. */
  async function handleCreate(input: NewRequestInput) {
    const created = await createMoneyRequest(input, REQUEST_TIMEOUT_SECONDS)
    upsert(created)
    openRequest(created.id)
  }

  function renderPage() {
    switch (view.name) {
      case 'elderHome':
        return (
          <ElderHome
            elder={elder}
            familyMember={familyMember}
            requests={requests}
            nowMs={nowMs}
            onCreateRequest={() => goTo({ name: 'createRequest' })}
            onOpenRequest={openRequest}
            onRefresh={reload}
          />
        )
      case 'createRequest':
        return (
          <CreateRequest
            familyMember={familyMember}
            onSubmit={handleCreate}
            onCancel={() => goTo({ name: 'elderHome' })}
          />
        )
      case 'familyInbox':
        return (
          <FamilyInbox
            familyMember={familyMember}
            linkedElder={elder}
            requests={requests}
            nowMs={nowMs}
            onOpenRequest={openRequest}
            onRefresh={reload}
          />
        )
      case 'requestDetail': {
        const request = requests.find((r) => r.id === view.requestId)
        return (
          <RequestDetail
            request={request}
            elder={request && findPerson(request.elderId)}
            familyMember={request && findPerson(request.familyId)}
            viewerRole={role}
            nowMs={nowMs}
            onBack={() => goTo(homeFor(role))}
          />
        )
      }
      case 'about':
        return <AboutSafety />
    }
  }

  // Only the first load blocks the screen; later reloads keep the list visible.
  const showLoading = loading && view.name !== 'createRequest' && view.name !== 'about'

  return (
    <Layout
      account={{ displayName: profile.displayName, onSignOut }}
      nav={{ role, currentView: view.name, onNavigate: goTo }}
    >
      {error && (
        <div className="warning" role="alert">
          <strong className="warning-title">Could not refresh your requests.</strong>
          <p>{error} What you see below may be out of date.</p>
          <button type="button" onClick={reload}>
            Try again
          </button>
        </div>
      )}
      {showLoading ? (
        <p className="loading" role="status">
          Loading your requests…
        </p>
      ) : (
        renderPage()
      )}
    </Layout>
  )
}

import { useState } from 'react'
import { Layout } from './components/Layout'
import { useNow } from './hooks/useNow'
import { createRequest, respondToRequest } from './mock/mockStore'
import { AboutSafety } from './pages/AboutSafety'
import { CreateRequest } from './pages/CreateRequest'
import { ElderHome } from './pages/ElderHome'
import { FamilyInbox } from './pages/FamilyInbox'
import { RequestDetail } from './pages/RequestDetail'
import type { FamilyDecision, MoneyRequest, NewRequestInput, Profile, UserRole } from './types/domain'
import type { View } from './types/view'

interface SignedInAppProps {
  /** The signed-in person (real, from Supabase). Their role can never be switched. */
  profile: Profile
  /** The person they are linked with (real, from Supabase). */
  linkedPerson: Profile
  onSignOut: () => void
  /** Starting requests. Only tests pass this; the app starts with none. */
  initialRequests?: MoneyRequest[]
}

function homeFor(role: UserRole): View {
  return role === 'elder' ? { name: 'elderHome' } : { name: 'familyInbox' }
}

/**
 * The switchboard for a signed-in, linked person.
 * People are real (Phase 4). Requests are still the local mock store from Phase 2:
 * they live only in this browser tab's memory. Phase 5 moves them into Supabase.
 */
export function SignedInApp({ profile, linkedPerson, onSignOut, initialRequests = [] }: SignedInAppProps) {
  const role = profile.role
  const elder = role === 'elder' ? profile : linkedPerson
  const familyMember = role === 'family' ? profile : linkedPerson

  const [view, setView] = useState<View>(() => homeFor(role))
  const [requests, setRequests] = useState<MoneyRequest[]>(initialRequests)
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

  function handleCreate(input: NewRequestInput) {
    const result = createRequest(
      requests,
      input,
      { elderId: elder.id, familyId: familyMember.id },
      Date.now(),
    )
    setRequests(result.requests)
    openRequest(result.created.id)
  }

  function handleRespond(requestId: string, decision: FamilyDecision): string | null {
    const result = respondToRequest(requests, requestId, profile.id, decision, Date.now())
    if (!result.ok) return result.error
    setRequests(result.requests)
    return null
  }

  // Each person only sees requests that belong to them (the database enforces
  // the same rule with Row Level Security once requests move there in Phase 5).
  const myRequests = requests.filter((r) =>
    role === 'elder' ? r.elderId === profile.id : r.familyId === profile.id,
  )

  function renderPage() {
    switch (view.name) {
      case 'elderHome':
        return (
          <ElderHome
            elder={elder}
            familyMember={familyMember}
            requests={myRequests}
            nowMs={nowMs}
            onCreateRequest={() => goTo({ name: 'createRequest' })}
            onOpenRequest={openRequest}
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
            requests={myRequests}
            nowMs={nowMs}
            onOpenRequest={openRequest}
          />
        )
      case 'requestDetail': {
        const request = myRequests.find((r) => r.id === view.requestId)
        return (
          <RequestDetail
            request={request}
            elder={request && findPerson(request.elderId)}
            familyMember={request && findPerson(request.familyId)}
            viewerRole={role}
            nowMs={nowMs}
            onRespond={handleRespond}
            onBack={() => goTo(homeFor(role))}
          />
        )
      }
      case 'about':
        return <AboutSafety />
    }
  }

  return (
    <Layout
      account={{ displayName: profile.displayName, onSignOut }}
      nav={{ role, currentView: view.name, onNavigate: goTo }}
    >
      {renderPage()}
    </Layout>
  )
}

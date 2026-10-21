import { useState } from 'react'
import { Layout } from './components/Layout'
import { useNow } from './hooks/useNow'
import { findProfile, mockElder, mockFamily, mockRequests } from './mock/mockData'
import { createRequest, respondToRequest } from './mock/mockStore'
import { AboutSafety } from './pages/AboutSafety'
import { CreateRequest } from './pages/CreateRequest'
import { ElderHome } from './pages/ElderHome'
import { FamilyInbox } from './pages/FamilyInbox'
import { RequestDetail } from './pages/RequestDetail'
import type { FamilyDecision, MoneyRequest, NewRequestInput, UserRole } from './types/domain'
import type { View } from './types/view'

function homeFor(role: UserRole): View {
  return role === 'elder' ? { name: 'elderHome' } : { name: 'familyInbox' }
}

export default function App() {
  const [role, setRole] = useState<UserRole>('elder')
  const [view, setView] = useState<View>({ name: 'elderHome' })
  // The shared mock store: ONE list that both the elder and family screens read.
  // It lives only in this browser tab's memory and is lost on reload.
  const [requests, setRequests] = useState<MoneyRequest[]>(mockRequests)
  // Re-render every second so pending requests turn "expired" on time.
  const nowMs = useNow()

  // Every screen change goes through here, so each new screen starts at the top
  // (otherwise a phone stays scrolled halfway down the previous screen).
  function goTo(nextView: View) {
    setView(nextView)
    window.scrollTo(0, 0)
  }

  function switchRole(nextRole: UserRole) {
    setRole(nextRole)
    // Both people may view the same request, so stay on it; otherwise go home.
    if (view.name !== 'requestDetail') goTo(homeFor(nextRole))
  }

  function openRequest(requestId: string) {
    goTo({ name: 'requestDetail', requestId })
  }

  function handleCreate(input: NewRequestInput) {
    const result = createRequest(
      requests,
      input,
      { elderId: mockElder.id, familyId: mockFamily.id },
      Date.now(),
    )
    setRequests(result.requests)
    openRequest(result.created.id)
  }

  function handleRespond(requestId: string, decision: FamilyDecision): string | null {
    const result = respondToRequest(requests, requestId, mockFamily.id, decision, Date.now())
    if (!result.ok) return result.error
    setRequests(result.requests)
    return null
  }

  // Mock "queries": each person only sees requests that belong to them.
  // Phase 3 moves this rule into the database (Row Level Security).
  const elderRequests = requests.filter((r) => r.elderId === mockElder.id)
  const familyRequests = requests.filter((r) => r.familyId === mockFamily.id)

  function renderPage() {
    switch (view.name) {
      case 'elderHome':
        return (
          <ElderHome
            elder={mockElder}
            familyMember={mockFamily}
            requests={elderRequests}
            nowMs={nowMs}
            onCreateRequest={() => goTo({ name: 'createRequest' })}
            onOpenRequest={openRequest}
          />
        )
      case 'createRequest':
        return (
          <CreateRequest
            familyMember={mockFamily}
            onSubmit={handleCreate}
            onCancel={() => goTo({ name: 'elderHome' })}
          />
        )
      case 'familyInbox':
        return (
          <FamilyInbox
            familyMember={mockFamily}
            requests={familyRequests}
            nowMs={nowMs}
            onOpenRequest={openRequest}
          />
        )
      case 'requestDetail': {
        const request = requests.find((r) => r.id === view.requestId)
        return (
          <RequestDetail
            request={request}
            elder={request && findProfile(request.elderId)}
            familyMember={request && findProfile(request.familyId)}
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
    <Layout role={role} currentView={view.name} onSwitchRole={switchRole} onNavigate={goTo}>
      {renderPage()}
    </Layout>
  )
}

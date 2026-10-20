import { useState } from 'react'
import { Layout } from './components/Layout'
import { findProfile, mockElder, mockFamily, mockRequests } from './mock/mockData'
import { AboutSafety } from './pages/AboutSafety'
import { CreateRequest } from './pages/CreateRequest'
import { ElderHome } from './pages/ElderHome'
import { FamilyInbox } from './pages/FamilyInbox'
import { RequestDetail } from './pages/RequestDetail'
import type { UserRole } from './types/domain'
import type { View } from './types/view'

export default function App() {
  // Two pieces of state decide what is on screen.
  const [role, setRole] = useState<UserRole>('elder')
  const [view, setView] = useState<View>({ name: 'elderHome' })

  // Every screen change goes through here, so each new screen starts at the top
  // (otherwise a phone stays scrolled halfway down the previous screen).
  function goTo(nextView: View) {
    setView(nextView)
    window.scrollTo(0, 0)
  }

  function switchRole(nextRole: UserRole) {
    setRole(nextRole)
    goTo(nextRole === 'elder' ? { name: 'elderHome' } : { name: 'familyInbox' })
  }

  function openRequest(requestId: string) {
    goTo({ name: 'requestDetail', requestId })
  }

  // Mock "queries": each person only sees requests that belong to them.
  // Phase 3 moves this rule into the database (Row Level Security).
  const elderRequests = mockRequests.filter((r) => r.elderId === mockElder.id)
  const familyRequests = mockRequests.filter((r) => r.familyId === mockFamily.id)

  function renderPage() {
    switch (view.name) {
      case 'elderHome':
        return (
          <ElderHome
            elder={mockElder}
            familyMember={mockFamily}
            requests={elderRequests}
            onCreateRequest={() => goTo({ name: 'createRequest' })}
            onOpenRequest={openRequest}
          />
        )
      case 'createRequest':
        return (
          <CreateRequest
            familyMember={mockFamily}
            onCancel={() => goTo({ name: 'elderHome' })}
          />
        )
      case 'familyInbox':
        return (
          <FamilyInbox
            familyMember={mockFamily}
            requests={familyRequests}
            onOpenRequest={openRequest}
          />
        )
      case 'requestDetail': {
        const request = mockRequests.find((r) => r.id === view.requestId)
        return (
          <RequestDetail
            request={request}
            elder={request && findProfile(request.elderId)}
            familyMember={request && findProfile(request.familyId)}
            viewerRole={role}
            onBack={() => switchRole(role)}
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

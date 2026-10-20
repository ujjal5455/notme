import type { ReactNode } from 'react'
import type { UserRole } from '../types/domain'
import type { View, ViewName } from '../types/view'

interface LayoutProps {
  role: UserRole
  currentView: ViewName
  onSwitchRole: (role: UserRole) => void
  onNavigate: (view: View) => void
  children: ReactNode
}

const NAV_ITEMS: Record<UserRole, { label: string; view: View }[]> = {
  elder: [
    { label: 'Home', view: { name: 'elderHome' } },
    { label: 'New request', view: { name: 'createRequest' } },
    { label: 'Safety', view: { name: 'about' } },
  ],
  family: [
    { label: 'Inbox', view: { name: 'familyInbox' } },
    { label: 'Safety', view: { name: 'about' } },
  ],
}

/** The frame around every page: header, demo notice, navigation, then the page itself. */
export function Layout({ role, currentView, onSwitchRole, onNavigate, children }: LayoutProps) {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to main content
      </a>
      <header className="app-header">
        <p className="brand">Notme</p>
        {/* Demo-only switch. Phase 4 replaces it with real sign-in. */}
        <div className="role-switch" role="group" aria-label="Demo: view the app as">
          <button
            type="button"
            aria-pressed={role === 'elder'}
            onClick={() => onSwitchRole('elder')}
          >
            Elder
          </button>
          <button
            type="button"
            aria-pressed={role === 'family'}
            onClick={() => onSwitchRole('family')}
          >
            Family
          </button>
        </div>
      </header>

      <p className="demo-banner">
        Demo prototype with made-up data. No real money is sent.
      </p>

      <nav className="app-nav" aria-label="Main">
        {NAV_ITEMS[role].map((item) => (
          <button
            key={item.label}
            type="button"
            aria-current={currentView === item.view.name ? 'page' : undefined}
            onClick={() => onNavigate(item.view)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <main id="main" tabIndex={-1}>
        {children}
      </main>
    </>
  )
}

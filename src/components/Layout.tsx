import type { ReactNode } from 'react'
import type { UserRole } from '../types/domain'
import type { View, ViewName } from '../types/view'

interface LayoutProps {
  /** Who is signed in. Leave out on the sign-in screen. */
  account?: { displayName: string | null; onSignOut: () => void }
  /** The menu. Only shown once the person is signed in, has a role and is linked. */
  nav?: { role: UserRole; currentView: ViewName; onNavigate: (view: View) => void }
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
export function Layout({ account, nav, children }: LayoutProps) {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to main content
      </a>
      <header className="app-header">
        <p className="brand">Notme</p>
        {account && (
          <div className="account">
            {account.displayName && <span>{account.displayName}</span>}
            <button type="button" onClick={account.onSignOut}>
              Sign out
            </button>
          </div>
        )}
      </header>

      <p className="demo-banner">
        <strong>Demo prototype:</strong> made-up people and data only. No real money is sent.
      </p>

      {nav && (
        <nav className="app-nav" aria-label="Main">
          {NAV_ITEMS[nav.role].map((item) => (
            <button
              key={item.label}
              type="button"
              aria-current={nav.currentView === item.view.name ? 'page' : undefined}
              onClick={() => nav.onNavigate(item.view)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      )}

      <main id="main" tabIndex={-1}>
        {children}
      </main>
    </>
  )
}

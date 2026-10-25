import { useEffect, useRef, useState } from 'react'
import { ConnectionNotice } from './components/ConnectionNotice'
import { Layout } from './components/Layout'
import { NotificationsBanner } from './components/NotificationsBanner'
import { QuickAccessBanner } from './components/QuickAccessBanner'
import { REQUEST_TIMEOUT_SECONDS } from './config'
import { useBackButton } from './hooks/useBackButton'
import { useMyRequests } from './hooks/useMyRequests'
import { useNewWarnings } from './hooks/useNewWarnings'
import { useNow } from './hooks/useNow'
import { usePushNotifications } from './hooks/usePushNotifications'
import { useQuickAccess } from './hooks/useQuickAccess'
import { useRequestUpdates } from './hooks/useRequestUpdates'
import { useServerOffset } from './hooks/useServerOffset'
import { unlockAlertSound } from './lib/alertSound'
import { createMoneyRequest, respondToRequest, sendAlert } from './lib/api/requests'
import { AboutSafety } from './pages/AboutSafety'
import { CreateRequest } from './pages/CreateRequest'
import { ElderHome } from './pages/ElderHome'
import { FamilyInbox } from './pages/FamilyInbox'
import { RequestDetail } from './pages/RequestDetail'
import type { AlertState, FamilyDecision, NewRequestInput, Profile, UserRole } from './types/domain'
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

/** The switchboard for a signed-in, linked person. Requests come from Supabase and stay live. */
export function SignedInApp({ profile, linkedPerson, onSignOut }: SignedInAppProps) {
  const role = profile.role
  const elder = role === 'elder' ? profile : linkedPerson
  const familyMember = role === 'family' ? profile : linkedPerson

  const [view, setView] = useState<View>(() => homeFor(role))
  // Row Level Security sends only this person's requests, so no filtering is needed here.
  const { requests, loading, error, reload, refetch, upsert } = useMyRequests(profile.id)
  // Live updates from Supabase Realtime, or polling every few seconds if that fails.
  const { status: live, checkNow } = useRequestUpdates(profile.id, upsert, refetch)
  // "Now" in SERVER time, refreshed every second, so pending requests turn
  // "expired" on time even on a phone whose clock is wrong. Display only:
  // the database itself refuses late answers.
  const serverOffsetMs = useServerOffset()
  const nowMs = useNow() + serverOffsetMs
  const { newWarnings, markSeen } = useNewWarnings(requests, nowMs, serverOffsetMs, role === 'elder')
  // Elder: how the phone alert for each request went (onsite, Phase 4). Kept only
  // while the app is open; after a reload the saved alertSentAt shows "sent".
  const [alerts, setAlerts] = useState<Record<string, AlertState>>({})

  // Browsers only allow sound after the person has tapped or typed on the page,
  // so unlock the warning beep at their first tap or key press.
  useEffect(() => {
    document.addEventListener('pointerdown', unlockAlertSound)
    document.addEventListener('keydown', unlockAlertSound)
    return () => {
      document.removeEventListener('pointerdown', unlockAlertSound)
      document.removeEventListener('keydown', unlockAlertSound)
    }
  }, [])

  // After each screen change, move keyboard and screen-reader focus to the new
  // screen's content (not on the first draw, so the page doesn't jump on load).
  const firstDraw = useRef(true)
  useEffect(() => {
    if (firstDraw.current) {
      firstDraw.current = false
      return
    }
    document.getElementById('main')?.focus({ preventScroll: true })
  }, [view])

  // Every screen change goes through here, so each new screen starts at the top.
  function goTo(nextView: View) {
    // Leaving a request's screen means the elder has seen what happened to it.
    if (view.name === 'requestDetail') markSeen(view.requestId)
    setView(nextView)
    window.scrollTo(0, 0)
  }

  // Android's Back button: from any other screen, go to this person's home
  // screen; on the home screen, let the hook minimise the app.
  useBackButton(() => {
    const home = homeFor(role)
    if (view.name === home.name) return false
    goTo(home)
    return true
  })

  function openRequest(requestId: string) {
    markSeen(requestId)
    goTo({ name: 'requestDetail', requestId })
  }

  // Family member on Android: alerts that ring the phone, and tapping one opens the request.
  const push = usePushNotifications(role === 'family', openRequest)
  // Elder on Android: a quick button in the notification shade that opens "Send a money alert".
  const quick = useQuickAccess(role === 'elder', familyMember.displayName, () => goTo({ name: 'createRequest' }))

  /** Remove this phone's alert token and quick button first (needs the session), then sign out. */
  async function handleSignOut() {
    await Promise.all([push.forgetDevice(), quick.remove()])
    onSignOut()
  }

  function findPerson(id: string): Profile | undefined {
    return [profile, linkedPerson].find((person) => person.id === id)
  }

  /** May throw (no connection, not linked…); RequestForm shows the message. */
  async function handleCreate(input: NewRequestInput) {
    unlockAlertSound() // still inside the Send tap, so the browser allows it
    const created = await createMoneyRequest(input, REQUEST_TIMEOUT_SECONDS)
    upsert(created)
    openRequest(created.id)
    // The request is saved either way; the alert is the extra "ring their phone" step.
    void alertFamily(created.id)
  }

  /** Ask the server to ring the family member's phone; never throws (the screen shows the outcome). */
  async function alertFamily(requestId: string) {
    setAlerts((previous) => ({ ...previous, [requestId]: 'sending' }))
    let outcome: AlertState
    try {
      outcome = await sendAlert(requestId)
    } catch {
      outcome = 'failed'
    }
    setAlerts((previous) => ({ ...previous, [requestId]: outcome }))
  }

  /**
   * Show only what the database saved, never a guess. If the answer is refused
   * (already answered, expired…), reload so the screen shows the real state,
   * then let FamilyResponse show the database's message.
   */
  async function handleRespond(requestId: string, decision: FamilyDecision) {
    try {
      upsert(await respondToRequest(requestId, decision))
    } catch (e) {
      await refetch().catch(() => {})
      throw e
    }
  }

  function renderPage() {
    switch (view.name) {
      case 'elderHome':
        return (
          <ElderHome
            elder={elder}
            familyMember={familyMember}
            requests={requests}
            newWarnings={newWarnings}
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
            alert={request && (alerts[request.id] ?? (request.alertSentAt ? 'sent' : undefined))}
            onRetryAlert={() => void alertFamily(view.requestId)}
            onRespond={handleRespond}
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
      account={{ displayName: profile.displayName, onSignOut: () => void handleSignOut() }}
      nav={{ role, currentView: view.name, onNavigate: goTo }}
    >
      <ConnectionNotice live={live} loadError={error} onRetry={checkNow} />
      <NotificationsBanner
        permission={push.permission}
        error={push.error}
        elderName={elder.displayName}
        onTurnOn={() => void push.turnOn()}
      />
      <QuickAccessBanner
        permission={quick.permission}
        error={quick.error}
        familyName={familyMember.displayName}
        onTurnOn={() => void quick.turnOn()}
      />
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

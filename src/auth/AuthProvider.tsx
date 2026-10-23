import type { User } from '@supabase/supabase-js'
import { type ReactNode, useEffect, useState } from 'react'
import { getMyLinks, type MyLink } from '../lib/api/pairing'
import { getMyProfile } from '../lib/api/profile'
import { supabase } from '../lib/supabaseClient'
import type { Profile } from '../types/domain'
import { AuthContext, type AuthValue } from './authContext'

/** The result of loading one user's account, labelled with which load it belongs to. */
interface Loaded {
  key: string
  profile?: Profile | null
  link?: MyLink | null
  error?: string
}

/** Keeps track of the signed-in user, their profile and their family link, for the whole app. */
export function AuthProvider({ children }: { children: ReactNode }) {
  // undefined = still checking; null = nobody signed in
  const [user, setUser] = useState<User | null | undefined>(undefined)
  const [reloadKey, setReloadKey] = useState(0)
  const [loaded, setLoaded] = useState<Loaded | null>(null)

  // Effect 1: who is signed in? Check the saved session once, then listen for
  // sign-in, sign-out and token refreshes until this component goes away.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null))
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  // Effect 2: load that user's profile and family link.
  // loadKey names THIS load ("user id # reload number"), so a slow, older load
  // can never overwrite a newer one.
  const userId = user?.id
  const loadKey = userId ? `${userId}#${reloadKey}` : null
  useEffect(() => {
    if (!userId || !loadKey) return
    let ignore = false
    Promise.all([getMyProfile(userId), getMyLinks(userId)])
      .then(([profile, links]) => {
        if (!ignore) setLoaded({ key: loadKey, profile, link: links[0] ?? null })
      })
      .catch((e: unknown) => {
        const message = e instanceof Error ? e.message : 'Could not load your account.'
        if (!ignore) setLoaded({ key: loadKey, error: message })
      })
    return () => {
      ignore = true
    }
  }, [userId, loadKey])

  const refresh = () => setReloadKey((k) => k + 1)
  const signOut = () => {
    // Not awaited on purpose: onAuthStateChange above reports the sign-out.
    void supabase.auth.signOut()
  }

  // Only trust a result that belongs to the current user and the current load.
  const current = loaded && loaded.key === loadKey ? loaded : null

  let value: AuthValue
  if (user === undefined) value = { status: 'loading' }
  else if (user === null) value = { status: 'signedOut' }
  else if (!current) value = { status: 'loading' }
  else if (current.error) value = { status: 'error', message: current.error, retry: refresh, signOut }
  else {
    value = {
      status: 'signedIn',
      user,
      profile: current.profile ?? null,
      link: current.link ?? null,
      refresh,
      signOut,
    }
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

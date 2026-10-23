import type { User } from '@supabase/supabase-js'
import { createContext, useContext } from 'react'
import type { MyLink } from '../lib/api/pairing'
import type { Profile } from '../types/domain'

/** Everything the app needs to know about who is using it. */
export type AuthValue =
  | { status: 'loading' }
  | { status: 'signedOut' }
  | { status: 'error'; message: string; retry: () => void; signOut: () => void }
  | {
      status: 'signedIn'
      user: User
      /** null until the person chooses a role (ChooseRole screen). */
      profile: Profile | null
      /** null until the person is paired. The prototype's screens use the first link. */
      link: MyLink | null
      /** Reload the profile and link, e.g. after choosing a role or pairing. */
      refresh: () => void
      signOut: () => void
    }

export const AuthContext = createContext<AuthValue>({ status: 'loading' })

/** Read who is signed in, from anywhere below <AuthProvider>. */
export function useAuth(): AuthValue {
  return useContext(AuthContext)
}

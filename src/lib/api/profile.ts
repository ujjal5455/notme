import type { Profile, UserRole } from '../../types/domain'
import { supabase } from '../supabaseClient'
import { friendlyMessage } from './errors'

/** A profile row exactly as the database returns it (snake_case). */
export interface ProfileRow {
  id: string
  role: UserRole
  display_name: string
}

export function toProfile(row: ProfileRow): Profile {
  return { id: row.id, role: row.role, displayName: row.display_name }
}

/** The signed-in user's own profile, or null if they have not chosen a role yet. */
export async function getMyProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, role, display_name')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw new Error(friendlyMessage(error.message))
  return data ? toProfile(data) : null
}

/** Choose a role once. The database uses the caller's own id (auth.uid()), never one we send. */
export async function createMyProfile(role: UserRole, displayName: string): Promise<Profile> {
  const { data, error } = await supabase.rpc('create_my_profile', {
    p_role: role,
    p_display_name: displayName,
  })
  if (error) throw new Error(friendlyMessage(error.message))
  return toProfile(data)
}

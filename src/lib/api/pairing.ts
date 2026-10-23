import type { Profile } from '../../types/domain'
import { supabase } from '../supabaseClient'
import { friendlyMessage } from './errors'
import { type ProfileRow, toProfile } from './profile'

/** A trusted-family link, seen from the signed-in user's side. */
export interface MyLink {
  elderId: string
  familyId: string
  /** The other person in the link: the family member for an elder, the elder for a family member. */
  linkedPerson: Profile
}

export interface PairingCode {
  code: string
  expiresAt: string
}

/**
 * Every link the signed-in user belongs to. No filter is needed:
 * Row Level Security only returns links where the caller is the elder or the family member.
 */
export async function getMyLinks(userId: string): Promise<MyLink[]> {
  const { data: links, error } = await supabase.from('family_links').select('elder_id, family_id')
  if (error) throw new Error(friendlyMessage(error.message))
  if (links.length === 0) return []

  const otherIds = links.map((l) => (l.elder_id === userId ? l.family_id : l.elder_id))
  const { data: people, error: peopleError } = await supabase
    .from('profiles')
    .select('id, role, display_name')
    .in('id', otherIds)
  if (peopleError) throw new Error(friendlyMessage(peopleError.message))

  return links.map((l) => {
    const otherId = l.elder_id === userId ? l.family_id : l.elder_id
    const row = people.find((p: ProfileRow) => p.id === otherId)
    return {
      elderId: l.elder_id,
      familyId: l.family_id,
      // If the profile somehow cannot be read, show a placeholder instead of crashing.
      linkedPerson: row
        ? toProfile(row)
        : {
            id: otherId,
            role: l.elder_id === userId ? 'family' : 'elder',
            displayName: 'Your family member',
          },
    }
  })
}

/** Elder: get a fresh one-time code (valid for 10 minutes) to show in person. */
export async function createPairingCode(): Promise<PairingCode> {
  const { data, error } = await supabase.rpc('create_pairing_code')
  if (error) throw new Error(friendlyMessage(error.message))
  return { code: data.code, expiresAt: data.expires_at }
}

/** Family member: type the code you were shown. The database accepts dashes, spaces and lower case. */
export async function redeemPairingCode(code: string): Promise<void> {
  const { error } = await supabase.rpc('redeem_pairing_code', { p_code: code })
  if (error) throw new Error(friendlyMessage(error.message))
}

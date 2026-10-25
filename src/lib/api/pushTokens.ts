import { supabase } from '../supabaseClient'
import { friendlyMessage } from './errors'

/**
 * Family member's phone: save its push-notification device token (onsite,
 * Phase 3). Only the token is sent; the database stores it for the signed-in
 * account (auth.uid()), never for an id the browser chooses.
 */
export async function registerPushToken(token: string): Promise<void> {
  const { error } = await supabase.rpc('register_push_token', { p_token: token })
  if (error) throw new Error(friendlyMessage(error.message))
}

/** Before signing out: stop sending alerts to this phone. Removes only the caller's own token. */
export async function unregisterPushToken(token: string): Promise<void> {
  const { error } = await supabase.rpc('unregister_push_token', { p_token: token })
  if (error) throw new Error(friendlyMessage(error.message))
}

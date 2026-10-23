import { supabase } from '../supabaseClient'

/**
 * How far the database clock is ahead of this phone's clock, in milliseconds
 * (negative if behind). Add it to Date.now() to get "server time".
 *
 * The answer takes time to travel back, so we assume the server read its
 * clock halfway through the round trip:
 *
 *   sent ────────── server reads its clock ────────── received
 *   t0                    serverMs                     t1
 *   offset ≈ serverMs − (t0 + t1) / 2
 *
 * Throws if the server can't be reached or 0005_server_time.sql was not run.
 */
export async function measureServerOffset(): Promise<number> {
  const t0 = Date.now()
  const { data, error } = await supabase.rpc('server_now')
  const t1 = Date.now()
  if (error) throw new Error(error.message)
  const serverMs = Date.parse(String(data))
  if (Number.isNaN(serverMs)) throw new Error('The server sent an unreadable time.')
  return serverMs - (t0 + t1) / 2
}

// Turns a raw error message from Supabase into text a person can act on.
// Shared by every file in src/lib/api/.

export const NETWORK_MESSAGE = 'Could not connect. Check your internet connection and try again.'

export function friendlyMessage(message: string): string {
  // The browser says "Failed to fetch" (or similar) when the request never reached Supabase.
  if (/fetch|network/i.test(message)) return NETWORK_MESSAGE
  // Our SQL functions (0003_functions.sql) already raise messages written for people,
  // e.g. "That code has expired. Ask for a new one.", so show those unchanged.
  return message
}

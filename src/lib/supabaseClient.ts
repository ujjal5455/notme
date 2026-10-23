import { createClient } from '@supabase/supabase-js'

// The two PUBLIC values from .env.local (see .env.example).
// Vite only exposes variables whose names start with VITE_, and it copies
// them into the browser code, so a secret key must NEVER be put here.
const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!url || !key) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY. Copy .env.example to .env.local and fill them in.',
  )
}

/**
 * The one Supabase client for the whole app. Uses only the PUBLIC key.
 * It remembers the signed-in session (in localStorage), adds the user's
 * access token to every request, and refreshes the token before it expires.
 */
export const supabase = createClient(url, key)

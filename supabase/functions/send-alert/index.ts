// Supabase Edge Function "send-alert" (onsite, Phase 4). Runs on Supabase's
// servers (Deno), never on a phone, so it can hold secrets.
//
// The elder's app calls it right after creating a request:
//   supabase.functions.invoke('send-alert', { body: { request_id } })
// It rings the linked family member's phone through Firebase Cloud Messaging.
//
// Safety rules (project brief):
// * The caller must be signed in, and must be the ELDER who made the request.
// * The request must still be pending and not expired.
// * Who receives the alert comes from the database (family_id), never from
//   the request body.
// * At most one successful alert per request (alert_sent_at, 0008).
//
// Secrets: FCM_SERVICE_ACCOUNT (Firebase service-account JSON) is set in
// Supabase → Edge Functions → Secrets. SUPABASE_URL and the API keys are
// provided by Supabase automatically.
import { createClient } from 'npm:@supabase/supabase-js@2'
import {
  buildAlertMessage,
  describeFcmError,
  fcmErrorCode,
  GOOGLE_TOKEN_URL,
  isUuid,
  parseServiceAccount,
  shouldDeleteToken,
  signServiceAccountJwt,
  type ServiceAccount,
} from './fcm.ts'

/** New projects get JSON dictionaries of keys; older ones the legacy single keys. */
function apiKey(kind: 'publishable' | 'secret'): string {
  const dictionary = Deno.env.get(kind === 'publishable' ? 'SUPABASE_PUBLISHABLE_KEYS' : 'SUPABASE_SECRET_KEYS')
  if (dictionary) {
    try {
      const keys = JSON.parse(dictionary) as Record<string, string>
      if (keys.default) return keys.default
    } catch {
      // fall through to the legacy name
    }
  }
  const legacy = Deno.env.get(kind === 'publishable' ? 'SUPABASE_ANON_KEY' : 'SUPABASE_SERVICE_ROLE_KEY')
  if (legacy) return legacy
  throw new Error(`No ${kind} API key is available to the function.`)
}

function cors(req: Request): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    // Allow whatever headers supabase-js asks for (authorization, apikey, …).
    'Access-Control-Allow-Headers':
      req.headers.get('Access-Control-Request-Headers') ?? 'authorization, x-client-info, apikey, content-type',
  }
}

function reply(req: Request, status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(req), 'Content-Type': 'application/json' },
  })
}

// Google access tokens last an hour; keep one while this function instance is warm.
let cachedToken: { value: string; expiresAtMs: number } | null = null

async function fcmAccessToken(account: ServiceAccount): Promise<string> {
  if (cachedToken && cachedToken.expiresAtMs > Date.now() + 60_000) return cachedToken.value
  const assertion = await signServiceAccountJwt(account, Math.floor(Date.now() / 1000))
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
  })
  const body = await response.json()
  if (!response.ok || !body.access_token) throw new Error(`Google sign-in for FCM failed (${response.status}).`)
  cachedToken = { value: body.access_token, expiresAtMs: Date.now() + Number(body.expires_in ?? 3600) * 1000 }
  return cachedToken.value
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) })
  if (req.method !== 'POST') return reply(req, 405, { error: 'Use POST.' })

  try {
    // 1. Who is calling? (Their login token, forwarded by supabase-js.)
    const authorization = req.headers.get('Authorization') ?? ''
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const asCaller = createClient(supabaseUrl, apiKey('publishable'), {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false },
    })
    const jwt = authorization.replace(/^Bearer\s+/i, '')
    const { data: userData, error: userError } = await asCaller.auth.getUser(jwt)
    if (userError || !userData.user) return reply(req, 401, { error: 'You need to sign in first.' })
    const callerId = userData.user.id

    // 2. Which request? Only an id is accepted from the app.
    const { request_id: requestId } = (await req.json().catch(() => ({}))) as { request_id?: unknown }
    if (!isUuid(requestId)) return reply(req, 400, { error: 'A valid request_id is required.' })

    // 3. Read it AS THE CALLER: Row Level Security hides other people's requests.
    const { data: request, error: readError } = await asCaller
      .from('money_requests')
      .select('id, elder_id, family_id, amount_inr, status, expires_at')
      .eq('id', requestId)
      .maybeSingle()
    if (readError) throw new Error(readError.message)
    if (!request || request.elder_id !== callerId) return reply(req, 404, { error: 'Request not found.' })
    const ttlSeconds = (Date.parse(request.expires_at) - Date.now()) / 1000
    if (request.status !== 'pending' || ttlSeconds <= 0) {
      return reply(req, 409, { error: 'This request is no longer waiting for an answer.' })
    }

    // Fail early (before changing anything) if the Firebase secret is missing.
    const account = parseServiceAccount(Deno.env.get('FCM_SERVICE_ACCOUNT'))

    // 4. Claim the alert: only one caller can turn alert_sent_at from empty to a time.
    const admin = createClient(supabaseUrl, apiKey('secret'), { auth: { persistSession: false } })
    const { data: claimed, error: claimError } = await admin
      .from('money_requests')
      .update({ alert_sent_at: new Date().toISOString() })
      .eq('id', request.id)
      .eq('status', 'pending')
      .is('alert_sent_at', null)
      .select('id')
    if (claimError) throw new Error(claimError.message)
    if (!claimed || claimed.length === 0) return reply(req, 200, { sent: 0, reason: 'already_sent' })

    // From here on, if nothing is sent, clear the claim so the elder's Retry can work.
    let sent = 0
    try {
      // 5. The receiver comes from the database row, never from the app.
      const [{ data: elder }, { data: tokens, error: tokenError }] = await Promise.all([
        admin.from('profiles').select('display_name').eq('id', request.elder_id).maybeSingle(),
        admin.from('push_tokens').select('token').eq('user_id', request.family_id),
      ])
      if (tokenError) throw new Error(tokenError.message)
      if (!tokens || tokens.length === 0) return reply(req, 200, { sent: 0, reason: 'no_device' })

      // 6. Ring every phone the family member has signed in on.
      const accessToken = await fcmAccessToken(account)
      const endpoint = `https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`
      for (const { token } of tokens) {
        const message = buildAlertMessage({
          token,
          requestId: request.id,
          elderName: elder?.display_name ?? 'Your family member',
          amountInr: request.amount_inr,
          ttlSeconds,
        })
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(message),
        })
        if (response.ok) {
          sent += 1
          continue
        }
        const errorBody = await response.json().catch(() => null)
        const code = fcmErrorCode(errorBody)
        // Google's explanation (never the token or the key), e.g. "PERMISSION_DENIED: …".
        console.error(`FCM send failed: HTTP ${response.status} ${describeFcmError(errorBody)}`)
        if (shouldDeleteToken(code)) await admin.from('push_tokens').delete().eq('token', token)
      }

      // 7. Report how many phones FCM accepted the alert for.
      return sent > 0
        ? reply(req, 200, { sent })
        : reply(req, 502, { error: 'The alert could not be sent.', sent: 0, reason: 'not_delivered' })
    } finally {
      if (sent === 0) {
        await admin.from('money_requests').update({ alert_sent_at: null }).eq('id', request.id)
      }
    }
  } catch (error) {
    console.error('send-alert failed:', error instanceof Error ? error.message : error)
    return reply(req, 500, { error: 'The alert could not be sent.' })
  }
})

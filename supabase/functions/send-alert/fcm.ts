// Pure helpers for the send-alert Edge Function (onsite, Phase 4).
// No Deno-only code here, so Vitest can test them (fcm.test.ts).
//
// How the server talks to Firebase Cloud Messaging (FCM HTTP v1):
// 1. Prove who we are: sign a short "JWT" with the Firebase service
//    account's private key and swap it at Google for an access token.
// 2. POST one message per device token to
//    https://fcm.googleapis.com/v1/projects/<project id>/messages:send

export const FCM_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging'
export const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'

/**
 * The notification channel alerts ask for. Phase 4 asks for the future
 * alarm channel (backlog E1). Until the app creates it, Android's Firebase
 * library falls back to the default channel in AndroidManifest.xml
 * ("money-alerts", created by src/lib/push.ts).
 */
export const ALERT_CHANNEL_ID = 'money-alarm'

/** The parts of a Firebase service-account JSON file that we use. */
export interface ServiceAccount {
  project_id: string
  client_email: string
  private_key: string
}

export function parseServiceAccount(json: string | undefined): ServiceAccount {
  if (!json) throw new Error('The FCM_SERVICE_ACCOUNT secret is not set.')
  const parsed = JSON.parse(json) as Partial<ServiceAccount>
  if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
    throw new Error('FCM_SERVICE_ACCOUNT is not a Firebase service-account key.')
  }
  return { project_id: parsed.project_id, client_email: parsed.client_email, private_key: parsed.private_key }
}

/** Base64url = base64 with URL-safe characters and no padding (used by JWTs). */
export function base64url(input: string | Uint8Array): string {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** "-----BEGIN PRIVATE KEY-----…" text → the raw bytes Web Crypto can import. */
export function pemToDer(pem: string): ArrayBuffer {
  const body = pem.replace(/-----(BEGIN|END) PRIVATE KEY-----/g, '').replace(/\s+/g, '')
  const binary = atob(body)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

/** A signed JWT asking Google for an FCM access token (valid for at most 1 hour). */
export async function signServiceAccountJwt(account: ServiceAccount, nowSeconds: number): Promise<string> {
  const header = { alg: 'RS256', typ: 'JWT' }
  const claims = {
    iss: account.client_email,
    scope: FCM_SCOPE,
    aud: GOOGLE_TOKEN_URL,
    iat: nowSeconds,
    exp: nowSeconds + 3600,
  }
  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claims))}`
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToDer(account.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned))
  return `${unsigned}.${base64url(new Uint8Array(signature))}`
}

export function formatInr(amount: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)
}

export interface AlertDetails {
  token: string
  requestId: string
  elderName: string
  amountInr: number
  /** Seconds until the request expires: FCM drops the alert after that. */
  ttlSeconds: number
}

/**
 * One FCM message. Only the elder's display name, the amount and the
 * request id leave Supabase (they pass through Google's servers).
 */
export function buildAlertMessage(alert: AlertDetails) {
  return {
    message: {
      token: alert.token,
      notification: {
        title: `Money alert from ${alert.elderName}`,
        body: `${alert.elderName} is being asked to send ${formatInr(alert.amountInr)}. Call them on a number you already trust, then answer in Notme.`,
      },
      // FCM data values must be strings.
      data: { request_id: alert.requestId },
      android: {
        priority: 'high', // delivered at once, even in Doze
        ttl: `${Math.max(0, Math.floor(alert.ttlSeconds))}s`, // useless after the deadline
        notification: {
          channel_id: ALERT_CHANNEL_ID,
          notification_priority: 'PRIORITY_MAX',
          visibility: 'PUBLIC', // urgent: shown on the lock screen
          default_sound: true,
          default_vibrate_timings: true,
          tag: alert.requestId, // the same request never shows twice
        },
      },
    },
  }
}

/** The FcmError code inside an FCM error response, e.g. "UNREGISTERED". */
export function fcmErrorCode(body: unknown): string | null {
  const details = (body as { error?: { details?: { '@type'?: string; errorCode?: string }[] } })?.error?.details
  const fcm = details?.find((d) => d['@type'] === 'type.googleapis.com/google.firebase.fcm.v1.FcmError')
  return fcm?.errorCode ?? null
}

/**
 * A one-line, log-safe summary of an FCM/Google error, e.g.
 * "PERMISSION_DENIED: Firebase Cloud Messaging API has not been used…".
 * Google's messages never contain the device token or the key.
 */
export function describeFcmError(body: unknown): string {
  const error = (body as { error?: { status?: string; message?: string } })?.error
  const code = fcmErrorCode(body)
  const parts = [error?.status, code && code !== error?.status ? `(${code})` : null].filter(Boolean)
  const message = (error?.message ?? '').replace(/\s+/g, ' ').slice(0, 300)
  return `${parts.join(' ')}${message ? `: ${message}` : ''}` || 'no details'
}

/** Firebase's error guide: only UNREGISTERED means "delete this token". */
export function shouldDeleteToken(code: string | null): boolean {
  return code === 'UNREGISTERED'
}

/** A request id from the app must look like a UUID before we query with it. */
export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

// @vitest-environment node
// Tests for the send-alert helpers (onsite, Phase 4). They run in Node with
// Vitest; the Edge Function itself (index.ts) runs in Deno on Supabase.
import { describe, expect, it } from 'vitest'
import {
  ALERT_CHANNEL_ID,
  base64url,
  buildAlertMessage,
  fcmErrorCode,
  FCM_SCOPE,
  GOOGLE_TOKEN_URL,
  isUuid,
  parseServiceAccount,
  shouldDeleteToken,
  signServiceAccountJwt,
} from './fcm'

const alert = {
  token: 'device-token-1',
  requestId: '3f2c8a1e-0b6d-4c2a-9e1f-1234567890ab',
  elderName: 'Asha (demo)',
  amountInr: 25000,
  ttlSeconds: 57.8,
}

function decodePart(part: string) {
  const base64 = part.replace(/-/g, '+').replace(/_/g, '/')
  return JSON.parse(Buffer.from(base64, 'base64').toString('utf8'))
}

describe('buildAlertMessage', () => {
  it('sends only the name, the amount and the request id', () => {
    const { message } = buildAlertMessage(alert)
    expect(message.token).toBe('device-token-1')
    expect(message.notification.title).toBe('Money alert from Asha (demo)')
    expect(message.notification.body).toBe(
      'Asha (demo) is being asked to send ₹25,000. Call them on a number you already trust, then answer in Notme.',
    )
    expect(message.data).toEqual({ request_id: alert.requestId })
  })

  it('is urgent, loud, on the alarm channel, and expires with the request', () => {
    const { android } = buildAlertMessage(alert).message
    expect(android.priority).toBe('high')
    expect(android.ttl).toBe('57s')
    expect(android.notification).toMatchObject({
      channel_id: ALERT_CHANNEL_ID,
      notification_priority: 'PRIORITY_MAX',
      visibility: 'PUBLIC',
      default_sound: true,
      tag: alert.requestId,
    })
    expect(ALERT_CHANNEL_ID).toBe('money-alarm')
  })

  it('never asks for a negative time-to-live', () => {
    expect(buildAlertMessage({ ...alert, ttlSeconds: -5 }).message.android.ttl).toBe('0s')
  })
})

describe('FCM errors', () => {
  const error = (errorCode: string) => ({
    error: { code: 404, details: [{ '@type': 'type.googleapis.com/google.firebase.fcm.v1.FcmError', errorCode }] },
  })

  it('reads the FcmError code', () => {
    expect(fcmErrorCode(error('UNREGISTERED'))).toBe('UNREGISTERED')
    expect(fcmErrorCode({ error: { details: [] } })).toBeNull()
    expect(fcmErrorCode(null)).toBeNull()
  })

  it('deletes a token only when FCM says it is unregistered', () => {
    expect(shouldDeleteToken('UNREGISTERED')).toBe(true)
    expect(shouldDeleteToken('INVALID_ARGUMENT')).toBe(false)
    expect(shouldDeleteToken('UNAVAILABLE')).toBe(false)
    expect(shouldDeleteToken(null)).toBe(false)
  })
})

describe('service account and JWT', () => {
  it('refuses a missing or wrong secret with a clear message', () => {
    expect(() => parseServiceAccount(undefined)).toThrow('The FCM_SERVICE_ACCOUNT secret is not set.')
    expect(() => parseServiceAccount('{"type":"something else"}')).toThrow('not a Firebase service-account key')
  })

  it('base64url has no +, / or = padding', () => {
    expect(base64url(new Uint8Array([251, 255, 254]))).toBe('-__-')
    expect(base64url('hi')).toBe('aGk')
  })

  it('signs a JWT that Google can verify with the account public key', async () => {
    // A throwaway key pair, standing in for a real service account.
    const pair = await crypto.subtle.generateKey(
      { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
      true,
      ['sign', 'verify'],
    )
    const pkcs8 = Buffer.from(await crypto.subtle.exportKey('pkcs8', pair.privateKey)).toString('base64')
    const pem = `-----BEGIN PRIVATE KEY-----\n${pkcs8.match(/.{1,64}/g)?.join('\n')}\n-----END PRIVATE KEY-----\n`
    const account = parseServiceAccount(
      JSON.stringify({ project_id: 'notme-demo', client_email: 'fcm@notme-demo.iam.example', private_key: pem }),
    )

    const jwt = await signServiceAccountJwt(account, 1_800_000_000)
    const [header, claims, signature] = jwt.split('.')
    expect(decodePart(header)).toEqual({ alg: 'RS256', typ: 'JWT' })
    expect(decodePart(claims)).toEqual({
      iss: 'fcm@notme-demo.iam.example',
      scope: FCM_SCOPE,
      aud: GOOGLE_TOKEN_URL,
      iat: 1_800_000_000,
      exp: 1_800_003_600, // at most 1 hour, as Google requires
    })
    const valid = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      pair.publicKey,
      Buffer.from(signature.replace(/-/g, '+').replace(/_/g, '/'), 'base64'),
      new TextEncoder().encode(`${header}.${claims}`),
    )
    expect(valid).toBe(true)
  })
})

describe('isUuid', () => {
  it('accepts request ids and rejects anything else', () => {
    expect(isUuid(alert.requestId)).toBe(true)
    expect(isUuid('req-1')).toBe(false)
    expect(isUuid("1' or '1'='1")).toBe(false)
    expect(isUuid(42)).toBe(false)
  })
})

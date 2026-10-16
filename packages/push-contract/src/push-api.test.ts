import { describe, expect, it } from 'vitest'
import {
  PUSH_DELAY_MAX_SECONDS,
  errorResponseSchema,
  sendPushRequestSchema,
  sendPushResponseSchema,
} from './push-api.ts'
import { DEFAULT_PUSH_SERVER_PORT, pushServerPortSchema } from './push-server-config.ts'

const validSubscription = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
  expirationTime: null,
  keys: { p256dh: 'test-p256dh-public-key', auth: 'test-auth-secret' },
}

describe('sendPushRequestSchema', () => {
  it('accepts a subscription with an https endpoint and an allowed delay', () => {
    const result = sendPushRequestSchema.safeParse({ subscription: validSubscription, delaySeconds: 10 })

    expect(result.success).toBe(true)
  })

  it('rejects a non-https endpoint so the server never posts to plain http targets', () => {
    const result = sendPushRequestSchema.safeParse({
      subscription: { ...validSubscription, endpoint: 'http://example.com/push' },
      delaySeconds: 0,
    })

    expect(result.success).toBe(false)
  })

  it.each([-1, 1.5, PUSH_DELAY_MAX_SECONDS + 1])('rejects delaySeconds=%s', (delaySeconds) => {
    const result = sendPushRequestSchema.safeParse({ subscription: validSubscription, delaySeconds })

    expect(result.success).toBe(false)
  })

  it('rejects a subscription without encryption keys', () => {
    const { endpoint } = validSubscription
    const result = sendPushRequestSchema.safeParse({ subscription: { endpoint }, delaySeconds: 0 })

    expect(result.success).toBe(false)
  })
})

describe('sendPushResponseSchema', () => {
  it('distinguishes immediate and scheduled sends by status', () => {
    const sent = sendPushResponseSchema.parse({ status: 'sent', sentAt: '2026-10-16T00:00:00.000Z' })
    const scheduled = sendPushResponseSchema.parse({ status: 'scheduled', sendAt: '2026-10-16T00:00:10.000Z' })

    expect(sent.status).toBe('sent')
    expect(scheduled.status).toBe('scheduled')
  })
})

describe('pushServerPortSchema', () => {
  it('falls back to the default port and rejects invalid values', () => {
    expect(pushServerPortSchema.parse(undefined)).toBe(DEFAULT_PUSH_SERVER_PORT)
    expect(pushServerPortSchema.parse('9000')).toBe(9000)
    expect(pushServerPortSchema.safeParse('not-a-port').success).toBe(false)
    expect(pushServerPortSchema.safeParse('70000').success).toBe(false)
  })
})

describe('errorResponseSchema', () => {
  it('rejects unknown error codes', () => {
    const result = errorResponseSchema.safeParse({ error: { code: 'TEAPOT', message: 'x' } })

    expect(result.success).toBe(false)
  })
})

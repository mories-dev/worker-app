import {
  errorResponseSchema,
  publicKeyResponseSchema,
  sendPushResponseSchema,
  type SendPushRequest,
  type SendPushResponse,
} from '@worker-lab/push-contract'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp } from './app.ts'
import { AppError } from './lib/errors.ts'
import type { PushService } from './services/push-service.ts'

const validRequest: SendPushRequest = {
  subscription: {
    endpoint: 'https://push.example.com/abc',
    keys: { p256dh: 'p256dh-key', auth: 'auth-secret' },
  },
  delaySeconds: 0,
}

function createTestApp(send: PushService['send']) {
  return createApp({ pushService: { send }, publicKey: 'test-public-key' })
}

function postJson(app: ReturnType<typeof createTestApp>, body: string) {
  return app.request('/api/push/send', {
    method: 'POST',
    body,
    headers: new Headers({ 'Content-Type': 'application/json' }),
  })
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('GET /api/push/public-key', () => {
  it('returns the VAPID public key', async () => {
    const app = createTestApp(vi.fn())

    const res = await app.request('/api/push/public-key')

    expect(res.status).toBe(200)
    expect(publicKeyResponseSchema.parse(await res.json())).toEqual({ publicKey: 'test-public-key' })
  })
})

describe('POST /api/push/send', () => {
  it('responds 200 for an immediate send', async () => {
    const sent: SendPushResponse = { status: 'sent', sentAt: '2026-10-16T00:00:00.000Z' }
    const send = vi.fn(async () => sent)
    const app = createTestApp(send)

    const res = await postJson(app, JSON.stringify(validRequest))

    expect(res.status).toBe(200)
    expect(sendPushResponseSchema.parse(await res.json())).toEqual(sent)
    expect(send).toHaveBeenCalledWith(validRequest)
  })

  it('responds 202 for a scheduled send', async () => {
    const scheduled: SendPushResponse = { status: 'scheduled', sendAt: '2026-10-16T00:00:10.000Z' }
    const app = createTestApp(vi.fn(async () => scheduled))

    const res = await postJson(app, JSON.stringify({ ...validRequest, delaySeconds: 10 }))

    expect(res.status).toBe(202)
    expect(sendPushResponseSchema.parse(await res.json())).toEqual(scheduled)
  })

  it('rejects an invalid body with VALIDATION_ERROR without calling the service', async () => {
    const send = vi.fn()
    const app = createTestApp(send)

    const res = await postJson(app, JSON.stringify({ ...validRequest, delaySeconds: 999 }))

    expect(res.status).toBe(400)
    expect(errorResponseSchema.parse(await res.json()).error.code).toBe('VALIDATION_ERROR')
    expect(send).not.toHaveBeenCalled()
  })

  it('rejects malformed JSON with VALIDATION_ERROR', async () => {
    const app = createTestApp(vi.fn())

    const res = await postJson(app, '{"subscription":')

    expect(res.status).toBe(400)
    expect(errorResponseSchema.parse(await res.json()).error.code).toBe('VALIDATION_ERROR')
  })

  it('maps push service rejections to 502', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const app = createTestApp(
      vi.fn(async () => {
        throw new AppError('PUSH_SERVICE_REJECTED', 'rejected (HTTP 410)', 502)
      }),
    )

    const res = await postJson(app, JSON.stringify(validRequest))

    expect(res.status).toBe(502)
    expect(errorResponseSchema.parse(await res.json()).error).toEqual({
      code: 'PUSH_SERVICE_REJECTED',
      message: 'rejected (HTTP 410)',
    })
  })

  it('hides unexpected error details behind INTERNAL_ERROR', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const app = createTestApp(
      vi.fn(async () => {
        throw new Error('secret internal detail')
      }),
    )

    const res = await postJson(app, JSON.stringify(validRequest))
    const body = errorResponseSchema.parse(await res.json())

    expect(res.status).toBe(500)
    expect(body.error.code).toBe('INTERNAL_ERROR')
    expect(body.error.message).not.toContain('secret')
  })
})

describe('host check', () => {
  it('rejects requests whose Host is not loopback (DNS rebinding guard)', async () => {
    const send = vi.fn()
    const app = createTestApp(send)

    const res = await app.request('http://attacker.example/api/push/send', {
      method: 'POST',
      body: JSON.stringify(validRequest),
      headers: new Headers({ 'Content-Type': 'application/json' }),
    })

    expect(res.status).toBe(403)
    expect(errorResponseSchema.parse(await res.json()).error.code).toBe('FORBIDDEN_HOST')
    expect(send).not.toHaveBeenCalled()
  })

  it.each(['http://127.0.0.1:8787', 'http://localhost:5180'])('accepts loopback host %s', async (origin) => {
    const app = createTestApp(vi.fn())

    const res = await app.request(`${origin}/api/push/public-key`)

    expect(res.status).toBe(200)
  })
})

describe('unknown routes', () => {
  it('responds with NOT_FOUND in the shared error shape', async () => {
    const app = createTestApp(vi.fn())

    const res = await app.request('/api/unknown')

    expect(res.status).toBe(404)
    expect(errorResponseSchema.parse(await res.json()).error.code).toBe('NOT_FOUND')
  })
})

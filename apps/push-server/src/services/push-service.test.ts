import type { PushSubscriptionPayload } from '@worker-lab/push-contract'
import { describe, expect, it, vi } from 'vitest'
import { AppError } from '../lib/errors.ts'
import { MAX_PENDING_SCHEDULED_SENDS, createPushService, type PushServiceDeps } from './push-service.ts'

const subscription: PushSubscriptionPayload = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
  keys: { p256dh: 'p256dh-key', auth: 'auth-secret' },
}
const NOW = new Date('2026-10-16T00:00:00.000Z')

function setup(overrides: Partial<PushServiceDeps> = {}) {
  const scheduled: Array<{ task: () => void; delayMs: number }> = []
  const deps: PushServiceDeps = {
    sender: vi.fn(async () => {}),
    schedule: (task, delayMs) => {
      scheduled.push({ task, delayMs })
    },
    now: () => NOW,
    onScheduledFailure: vi.fn(),
    ...overrides,
  }
  return { service: createPushService(deps), deps, scheduled }
}

describe('createPushService', () => {
  it('sends immediately when delaySeconds is 0', async () => {
    const { service, deps, scheduled } = setup()

    const response = await service.send({ subscription, delaySeconds: 0 })

    expect(response).toEqual({ status: 'sent', sentAt: NOW.toISOString() })
    expect(deps.sender).toHaveBeenCalledWith(
      subscription,
      expect.objectContaining({ title: 'Worker Lab', sentAt: NOW.toISOString() }),
    )
    expect(scheduled).toHaveLength(0)
  })

  it('schedules the send and does not call the push service yet when delayed', async () => {
    const { service, deps, scheduled } = setup()

    const response = await service.send({ subscription, delaySeconds: 10 })

    expect(response).toEqual({ status: 'scheduled', sendAt: '2026-10-16T00:00:10.000Z' })
    expect(deps.sender).not.toHaveBeenCalled()
    expect(scheduled).toEqual([expect.objectContaining({ delayMs: 10_000 })])
  })

  it('sends the payload when the scheduled task runs', async () => {
    const { service, deps, scheduled } = setup()
    await service.send({ subscription, delaySeconds: 10 })

    scheduled[0]?.task()

    await vi.waitFor(() => expect(deps.sender).toHaveBeenCalledTimes(1))
    expect(deps.sender).toHaveBeenCalledWith(
      subscription,
      expect.objectContaining({ body: expect.stringContaining('10秒前に予約') }),
    )
  })

  it('reports failures of scheduled sends instead of dropping them', async () => {
    const failure = new Error('push service down')
    const { service, deps, scheduled } = setup({ sender: vi.fn(async () => Promise.reject(failure)) })
    await service.send({ subscription, delaySeconds: 5 })

    scheduled[0]?.task()

    await vi.waitFor(() => expect(deps.onScheduledFailure).toHaveBeenCalledWith(failure))
  })

  it('propagates failures of immediate sends to the caller', async () => {
    const failure = new Error('rejected')
    const { service } = setup({ sender: vi.fn(async () => Promise.reject(failure)) })

    await expect(service.send({ subscription, delaySeconds: 0 })).rejects.toBe(failure)
  })

  it.each([
    'https://updates.push.services.mozilla.com/wpush/v2/abc',
    'https://web.push.apple.com/QGuQyavXutnMH',
    'https://wns2-par02p.notify.windows.com/w/?token=abc',
  ])('accepts the push service endpoint %s', async (endpoint) => {
    const { service } = setup()

    await expect(service.send({ subscription: { ...subscription, endpoint }, delaySeconds: 0 })).resolves.toMatchObject({
      status: 'sent',
    })
  })

  it.each(['https://10.0.0.5/admin', 'https://localhost:8443/push', 'https://fcm.googleapis.com.evil.example/x'])(
    'refuses to send to %s so the server cannot be used for SSRF',
    async (endpoint) => {
      const { service, deps } = setup()

      await expect(service.send({ subscription: { ...subscription, endpoint }, delaySeconds: 0 })).rejects.toMatchObject({
        code: 'UNSUPPORTED_PUSH_SERVICE',
        status: 400,
      })
      expect(deps.sender).not.toHaveBeenCalled()
    },
  )

  it(`limits pending scheduled sends to ${MAX_PENDING_SCHEDULED_SENDS} and frees a slot once one runs`, async () => {
    const { service, scheduled } = setup()
    for (let i = 0; i < MAX_PENDING_SCHEDULED_SENDS; i += 1) {
      await service.send({ subscription, delaySeconds: 30 })
    }

    const overflow = service.send({ subscription, delaySeconds: 30 })
    await expect(overflow).rejects.toBeInstanceOf(AppError)
    await expect(overflow).rejects.toMatchObject({ code: 'TOO_MANY_SCHEDULED', status: 429 })

    scheduled[0]?.task()
    await expect(service.send({ subscription, delaySeconds: 30 })).resolves.toMatchObject({ status: 'scheduled' })
  })
})

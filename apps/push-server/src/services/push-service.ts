import type {
  PushPayload,
  PushSubscriptionPayload,
  SendPushRequest,
  SendPushResponse,
} from '@worker-lab/push-contract'
import { AppError } from '../lib/errors.ts'
import { isKnownPushServiceEndpoint } from './push-endpoint-policy.ts'

export type PushSender = (subscription: PushSubscriptionPayload, payload: PushPayload) => Promise<void>

export type PushServiceDeps = {
  sender: PushSender
  schedule: (task: () => void, delayMs: number) => void
  now: () => Date
  onScheduledFailure: (error: unknown) => void
}

export type PushService = {
  send: (request: SendPushRequest) => Promise<SendPushResponse>
}

export const MAX_PENDING_SCHEDULED_SENDS = 20

const NOTIFICATION_TITLE = 'Worker Lab'

export function buildPayload(delaySeconds: number, sentAt: Date): PushPayload {
  const body =
    delaySeconds === 0
      ? 'push-server から送信されたプッシュ通知です。'
      : `${delaySeconds}秒前に予約されたプッシュ通知です。ページを閉じていても Service Worker が受け取ります。`
  return { title: NOTIFICATION_TITLE, body, sentAt: sentAt.toISOString() }
}

function assertKnownPushService(subscription: PushSubscriptionPayload) {
  if (!isKnownPushServiceEndpoint(subscription.endpoint)) {
    const { host } = new URL(subscription.endpoint)
    throw new AppError('UNSUPPORTED_PUSH_SERVICE', `対応していないプッシュサービスの endpoint です（${host}）。`, 400)
  }
}

export function createPushService(deps: PushServiceDeps): PushService {
  let pendingScheduled = 0

  const deliver = async (subscription: PushSubscriptionPayload, delaySeconds: number): Promise<Date> => {
    const sentAt = deps.now()
    await deps.sender(subscription, buildPayload(delaySeconds, sentAt))
    return sentAt
  }

  return {
    async send({ subscription, delaySeconds }) {
      assertKnownPushService(subscription)
      if (delaySeconds === 0) {
        const sentAt = await deliver(subscription, 0)
        return { status: 'sent', sentAt: sentAt.toISOString() }
      }

      if (pendingScheduled >= MAX_PENDING_SCHEDULED_SENDS) {
        throw new AppError(
          'TOO_MANY_SCHEDULED',
          `予約できる送信は同時に ${MAX_PENDING_SCHEDULED_SENDS} 件までです。少し待ってからもう一度お試しください。`,
          429,
        )
      }
      const delayMs = delaySeconds * 1000
      const sendAt = new Date(deps.now().getTime() + delayMs)
      pendingScheduled += 1
      deps.schedule(() => {
        pendingScheduled -= 1
        deliver(subscription, delaySeconds).catch(deps.onScheduledFailure)
      }, delayMs)
      return { status: 'scheduled', sendAt: sendAt.toISOString() }
    },
  }
}

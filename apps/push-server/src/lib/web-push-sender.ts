import webpush from 'web-push'
import type { PushSender } from '../services/push-service.ts'
import type { VapidDetails } from './config.ts'
import { AppError } from './errors.ts'

const PUSH_TTL_SECONDS = 300
const PUSH_REQUEST_TIMEOUT_MS = 10_000

export function createWebPushSender(vapid: VapidDetails): PushSender {
  return async (subscription, payload) => {
    try {
      await webpush.sendNotification(subscription, JSON.stringify(payload), {
        vapidDetails: vapid,
        TTL: PUSH_TTL_SECONDS,
        timeout: PUSH_REQUEST_TIMEOUT_MS,
      })
    } catch (error) {
      throw toPushServiceError(error)
    }
  }
}

function toPushServiceError(error: unknown): AppError {
  if (error instanceof webpush.WebPushError) {
    return new AppError(
      'PUSH_SERVICE_REJECTED',
      `プッシュサービスが送信を拒否しました (HTTP ${error.statusCode})。購読し直してから再度お試しください。`,
      502,
      { cause: error },
    )
  }
  return new AppError(
    'PUSH_SERVICE_UNREACHABLE',
    'プッシュサービスに接続できませんでした。ネットワーク接続を確認してください。',
    502,
    { cause: error },
  )
}

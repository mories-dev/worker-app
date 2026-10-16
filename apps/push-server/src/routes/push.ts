import { zValidator } from '@hono/zod-validator'
import { sendPushRequestSchema, type PublicKeyResponse } from '@worker-lab/push-contract'
import { Hono } from 'hono'
import { AppError } from '../lib/errors.ts'
import type { PushService } from '../services/push-service.ts'

export type PushRoutesDeps = {
  pushService: PushService
  publicKey: string
}

export function createPushRoutes({ pushService, publicKey }: PushRoutesDeps) {
  return new Hono()
    .get('/public-key', (c) => c.json({ publicKey } satisfies PublicKeyResponse))
    .post(
      '/send',
      zValidator('json', sendPushRequestSchema, (result) => {
        if (!result.success) {
          throw new AppError('VALIDATION_ERROR', '送信リクエストの形式が正しくありません。', 400, {
            cause: result.error,
          })
        }
      }),
      async (c) => {
        const response = await pushService.send(c.req.valid('json'))
        return c.json(response, response.status === 'sent' ? 200 : 202)
      },
    )
}

import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { AppError, toErrorResponse } from './lib/errors.ts'
import { loopbackOnly } from './middleware/loopback-only.ts'
import { createPushRoutes, type PushRoutesDeps } from './routes/push.ts'

export function createApp(deps: PushRoutesDeps) {
  const app = new Hono().use('*', loopbackOnly).route('/api/push', createPushRoutes(deps))

  app.notFound((c) => c.json(toErrorResponse('NOT_FOUND', '指定された API は存在しません。'), 404))

  app.onError((error, c) => {
    if (error instanceof AppError) {
      if (error.status >= 500) {
        console.error(`[push-server] ${error.message}`, error.cause)
      }
      return c.json(toErrorResponse(error.code, error.message), error.status)
    }
    if (error instanceof HTTPException && error.status === 400) {
      return c.json(toErrorResponse('VALIDATION_ERROR', 'リクエストボディを解釈できませんでした。'), 400)
    }
    console.error('[push-server] 予期しないエラー', error)
    return c.json(toErrorResponse('INTERNAL_ERROR', 'サーバー内部でエラーが発生しました。'), 500)
  })

  return app
}

import { createMiddleware } from 'hono/factory'
import { AppError } from '../lib/errors.ts'

// DNS rebinding で外部サイトから任意の endpoint へ送信させられないよう、Host がループバックの場合だけ受け付ける
const LOOPBACK_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]'])

export const loopbackOnly = createMiddleware(async (c, next) => {
  const { hostname } = new URL(c.req.url)
  if (!LOOPBACK_HOSTNAMES.has(hostname)) {
    throw new AppError('FORBIDDEN_HOST', 'ループバック以外のホスト名からのリクエストは受け付けません。', 403)
  }
  await next()
})

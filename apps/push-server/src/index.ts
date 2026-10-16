import { serve } from '@hono/node-server'
import { createApp } from './app.ts'
import { loadConfig } from './lib/config.ts'
import { createWebPushSender } from './lib/web-push-sender.ts'
import { createPushService } from './services/push-service.ts'

// ループバックのみで待ち受け、外部ネットワークから送信 API を叩けないようにする
const HOSTNAME = '127.0.0.1'

const result = loadConfig(process.env)
if (!result.ok) {
  console.error(result.message)
  process.exit(1)
}
const { config } = result

const pushService = createPushService({
  sender: createWebPushSender(config.vapid),
  schedule: (task, delayMs) => {
    setTimeout(task, delayMs)
  },
  now: () => new Date(),
  onScheduledFailure: (error) => {
    console.error('[push-server] 予約していたプッシュの送信に失敗しました', error)
  },
})

const app = createApp({ pushService, publicKey: config.vapid.publicKey })

serve({ fetch: app.fetch, port: config.port, hostname: HOSTNAME }, (info) => {
  console.info(`[push-server] http://${HOSTNAME}:${info.port} で待機中`)
})

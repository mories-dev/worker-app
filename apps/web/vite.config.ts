/// <reference types="vitest/config" />
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { pushServerPortSchema } from '@worker-lab/push-contract'
import { defineConfig, loadEnv } from 'vite'

// Service Worker の登録はオリジン（ポート含む）単位なので、他プロジェクトと被りにくい固定ポートにする
const DEV_PORT = 5180
const PREVIEW_PORT = 4180

const pushServerDir = fileURLToPath(new URL('../push-server', import.meta.url))

export default defineConfig(({ mode }) => {
  // push-server と同じ .env からポートだけを読む（PUSH_SERVER_ 接頭辞に限定し、VAPID 秘密鍵は読み込まない）
  const pushServerEnv = loadEnv(mode, pushServerDir, 'PUSH_SERVER_')
  const pushServerPort = pushServerPortSchema.parse(pushServerEnv.PUSH_SERVER_PORT)
  // changeOrigin: false で元の Host を保ち、push-server 側のループバック Host 検査を効かせる
  const proxy = { '/api': { target: `http://127.0.0.1:${pushServerPort}`, changeOrigin: false } }

  return {
    plugins: [react()],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    worker: { format: 'es' },
    server: { port: DEV_PORT, strictPort: true, proxy },
    preview: { port: PREVIEW_PORT, strictPort: true, proxy },
    test: {
      environment: 'jsdom',
      setupFiles: ['./vitest.setup.ts'],
      restoreMocks: true,
      unstubGlobals: true,
    },
  }
})

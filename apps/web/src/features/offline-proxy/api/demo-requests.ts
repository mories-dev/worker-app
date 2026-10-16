import { describeError } from '@/shared/lib'
import { classifyResponse, type ResponseSource } from '../lib/classify-response.ts'

export type DemoRequest = {
  id: 'fortune' | 'demo-data'
  path: string
  description: string
}

export const DEMO_REQUESTS: readonly DemoRequest[] = [
  {
    id: 'fortune',
    path: '/sw-api/fortune',
    description:
      'サーバーには存在しない API です。Service Worker が制御していれば SW がその場でレスポンスを作り、制御していなければサーバーに届いて 404 になります。',
  },
  {
    id: 'demo-data',
    path: '/demo-data.json',
    description:
      '静的ファイルです。SW はまずネットワークへ取りに行き、成功したらキャッシュに保存します。ネットワークに届かないときはキャッシュから返します。',
  },
]

export type DemoRequestResult =
  | { ok: true; status: number; source: ResponseSource; date: string | null; body: string; elapsedMs: number }
  | { ok: false; message: string; elapsedMs: number }

export async function runDemoRequest(path: string, controlled: boolean): Promise<DemoRequestResult> {
  const startedAt = performance.now()
  try {
    // Accept を JSON にすると、SW が居ないとき Vite の SPA フォールバック（index.html）ではなく 404 が返る
    const response = await fetch(path, { headers: { Accept: 'application/json' }, cache: 'no-store' })
    const text = await response.text()
    return {
      ok: true,
      status: response.status,
      source: classifyResponse(response.headers.get('X-Served-By'), controlled),
      date: response.headers.get('Date'),
      body: formatBody(text),
      elapsedMs: performance.now() - startedAt,
    }
  } catch (error) {
    return {
      ok: false,
      message: `リクエストに失敗しました（${describeError(error)}）`,
      elapsedMs: performance.now() - startedAt,
    }
  }
}

function formatBody(text: string): string {
  try {
    return JSON.stringify(JSON.parse(text), null, 2)
  } catch {
    // JSON でない本文（404 のテキストなど）はそのまま見せる
    return text
  }
}

import {
  errorResponseSchema,
  publicKeyResponseSchema,
  sendPushResponseSchema,
  type SendPushRequest,
  type SendPushResponse,
} from '@worker-lab/push-contract'
import type { ZodType } from 'zod'

const PUSH_API_BASE = '/api/push'

export class PushServerError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'PushServerError'
  }
}

async function readJsonOrUndefined(response: Response): Promise<unknown> {
  const text = await response.text()
  try {
    return JSON.parse(text)
  } catch {
    // プロキシ先が落ちているときなどは JSON 以外が返るので、下のスキーマ検証で扱う
    return undefined
  }
}

async function parseResponse<T>(response: Response, schema: ZodType<T>): Promise<T> {
  const body = await readJsonOrUndefined(response)
  if (!response.ok) {
    const parsedError = errorResponseSchema.safeParse(body)
    if (parsedError.success) {
      throw new PushServerError(parsedError.data.error.message)
    }
    throw new PushServerError(
      `push-server から応答がありません（HTTP ${response.status}）。pnpm dev で push-server も起動しているか確認してください。`,
    )
  }
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    throw new PushServerError('push-server から想定外のレスポンスを受信しました。')
  }
  return parsed.data
}

export async function fetchPublicKey(): Promise<string> {
  const response = await fetch(`${PUSH_API_BASE}/public-key`, { headers: { Accept: 'application/json' } })
  const { publicKey } = await parseResponse(response, publicKeyResponseSchema)
  return publicKey
}

export async function requestPush(request: SendPushRequest): Promise<SendPushResponse> {
  const response = await fetch(`${PUSH_API_BASE}/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(request),
  })
  return parseResponse(response, sendPushResponseSchema)
}

export function describePushServerError(error: unknown): string {
  if (error instanceof PushServerError) {
    return error.message
  }
  return 'push-server に接続できませんでした。pnpm dev で push-server も起動しているか確認してください。'
}

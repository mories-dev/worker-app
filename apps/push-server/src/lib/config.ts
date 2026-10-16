import { pushServerPortSchema } from '@worker-lab/push-contract'
import { z } from 'zod'

// VAPID 鍵は P-256: 公開鍵は非圧縮点 65 バイト、秘密鍵は 32 バイト
const PUBLIC_KEY_BYTES = 65
const PRIVATE_KEY_BYTES = 32

const base64UrlKey = (bytes: number) =>
  z
    .string()
    .regex(/^[A-Za-z0-9_-]+$/, 'base64url 形式で指定してください')
    .refine((value) => Buffer.from(value, 'base64url').length === bytes, `${bytes} バイトの鍵を指定してください`)

const envSchema = z.object({
  VAPID_PUBLIC_KEY: base64UrlKey(PUBLIC_KEY_BYTES),
  VAPID_PRIVATE_KEY: base64UrlKey(PRIVATE_KEY_BYTES),
  VAPID_SUBJECT: z
    .string()
    .regex(/^(mailto:|https:\/\/)/, 'mailto: か https:// で始まる値を指定してください'),
  PUSH_SERVER_PORT: pushServerPortSchema,
})

export type VapidDetails = {
  subject: string
  publicKey: string
  privateKey: string
}

export type Config = {
  port: number
  vapid: VapidDetails
}

export type ConfigResult = { ok: true; config: Config } | { ok: false; message: string }

export function loadConfig(env: Record<string, string | undefined>): ConfigResult {
  const parsed = envSchema.safeParse(env)
  if (!parsed.success) {
    return {
      ok: false,
      message: [
        'push-server の環境変数が不足しているか不正です。',
        z.prettifyError(parsed.error),
        'リポジトリのルートで `pnpm setup:push` を実行すると apps/push-server/.env に VAPID 鍵を生成できます。',
      ].join('\n'),
    }
  }

  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, PUSH_SERVER_PORT } = parsed.data
  return {
    ok: true,
    config: {
      port: PUSH_SERVER_PORT,
      vapid: { subject: VAPID_SUBJECT, publicKey: VAPID_PUBLIC_KEY, privateKey: VAPID_PRIVATE_KEY },
    },
  }
}

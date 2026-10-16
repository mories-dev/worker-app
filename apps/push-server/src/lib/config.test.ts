import { DEFAULT_PUSH_SERVER_PORT } from '@worker-lab/push-contract'
import webpush from 'web-push'
import { describe, expect, it } from 'vitest'
import { loadConfig } from './config.ts'

const keys = webpush.generateVAPIDKeys()
const validEnv = {
  VAPID_PUBLIC_KEY: keys.publicKey,
  VAPID_PRIVATE_KEY: keys.privateKey,
  VAPID_SUBJECT: 'mailto:you@example.com',
}

describe('loadConfig', () => {
  it('builds the config and falls back to the default port', () => {
    const result = loadConfig(validEnv)

    expect(result).toEqual({
      ok: true,
      config: {
        port: DEFAULT_PUSH_SERVER_PORT,
        vapid: { subject: 'mailto:you@example.com', publicKey: keys.publicKey, privateKey: keys.privateKey },
      },
    })
  })

  it('parses PUSH_SERVER_PORT from the environment', () => {
    const result = loadConfig({ ...validEnv, PUSH_SERVER_PORT: '9000' })

    expect(result.ok && result.config.port).toBe(9000)
  })

  it('fails with setup guidance when the VAPID keys are missing', () => {
    const result = loadConfig({ VAPID_SUBJECT: 'mailto:you@example.com' })

    expect(result.ok).toBe(false)
    expect(!result.ok && result.message).toContain('pnpm setup:push')
  })

  it.each([
    ['a key that is not base64url', { VAPID_PUBLIC_KEY: 'not base64url!' }],
    ['a key with the wrong length', { VAPID_PRIVATE_KEY: keys.publicKey }],
    ['a subject that is neither mailto: nor https:', { VAPID_SUBJECT: 'http://localhost' }],
  ])('rejects %s', (_label, override) => {
    const result = loadConfig({ ...validEnv, ...override })

    expect(result.ok).toBe(false)
  })

  it('does not echo secret values in the error message', () => {
    const result = loadConfig({ ...validEnv, VAPID_SUBJECT: 'not-a-uri' })

    expect(result.ok).toBe(false)
    expect(!result.ok && result.message).not.toContain(keys.privateKey)
  })
})

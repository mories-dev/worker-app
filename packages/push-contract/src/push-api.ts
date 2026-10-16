import { z } from 'zod'

export const PUSH_DELAY_MAX_SECONDS = 60

export const pushSubscriptionSchema = z.object({
  endpoint: z.url({ protocol: /^https$/ }),
  expirationTime: z.number().nullable().optional(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
})
export type PushSubscriptionPayload = z.infer<typeof pushSubscriptionSchema>

export const sendPushRequestSchema = z.object({
  subscription: pushSubscriptionSchema,
  delaySeconds: z.number().int().min(0).max(PUSH_DELAY_MAX_SECONDS),
})
export type SendPushRequest = z.infer<typeof sendPushRequestSchema>

export const sendPushResponseSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('sent'), sentAt: z.iso.datetime() }),
  z.object({ status: z.literal('scheduled'), sendAt: z.iso.datetime() }),
])
export type SendPushResponse = z.infer<typeof sendPushResponseSchema>

export const publicKeyResponseSchema = z.object({
  publicKey: z.string().min(1),
})
export type PublicKeyResponse = z.infer<typeof publicKeyResponseSchema>

export const errorCodeSchema = z.enum([
  'VALIDATION_ERROR',
  'UNSUPPORTED_PUSH_SERVICE',
  'FORBIDDEN_HOST',
  'NOT_FOUND',
  'TOO_MANY_SCHEDULED',
  'PUSH_SERVICE_REJECTED',
  'PUSH_SERVICE_UNREACHABLE',
  'INTERNAL_ERROR',
])
export type ErrorCode = z.infer<typeof errorCodeSchema>

export const errorResponseSchema = z.object({
  error: z.object({
    code: errorCodeSchema,
    message: z.string(),
  }),
})
export type ErrorResponse = z.infer<typeof errorResponseSchema>

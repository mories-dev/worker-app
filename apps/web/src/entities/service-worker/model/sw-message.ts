import { z } from 'zod'

export const swLogEventSchema = z.enum(['install', 'activate', 'fetch', 'message', 'push', 'notificationclick'])
export type SwLogEvent = z.infer<typeof swLogEventSchema>

export const swLogMessageSchema = z.object({
  type: z.literal('sw-log'),
  version: z.string(),
  event: swLogEventSchema,
  detail: z.string(),
  at: z.number(),
})
export type SwLogMessage = z.infer<typeof swLogMessageSchema>

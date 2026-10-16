import { z } from 'zod'

export const pushPayloadSchema = z.object({
  title: z.string().min(1),
  body: z.string(),
  sentAt: z.iso.datetime(),
})
export type PushPayload = z.infer<typeof pushPayloadSchema>

import { z } from 'zod'

export const STAMPS = ['こんにちは', '了解です', 'ありがとう', 'いま見てます'] as const
export const stampSchema = z.enum(STAMPS)
export type Stamp = z.infer<typeof stampSchema>

export const clientMessageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('join') }),
  z.object({ type: z.literal('leave') }),
  z.object({ type: z.literal('increment') }),
  z.object({ type: z.literal('stamp'), stamp: stampSchema }),
])
export type ClientMessage = z.infer<typeof clientMessageSchema>

const tabSchema = z.object({
  id: z.number().int(),
  label: z.string(),
  joinedAt: z.number(),
})

const chatEntrySchema = z.object({
  id: z.number().int(),
  tabId: z.number().int(),
  tabLabel: z.string(),
  stamp: stampSchema,
  at: z.number(),
})

export const hubSnapshotSchema = z.object({
  startedAt: z.number(),
  counter: z.number().int(),
  lastIncrementBy: z.string().nullable(),
  totalConnections: z.number().int(),
  tabs: z.array(tabSchema),
  messages: z.array(chatEntrySchema),
})
export type HubSnapshot = z.infer<typeof hubSnapshotSchema>

export const workerMessageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('welcome'), tabId: z.number().int(), label: z.string() }),
  z.object({ type: z.literal('state'), snapshot: hubSnapshotSchema }),
  z.object({ type: z.literal('error'), message: z.string() }),
])
export type WorkerMessage = z.infer<typeof workerMessageSchema>

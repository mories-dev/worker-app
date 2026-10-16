import { z } from 'zod'

export const PRIME_LIMIT_MAX = 50_000_000

export const primeRequestSchema = z.object({
  type: z.literal('start'),
  limit: z.number().int().min(2).max(PRIME_LIMIT_MAX),
})
export type PrimeRequest = z.infer<typeof primeRequestSchema>

export const primeResponseSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('progress'), checked: z.number().int(), found: z.number().int() }),
  z.object({ type: z.literal('done'), found: z.number().int(), elapsedMs: z.number() }),
  z.object({ type: z.literal('error'), message: z.string() }),
])
export type PrimeResponse = z.infer<typeof primeResponseSchema>

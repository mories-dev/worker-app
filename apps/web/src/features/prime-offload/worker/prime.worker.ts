import { countPrimes } from '../lib/count-primes.ts'
import { primeRequestSchema, type PrimeResponse } from '../model/protocol.ts'

declare const self: DedicatedWorkerGlobalScope

const post = (message: PrimeResponse) => {
  self.postMessage(message)
}

self.addEventListener('message', (event: MessageEvent<unknown>) => {
  const parsed = primeRequestSchema.safeParse(event.data)
  if (!parsed.success) {
    post({ type: 'error', message: 'Worker が不正なリクエストを受け取りました' })
    return
  }

  const startedAt = performance.now()
  const found = countPrimes(parsed.data.limit, (progress) => post({ type: 'progress', ...progress }))
  post({ type: 'done', found, elapsedMs: performance.now() - startedAt })
})

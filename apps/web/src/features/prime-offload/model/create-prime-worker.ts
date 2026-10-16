export function createPrimeWorker(): Worker {
  return new Worker(new URL('../worker/prime.worker.ts', import.meta.url), {
    type: 'module',
    name: 'prime-counter',
  })
}

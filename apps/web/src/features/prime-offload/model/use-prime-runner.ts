import { useCallback, useEffect, useRef, useState } from 'react'
import { countPrimes, type PrimeProgress } from '../lib/count-primes.ts'
import { createPrimeWorker } from './create-prime-worker.ts'
import { primeResponseSchema, type PrimeRequest } from './protocol.ts'

export type RunMode = 'main' | 'worker'

export type PrimeRunState =
  | { status: 'idle' }
  | { status: 'running'; mode: RunMode; limit: number; progress: PrimeProgress | null }
  | { status: 'done'; mode: RunMode; limit: number; found: number; elapsedMs: number }
  | { status: 'cancelled'; limit: number; progress: PrimeProgress | null }
  | { status: 'error'; mode: RunMode; message: string }

export type PrimeRunner = {
  state: PrimeRunState
  runOnMainThread: (limit: number) => void
  runInWorker: (limit: number) => void
  cancel: () => void
}

export function usePrimeRunner(): PrimeRunner {
  const [state, setState] = useState<PrimeRunState>({ status: 'idle' })
  const workerRef = useRef<Worker | null>(null)

  const stopWorker = useCallback(() => {
    workerRef.current?.terminate()
    workerRef.current = null
  }, [])

  useEffect(() => stopWorker, [stopWorker])

  const runOnMainThread = (limit: number) => {
    stopWorker()
    setState({ status: 'running', mode: 'main', limit, progress: null })
    // 「実行中」を一度描画させてからメインスレッドを塞ぐ（rAF の後の setTimeout は描画の後に実行される）
    requestAnimationFrame(() => {
      setTimeout(() => {
        const startedAt = performance.now()
        const found = countPrimes(limit)
        setState({ status: 'done', mode: 'main', limit, found, elapsedMs: performance.now() - startedAt })
      }, 0)
    })
  }

  const runInWorker = (limit: number) => {
    stopWorker()
    const worker = createPrimeWorker()
    workerRef.current = worker
    const isCurrent = () => workerRef.current === worker
    const fail = (message: string) => {
      if (!isCurrent()) return
      stopWorker()
      setState({ status: 'error', mode: 'worker', message })
    }

    worker.addEventListener('message', (event: MessageEvent<unknown>) => {
      if (!isCurrent()) return
      const parsed = primeResponseSchema.safeParse(event.data)
      if (!parsed.success) {
        fail('Worker から不正なメッセージを受信しました')
        return
      }
      const message = parsed.data
      switch (message.type) {
        case 'progress':
          setState((prev) =>
            prev.status === 'running' ? { ...prev, progress: { checked: message.checked, found: message.found } } : prev,
          )
          return
        case 'done':
          stopWorker()
          setState({ status: 'done', mode: 'worker', limit, found: message.found, elapsedMs: message.elapsedMs })
          return
        case 'error':
          fail(message.message)
          return
      }
    })
    worker.addEventListener('error', (event) => {
      fail(event.message || 'Worker の読み込みまたは実行に失敗しました')
    })
    worker.addEventListener('messageerror', () => {
      fail('Worker からのメッセージを復元できませんでした')
    })

    setState({ status: 'running', mode: 'worker', limit, progress: null })
    const request: PrimeRequest = { type: 'start', limit }
    worker.postMessage(request)
  }

  const cancel = () => {
    if (!workerRef.current) return
    stopWorker()
    setState((prev) =>
      prev.status === 'running' && prev.mode === 'worker'
        ? { status: 'cancelled', limit: prev.limit, progress: prev.progress }
        : prev,
    )
  }

  return { state, runOnMainThread, runInWorker, cancel }
}

import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { countPrimes } from '../lib/count-primes.ts'
import { createPrimeWorker } from '../model/create-prime-worker.ts'
import { PrimeOffloadDemo } from './PrimeOffloadDemo.tsx'

vi.mock('../model/create-prime-worker.ts', () => ({ createPrimeWorker: vi.fn() }))
vi.mock('../lib/count-primes.ts', () => ({ countPrimes: vi.fn() }))

class FakeWorker extends EventTarget {
  readonly posted: unknown[] = []
  readonly terminate = vi.fn()

  postMessage(message: unknown) {
    this.posted.push(message)
  }

  emit(data: unknown) {
    act(() => {
      this.dispatchEvent(new MessageEvent('message', { data }))
    })
  }

  crash(message: string) {
    act(() => {
      this.dispatchEvent(new ErrorEvent('error', { message }))
    })
  }
}

let workers: FakeWorker[] = []

beforeEach(() => {
  workers = []
  vi.mocked(createPrimeWorker).mockImplementation(() => {
    const worker = new FakeWorker()
    workers.push(worker)
    return worker as unknown as Worker
  })
  vi.mocked(countPrimes).mockReturnValue(1_270_607)
})

async function startWorkerRun() {
  const user = userEvent.setup()
  render(<PrimeOffloadDemo />)
  await user.click(screen.getByRole('button', { name: 'Worker で実行' }))
  const worker = workers[0]
  if (!worker) throw new Error('worker should be created')
  return { user, worker }
}

describe('PrimeOffloadDemo', () => {
  it('sends the selected limit to the worker and shows streamed progress and the result', async () => {
    const { worker } = await startWorkerRun()

    expect(worker.posted).toEqual([{ type: 'start', limit: 20_000_000 }])
    worker.emit({ type: 'progress', checked: 10_000_000, found: 664_579 })
    expect(screen.getByText(/50% 完了/)).toBeInTheDocument()

    worker.emit({ type: 'done', found: 1_270_607, elapsedMs: 2400 })
    expect(screen.getByText('1,270,607 個')).toBeInTheDocument()
    expect(screen.getByText('Workerで完了')).toBeInTheDocument()
    expect(worker.terminate).toHaveBeenCalled()
  })

  it('terminates the worker when the user cancels', async () => {
    const { user, worker } = await startWorkerRun()
    worker.emit({ type: 'progress', checked: 4_000_000, found: 283_146 })

    await user.click(screen.getByRole('button', { name: '中断（terminate）' }))

    expect(worker.terminate).toHaveBeenCalledTimes(1)
    expect(screen.getByText('terminate() で中断')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Worker で実行' })).toBeEnabled()
  })

  it('shows worker errors instead of hanging in the running state', async () => {
    const { worker } = await startWorkerRun()

    worker.crash('SyntaxError in worker')

    expect(screen.getByRole('alert')).toHaveTextContent('SyntaxError in worker')
    expect(worker.terminate).toHaveBeenCalled()
  })

  it('rejects messages that do not follow the protocol', async () => {
    const { worker } = await startWorkerRun()

    worker.emit({ type: 'done', found: 'many' })

    expect(screen.getByRole('alert')).toHaveTextContent('不正なメッセージ')
  })

  it('runs on the main thread without creating a worker and cannot be cancelled', async () => {
    const user = userEvent.setup()
    render(<PrimeOffloadDemo />)

    await user.click(screen.getByRole('radio', { name: '10,000,000' }))
    await user.click(screen.getByRole('button', { name: 'メインスレッドで実行' }))

    expect(screen.getByRole('button', { name: '中断（terminate）' })).toBeDisabled()
    expect(await screen.findByText('メインスレッドで完了')).toBeInTheDocument()
    expect(countPrimes).toHaveBeenCalledWith(10_000_000)
    expect(createPrimeWorker).not.toHaveBeenCalled()
  })
})

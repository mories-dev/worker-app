import { describe, expect, it, vi } from 'vitest'
import { MAX_SW_LOG_ENTRIES, createSwLogStore, type SwLogSource } from './sw-log-store.ts'

class FakeContainer extends EventTarget implements SwLogSource {
  startMessages = vi.fn()

  deliver(data: unknown) {
    this.dispatchEvent(new MessageEvent('message', { data }))
  }
}

const logMessage = (detail: string) => ({ type: 'sw-log', version: 'v1', event: 'fetch', detail, at: 1_000 })

describe('createSwLogStore', () => {
  it('starts the client message queue as soon as it is created', () => {
    const container = new FakeContainer()

    createSwLogStore(container)

    expect(container.startMessages).toHaveBeenCalledTimes(1)
  })

  it('keeps valid logs newest-first and notifies subscribers', () => {
    const container = new FakeContainer()
    const store = createSwLogStore(container)
    const listener = vi.fn()
    store.subscribe(listener)

    container.deliver(logMessage('first'))
    container.deliver(logMessage('second'))

    expect(store.getSnapshot().map((entry) => entry.detail)).toEqual(['second', 'first'])
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('replaces the snapshot instead of mutating it', () => {
    const container = new FakeContainer()
    const store = createSwLogStore(container)
    container.deliver(logMessage('first'))
    const before = store.getSnapshot()

    container.deliver(logMessage('second'))

    expect(before).toHaveLength(1)
    expect(store.getSnapshot()).not.toBe(before)
  })

  it('ignores messages that do not match the log schema', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const container = new FakeContainer()
    const store = createSwLogStore(container)

    container.deliver({ type: 'sw-log', event: 'unknown-event' })

    expect(store.getSnapshot()).toEqual([])
    expect(console.warn).toHaveBeenCalled()
  })

  it(`keeps at most ${MAX_SW_LOG_ENTRIES} entries`, () => {
    const container = new FakeContainer()
    const store = createSwLogStore(container)

    Array.from({ length: MAX_SW_LOG_ENTRIES + 5 }, (_, i) => container.deliver(logMessage(`log-${i}`)))

    expect(store.getSnapshot()).toHaveLength(MAX_SW_LOG_ENTRIES)
    expect(store.getSnapshot()[0]?.detail).toBe(`log-${MAX_SW_LOG_ENTRIES + 4}`)
  })

  it('clears only the requested event types so other panels keep their logs', () => {
    const container = new FakeContainer()
    const store = createSwLogStore(container)
    container.deliver(logMessage('fetch log'))
    container.deliver({ ...logMessage('push log'), event: 'push' })

    store.clear(['push', 'notificationclick'])

    expect(store.getSnapshot().map((entry) => entry.detail)).toEqual(['fetch log'])
  })

  it('clears logs and stops listening after dispose', () => {
    const container = new FakeContainer()
    const store = createSwLogStore(container)
    container.deliver(logMessage('first'))

    store.clear()
    store.dispose()
    container.deliver(logMessage('after dispose'))

    expect(store.getSnapshot()).toEqual([])
  })

  it('works without a service worker container', () => {
    const store = createSwLogStore(null)

    expect(store.getSnapshot()).toEqual([])
  })
})

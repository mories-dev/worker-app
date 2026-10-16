import { describe, expect, it, vi } from 'vitest'
import type { ClientMessage, HubSnapshot } from './protocol.ts'
import { createTabHubClient, type HubPort } from './tab-hub-client.ts'

class FakePort extends EventTarget implements HubPort {
  readonly sent: ClientMessage[] = []
  readonly start = vi.fn()
  readonly close = vi.fn()

  postMessage(message: ClientMessage) {
    this.sent.push(message)
  }

  receive(data: unknown) {
    this.dispatchEvent(new MessageEvent('message', { data }))
  }
}

const snapshot: HubSnapshot = {
  startedAt: 0,
  counter: 3,
  lastIncrementBy: 'タブ 1',
  totalConnections: 2,
  tabs: [{ id: 1, label: 'タブ 1', joinedAt: 0 }],
  messages: [],
}

function setup() {
  const ports: FakePort[] = []
  const connect = vi.fn(() => {
    const port = new FakePort()
    ports.push(port)
    return port
  })
  const lifecycle = new EventTarget()
  const client = createTabHubClient(connect, lifecycle)
  return { client, connect, lifecycle, ports }
}

function connectedPort(ports: FakePort[]): FakePort {
  const port = ports.at(-1)
  if (!port) throw new Error('port should exist')
  port.receive({ type: 'welcome', tabId: 1, label: 'タブ 1' })
  port.receive({ type: 'state', snapshot })
  return port
}

describe('createTabHubClient', () => {
  it('reports unsupported without connecting when SharedWorker is unavailable', () => {
    const client = createTabHubClient(null, new EventTarget())

    client.subscribe(() => {})

    expect(client.getSnapshot()).toEqual({ status: 'unsupported' })
  })

  it('connects lazily on the first subscribe and joins exactly once', () => {
    const { client, connect, ports } = setup()
    expect(connect).not.toHaveBeenCalled()

    const unsubscribe = client.subscribe(() => {})
    unsubscribe()
    client.subscribe(() => {})

    expect(connect).toHaveBeenCalledTimes(1)
    expect(ports[0]?.start).toHaveBeenCalled()
    expect(ports[0]?.sent).toEqual([{ type: 'join' }])
  })

  it('becomes connected after welcome and the first state broadcast', () => {
    const { client, ports } = setup()
    const listener = vi.fn()
    client.subscribe(listener)

    connectedPort(ports)

    expect(client.getSnapshot()).toEqual({
      status: 'connected',
      me: { tabId: 1, label: 'タブ 1' },
      snapshot,
      notice: null,
    })
    expect(listener).toHaveBeenCalled()
  })

  it('sends user actions to the worker', () => {
    const { client, ports } = setup()
    client.subscribe(() => {})
    const port = connectedPort(ports)

    client.increment()
    client.sendStamp('ありがとう')

    expect(port.sent).toEqual([{ type: 'join' }, { type: 'increment' }, { type: 'stamp', stamp: 'ありがとう' }])
  })

  it('fails loudly when the worker speaks an unknown protocol', () => {
    const { client, ports } = setup()
    client.subscribe(() => {})

    ports[0]?.receive({ type: 'state', snapshot: { counter: 'NaN' } })

    expect(client.getSnapshot().status).toBe('failed')
    expect(ports[0]?.close).toHaveBeenCalled()
  })

  it('leaves and closes the port on pagehide, then reconnects when restored from bfcache', () => {
    const { client, lifecycle, ports } = setup()
    client.subscribe(() => {})
    const firstPort = connectedPort(ports)

    lifecycle.dispatchEvent(new Event('pagehide'))
    lifecycle.dispatchEvent(Object.assign(new Event('pageshow'), { persisted: true }))

    expect(firstPort.sent.at(-1)).toEqual({ type: 'leave' })
    expect(firstPort.close).toHaveBeenCalled()
    expect(ports).toHaveLength(2)
    expect(ports[1]?.sent).toEqual([{ type: 'join' }])
    expect(client.getSnapshot()).toEqual({ status: 'connecting' })
  })

  it('ignores pageshow events that are not bfcache restorations', () => {
    const { client, lifecycle, ports } = setup()
    client.subscribe(() => {})

    lifecycle.dispatchEvent(Object.assign(new Event('pageshow'), { persisted: false }))

    expect(ports).toHaveLength(1)
  })
})

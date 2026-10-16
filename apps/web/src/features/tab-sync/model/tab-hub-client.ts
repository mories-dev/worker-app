import { workerMessageSchema, type ClientMessage, type HubSnapshot, type Stamp } from './protocol.ts'

export type TabIdentity = {
  tabId: number
  label: string
}

export type TabHubView =
  | { status: 'unsupported' }
  | { status: 'connecting' }
  | { status: 'connected'; me: TabIdentity; snapshot: HubSnapshot; notice: string | null }
  | { status: 'failed'; message: string }

export type HubPort = {
  postMessage(message: ClientMessage): void
  addEventListener(type: 'message' | 'messageerror', listener: (event: Event) => void): void
  removeEventListener(type: 'message' | 'messageerror', listener: (event: Event) => void): void
  start(): void
  close(): void
}

export type ConnectTabHub = (onError: (message: string) => void) => HubPort

export type PageLifecycle = {
  addEventListener(type: 'pagehide' | 'pageshow', listener: (event: Event) => void): void
  removeEventListener(type: 'pagehide' | 'pageshow', listener: (event: Event) => void): void
}

export type TabHubClient = {
  subscribe: (listener: () => void) => () => void
  getSnapshot: () => TabHubView
  increment: () => void
  sendStamp: (stamp: Stamp) => void
  dispose: () => void
}

const STALE_WORKER_MESSAGE =
  'SharedWorker から想定外のメッセージを受信しました。古いバージョンの Worker が残っている可能性があるため、このページのタブをすべて閉じてから開き直してください。'

export function createTabHubClient(connect: ConnectTabHub | null, lifecycle: PageLifecycle): TabHubClient {
  let view: TabHubView = connect ? { status: 'connecting' } : { status: 'unsupported' }
  let port: HubPort | null = null
  let me: TabIdentity | null = null
  let started = false
  const listeners = new Set<() => void>()

  const setView = (next: TabHubView) => {
    view = next
    listeners.forEach((listener) => listener())
  }

  const disconnect = () => {
    if (!port) return
    port.postMessage({ type: 'leave' })
    port.removeEventListener('message', onMessage)
    port.removeEventListener('messageerror', onMessageError)
    port.close()
    port = null
    me = null
  }

  const fail = (message: string) => {
    disconnect()
    setView({ status: 'failed', message })
  }

  function onMessage(event: Event) {
    if (!(event instanceof MessageEvent)) return
    const parsed = workerMessageSchema.safeParse(event.data)
    if (!parsed.success) {
      fail(STALE_WORKER_MESSAGE)
      return
    }
    const message = parsed.data
    switch (message.type) {
      case 'welcome':
        me = { tabId: message.tabId, label: message.label }
        return
      case 'state':
        if (me) setView({ status: 'connected', me, snapshot: message.snapshot, notice: null })
        return
      case 'error':
        setView(view.status === 'connected' ? { ...view, notice: message.message } : { status: 'failed', message: message.message })
        return
    }
  }

  function onMessageError() {
    fail('SharedWorker からのメッセージを復元できませんでした')
  }

  const connectPort = () => {
    if (!connect || port) return
    const next = connect(fail)
    next.addEventListener('message', onMessage)
    next.addEventListener('messageerror', onMessageError)
    next.start()
    next.postMessage({ type: 'join' })
    port = next
  }

  // タブが閉じたことを Worker に知らせる標準イベントは無いので、pagehide で自分から leave を送る
  const onPageHide = () => {
    disconnect()
  }

  // bfcache から復元されたら、古いポートは閉じてあるので新しく接続し直す
  const onPageShow = (event: Event) => {
    if (!('persisted' in event) || event.persisted !== true) return
    setView({ status: 'connecting' })
    connectPort()
  }

  return {
    subscribe(listener) {
      listeners.add(listener)
      if (!started && connect) {
        started = true
        lifecycle.addEventListener('pagehide', onPageHide)
        lifecycle.addEventListener('pageshow', onPageShow)
        connectPort()
      }
      return () => {
        listeners.delete(listener)
      }
    },
    getSnapshot: () => view,
    increment: () => {
      port?.postMessage({ type: 'increment' })
    },
    sendStamp: (stamp) => {
      port?.postMessage({ type: 'stamp', stamp })
    },
    dispose() {
      disconnect()
      lifecycle.removeEventListener('pagehide', onPageHide)
      lifecycle.removeEventListener('pageshow', onPageShow)
    },
  }
}

import {
  createHubState,
  incrementCounter,
  joinTab,
  leaveTab,
  postStamp,
  toSnapshot,
  type HubState,
} from '../model/hub-state.ts'
import { clientMessageSchema, type ClientMessage, type WorkerMessage } from '../model/protocol.ts'

declare const self: SharedWorkerGlobalScope

let state: HubState = createHubState(Date.now())
const tabIdByPort = new Map<MessagePort, number>()

const send = (port: MessagePort, message: WorkerMessage) => {
  port.postMessage(message)
}

const broadcast = () => {
  const message: WorkerMessage = { type: 'state', snapshot: toSnapshot(state) }
  for (const port of tabIdByPort.keys()) {
    send(port, message)
  }
}

const join = (port: MessagePort) => {
  if (!tabIdByPort.has(port)) {
    const joined = joinTab(state, Date.now())
    state = joined.state
    tabIdByPort.set(port, joined.tab.id)
    send(port, { type: 'welcome', tabId: joined.tab.id, label: joined.tab.label })
  }
  broadcast()
}

const handle = (port: MessagePort, message: ClientMessage) => {
  if (message.type === 'join') {
    join(port)
    return
  }
  const tabId = tabIdByPort.get(port)
  if (tabId === undefined) {
    send(port, { type: 'error', message: 'join する前にメッセージを受け取りました' })
    return
  }
  switch (message.type) {
    case 'leave':
      state = leaveTab(state, tabId)
      tabIdByPort.delete(port)
      port.close()
      break
    case 'increment':
      state = incrementCounter(state, tabId)
      break
    case 'stamp':
      state = postStamp(state, tabId, message.stamp, Date.now())
      break
  }
  broadcast()
}

self.addEventListener('connect', (event) => {
  const [port] = event.ports
  if (!port) return
  port.addEventListener('message', (messageEvent) => {
    const parsed = clientMessageSchema.safeParse(messageEvent.data)
    if (!parsed.success) {
      send(port, { type: 'error', message: 'SharedWorker が不正なメッセージを受け取りました' })
      return
    }
    handle(port, parsed.data)
  })
  // addEventListener で受け取る場合、start() を呼ぶまでポートのメッセージは配送されない
  port.start()
})

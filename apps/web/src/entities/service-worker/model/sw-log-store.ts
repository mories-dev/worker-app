import { swLogMessageSchema, type SwLogEvent, type SwLogMessage } from './sw-message.ts'

export const MAX_SW_LOG_ENTRIES = 50

export type SwLogEntry = SwLogMessage & { id: number }

export type SwLogStore = {
  subscribe: (listener: () => void) => () => void
  getSnapshot: () => readonly SwLogEntry[]
  clear: (events?: readonly SwLogEvent[]) => void
  dispose: () => void
}

export type SwLogSource = {
  addEventListener(type: 'message', listener: (event: Event) => void): void
  removeEventListener(type: 'message', listener: (event: Event) => void): void
  startMessages(): void
}

export function createSwLogStore(source: SwLogSource | null): SwLogStore {
  let entries: readonly SwLogEntry[] = []
  let nextId = 1
  const listeners = new Set<() => void>()

  const emit = () => {
    listeners.forEach((listener) => listener())
  }

  const onMessage = (event: Event) => {
    if (!(event instanceof MessageEvent)) return
    const parsed = swLogMessageSchema.safeParse(event.data)
    if (!parsed.success) {
      console.warn('Service Worker から想定外のメッセージを受信しました', event.data)
      return
    }
    entries = [{ ...parsed.data, id: nextId }, ...entries].slice(0, MAX_SW_LOG_ENTRIES)
    nextId += 1
    emit()
  }

  // addEventListener だけではクライアントのメッセージキューが開始されないため、明示的に startMessages() する
  source?.addEventListener('message', onMessage)
  source?.startMessages()

  return {
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    getSnapshot: () => entries,
    clear(events) {
      entries = events ? entries.filter((entry) => !events.includes(entry.event)) : []
      emit()
    },
    dispose() {
      source?.removeEventListener('message', onMessage)
    },
  }
}

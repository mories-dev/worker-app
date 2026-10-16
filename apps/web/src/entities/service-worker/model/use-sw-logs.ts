import { useSyncExternalStore } from 'react'
import { createSwLogStore, type SwLogEntry } from './sw-log-store.ts'
import type { SwLogEvent } from './sw-message.ts'

// DOMContentLoaded 直後から届くログを取りこぼさないよう、マウントを待たずモジュール評価時に購読を始める
const swLogStore = createSwLogStore('serviceWorker' in navigator ? navigator.serviceWorker : null)

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    swLogStore.dispose()
  })
}

export type SwLogsApi = {
  entries: readonly SwLogEntry[]
  clear: (events?: readonly SwLogEvent[]) => void
}

export function useSwLogs(): SwLogsApi {
  const entries = useSyncExternalStore(swLogStore.subscribe, swLogStore.getSnapshot)
  return { entries, clear: swLogStore.clear }
}

import { useSyncExternalStore } from 'react'
import { connectTabHub } from './connect-tab-hub.ts'
import type { Stamp } from './protocol.ts'
import { createTabHubClient, type TabHubView } from './tab-hub-client.ts'

const tabHubClient = createTabHubClient(typeof SharedWorker === 'undefined' ? null : connectTabHub, window)

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    tabHubClient.dispose()
  })
}

export type TabHubApi = {
  view: TabHubView
  increment: () => void
  sendStamp: (stamp: Stamp) => void
}

export function useTabHub(): TabHubApi {
  const view = useSyncExternalStore(tabHubClient.subscribe, tabHubClient.getSnapshot)
  return { view, increment: tabHubClient.increment, sendStamp: tabHubClient.sendStamp }
}

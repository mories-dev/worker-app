import type { HubSnapshot, Stamp } from './protocol.ts'

export const MAX_HUB_MESSAGES = 20

export type HubTab = {
  readonly id: number
  readonly label: string
  readonly joinedAt: number
}

export type HubChatEntry = {
  readonly id: number
  readonly tabId: number
  readonly tabLabel: string
  readonly stamp: Stamp
  readonly at: number
}

export type HubState = {
  readonly startedAt: number
  readonly counter: number
  readonly lastIncrementBy: string | null
  readonly totalConnections: number
  readonly nextTabId: number
  readonly nextMessageId: number
  readonly tabs: readonly HubTab[]
  readonly messages: readonly HubChatEntry[]
}

export function createHubState(now: number): HubState {
  return {
    startedAt: now,
    counter: 0,
    lastIncrementBy: null,
    totalConnections: 0,
    nextTabId: 1,
    nextMessageId: 1,
    tabs: [],
    messages: [],
  }
}

export function joinTab(state: HubState, now: number): { state: HubState; tab: HubTab } {
  const tab: HubTab = { id: state.nextTabId, label: `タブ ${state.nextTabId}`, joinedAt: now }
  return {
    tab,
    state: {
      ...state,
      nextTabId: state.nextTabId + 1,
      totalConnections: state.totalConnections + 1,
      tabs: [...state.tabs, tab],
    },
  }
}

export function leaveTab(state: HubState, tabId: number): HubState {
  return { ...state, tabs: state.tabs.filter((tab) => tab.id !== tabId) }
}

export function incrementCounter(state: HubState, tabId: number): HubState {
  return { ...state, counter: state.counter + 1, lastIncrementBy: findLabel(state, tabId) }
}

export function postStamp(state: HubState, tabId: number, stamp: Stamp, now: number): HubState {
  const entry: HubChatEntry = { id: state.nextMessageId, tabId, tabLabel: findLabel(state, tabId), stamp, at: now }
  return {
    ...state,
    nextMessageId: state.nextMessageId + 1,
    messages: [...state.messages, entry].slice(-MAX_HUB_MESSAGES),
  }
}

export function toSnapshot(state: HubState): HubSnapshot {
  return {
    startedAt: state.startedAt,
    counter: state.counter,
    lastIncrementBy: state.lastIncrementBy,
    totalConnections: state.totalConnections,
    tabs: state.tabs.map((tab) => ({ ...tab })),
    messages: state.messages.map((entry) => ({ ...entry })),
  }
}

function findLabel(state: HubState, tabId: number): string {
  return state.tabs.find((tab) => tab.id === tabId)?.label ?? `タブ ${tabId}`
}

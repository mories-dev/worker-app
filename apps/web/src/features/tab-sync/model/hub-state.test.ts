import { describe, expect, it } from 'vitest'
import {
  MAX_HUB_MESSAGES,
  createHubState,
  incrementCounter,
  joinTab,
  leaveTab,
  postStamp,
  toSnapshot,
} from './hub-state.ts'

describe('hub state', () => {
  it('assigns increasing tab ids and counts every connection', () => {
    const first = joinTab(createHubState(0), 10)
    const second = joinTab(first.state, 20)

    expect(first.tab).toEqual({ id: 1, label: 'タブ 1', joinedAt: 10 })
    expect(second.tab.id).toBe(2)
    expect(second.state.tabs.map((tab) => tab.id)).toEqual([1, 2])
    expect(second.state.totalConnections).toBe(2)
  })

  it('removes a tab on leave but keeps the total connection count', () => {
    const { state } = joinTab(joinTab(createHubState(0), 0).state, 0)

    const next = leaveTab(state, 1)

    expect(next.tabs.map((tab) => tab.id)).toEqual([2])
    expect(next.totalConnections).toBe(2)
  })

  it('records which tab incremented the shared counter', () => {
    const { state } = joinTab(createHubState(0), 0)

    const next = incrementCounter(incrementCounter(state, 1), 1)

    expect(next.counter).toBe(2)
    expect(next.lastIncrementBy).toBe('タブ 1')
  })

  it(`keeps only the latest ${MAX_HUB_MESSAGES} stamps`, () => {
    const { state } = joinTab(createHubState(0), 0)

    const next = Array.from({ length: MAX_HUB_MESSAGES + 3 }, (_, i) => i).reduce(
      (acc, i) => postStamp(acc, 1, 'こんにちは', i),
      state,
    )

    expect(next.messages).toHaveLength(MAX_HUB_MESSAGES)
    expect(next.messages[0]?.at).toBe(3)
    expect(next.messages.at(-1)).toMatchObject({ tabLabel: 'タブ 1', stamp: 'こんにちは' })
  })

  it('never mutates the previous state', () => {
    const initial = createHubState(0)
    const frozen = Object.freeze({ ...initial, tabs: Object.freeze([...initial.tabs]) })

    const { state } = joinTab(frozen, 0)
    incrementCounter(state, 1)
    postStamp(state, 1, '了解です', 1)

    expect(frozen.tabs).toHaveLength(0)
    expect(state.counter).toBe(0)
    expect(state.messages).toHaveLength(0)
  })

  it('exposes only public fields in the snapshot', () => {
    const { state } = joinTab(createHubState(5), 6)

    const snapshot = toSnapshot(state)

    expect(snapshot).toEqual({
      startedAt: 5,
      counter: 0,
      lastIncrementBy: null,
      totalConnections: 1,
      tabs: [{ id: 1, label: 'タブ 1', joinedAt: 6 }],
      messages: [],
    })
  })
})

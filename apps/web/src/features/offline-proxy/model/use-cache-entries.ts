import { useEffect, useState } from 'react'
import { SW_CACHE_PREFIX } from '@/entities/service-worker'
import { describeError } from '@/shared/lib'

export type CacheEntry = {
  id: string
  cacheName: string
  path: string
}

export type CacheEntriesState =
  | { status: 'unsupported' }
  | { status: 'loading' }
  | { status: 'ready'; entries: readonly CacheEntry[] }
  | { status: 'error'; message: string }

export type CacheEntriesApi = {
  state: CacheEntriesState
  refresh: () => void
  clearAll: () => Promise<void>
}

const isSupported = () => typeof caches !== 'undefined'

async function listOwnCacheNames(): Promise<string[]> {
  const names = await caches.keys()
  return names.filter((name) => name.startsWith(SW_CACHE_PREFIX))
}

async function listCacheEntries(): Promise<CacheEntry[]> {
  const names = await listOwnCacheNames()
  const perCache = await Promise.all(
    names.map(async (cacheName) => {
      const requests = await (await caches.open(cacheName)).keys()
      return requests.map((request) => {
        const url = new URL(request.url)
        const path = `${url.pathname}${url.search}`
        return { id: `${cacheName}:${path}`, cacheName, path }
      })
    }),
  )
  return perCache.flat()
}

export function useCacheEntries(): CacheEntriesApi {
  const [state, setState] = useState<CacheEntriesState>(() =>
    isSupported() ? { status: 'loading' } : { status: 'unsupported' },
  )
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    if (!isSupported()) return
    let cancelled = false
    listCacheEntries().then(
      (entries) => {
        if (!cancelled) setState({ status: 'ready', entries })
      },
      (error: unknown) => {
        if (!cancelled) setState({ status: 'error', message: `キャッシュを読み取れませんでした（${describeError(error)}）` })
      },
    )
    return () => {
      cancelled = true
    }
  }, [revision])

  const refresh = () => {
    setRevision((count) => count + 1)
  }

  const clearAll = async () => {
    if (!isSupported()) return
    try {
      const names = await listOwnCacheNames()
      await Promise.all(names.map((name) => caches.delete(name)))
    } catch (error) {
      setState({ status: 'error', message: `キャッシュを削除できませんでした（${describeError(error)}）` })
      return
    }
    refresh()
  }

  return { state, refresh, clearAll }
}

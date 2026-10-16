import { pushSubscriptionSchema, type PushSubscriptionPayload } from '@worker-lab/push-contract'
import { useEffect, useState } from 'react'
import { useSwRegistration } from '@/entities/service-worker'
import { browserSupport, describeError } from '@/shared/lib'

export type PushSubscriptionState =
  | { status: 'unsupported' }
  | { status: 'waiting-for-sw' }
  | { status: 'loading' }
  | { status: 'ready'; subscription: PushSubscriptionPayload | null }
  | { status: 'error'; message: string }

export type PushSubscriptionApi = {
  state: PushSubscriptionState
  permission: NotificationPermission | null
  pending: 'subscribe' | 'unsubscribe' | null
  actionError: string | null
  subscribe: (publicKey: string) => Promise<void>
  unsubscribe: () => Promise<void>
}

type LoadResult = { ok: true; subscription: PushSubscriptionPayload | null } | { ok: false; message: string }
type Loaded = { registration: ServiceWorkerRegistration; result: LoadResult }

const pushSupported = browserSupport.serviceWorker && browserSupport.pushManager && browserSupport.notification

function toPayload(subscription: PushSubscription | null): PushSubscriptionPayload | null {
  if (!subscription) return null
  const parsed = pushSubscriptionSchema.safeParse(subscription.toJSON())
  if (!parsed.success) {
    throw new Error('ブラウザが返した購読情報の形式が想定外です')
  }
  return parsed.data
}

function describeSubscribeError(error: unknown): string {
  if (error instanceof DOMException) {
    switch (error.name) {
      case 'NotAllowedError':
        return '通知が許可されませんでした。アドレスバーのサイト設定から通知を許可してください。'
      case 'InvalidStateError':
        return '別の鍵ですでに購読しています。「購読を解除」してから、もう一度購読してください。'
      case 'AbortError':
        return `プッシュサービスへの登録に失敗しました（${error.message}）。この環境ではプッシュサービスを利用できない可能性があります。`
    }
  }
  return `購読に失敗しました（${describeError(error)}）`
}

function deriveState(registration: ServiceWorkerRegistration | null, loaded: Loaded | null): PushSubscriptionState {
  if (!pushSupported) return { status: 'unsupported' }
  if (!registration) return { status: 'waiting-for-sw' }
  if (!loaded || loaded.registration !== registration) return { status: 'loading' }
  return loaded.result.ok
    ? { status: 'ready', subscription: loaded.result.subscription }
    : { status: 'error', message: loaded.result.message }
}

export function usePushSubscription(): PushSubscriptionApi {
  const { snapshot, getActiveRegistration } = useSwRegistration()
  const registration = snapshot.status === 'registered' && snapshot.slots.active ? getActiveRegistration() : null
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [pending, setPending] = useState<PushSubscriptionApi['pending']>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    if (!registration || !pushSupported) return
    let cancelled = false
    const load = async () => {
      try {
        const subscription = toPayload(await registration.pushManager.getSubscription())
        if (!cancelled) setLoaded({ registration, result: { ok: true, subscription } })
      } catch (error) {
        const message = `購読状態を取得できませんでした（${describeError(error)}）`
        if (!cancelled) setLoaded({ registration, result: { ok: false, message } })
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [registration])

  const subscribe = async (publicKey: string) => {
    if (!registration) return
    setPending('subscribe')
    setActionError(null)
    try {
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: publicKey,
      })
      const parsed = pushSubscriptionSchema.safeParse(subscription.toJSON())
      if (!parsed.success) {
        // 画面とブラウザの購読状態がずれないよう、使えない購読はすぐに取り消す
        await subscription.unsubscribe()
        throw new Error('ブラウザが返した購読情報の形式が想定外だったため、購読を取り消しました')
      }
      setLoaded({ registration, result: { ok: true, subscription: parsed.data } })
    } catch (error) {
      setActionError(describeSubscribeError(error))
    } finally {
      setPending(null)
    }
  }

  const unsubscribe = async () => {
    if (!registration) return
    setPending('unsubscribe')
    setActionError(null)
    try {
      const current = await registration.pushManager.getSubscription()
      await current?.unsubscribe()
      setLoaded({ registration, result: { ok: true, subscription: null } })
    } catch (error) {
      setActionError(`購読の解除に失敗しました（${describeError(error)}）`)
    } finally {
      setPending(null)
    }
  }

  return {
    state: deriveState(registration, loaded),
    permission: pushSupported ? Notification.permission : null,
    pending,
    actionError,
    subscribe,
    unsubscribe,
  }
}

import { describeError } from '@/shared/lib'
import { SKIP_WAITING_MESSAGE } from '../config.ts'

export type WorkerSlots = {
  installing: ServiceWorkerState | null
  waiting: ServiceWorkerState | null
  active: ServiceWorkerState | null
}

export type RegistrationSnapshot =
  | { status: 'unsupported' }
  | { status: 'checking' }
  | { status: 'unregistered'; controlled: boolean; lastError: string | null }
  | { status: 'registered'; scope: string; slots: WorkerSlots; controlled: boolean; lastError: string | null }

export type WorkerLike = {
  readonly state: ServiceWorkerState
  postMessage(message: unknown): void
  addEventListener(type: 'statechange', listener: () => void): void
}

export type RegistrationLike = {
  readonly scope: string
  readonly installing: WorkerLike | null
  readonly waiting: WorkerLike | null
  readonly active: WorkerLike | null
  unregister(): Promise<boolean>
  update(): Promise<unknown>
  addEventListener(type: 'updatefound', listener: () => void): void
}

export type ContainerLike<R extends RegistrationLike> = {
  readonly controller: unknown
  getRegistration(): Promise<R | undefined>
  register(scriptUrl: string): Promise<R>
  addEventListener(type: 'controllerchange', listener: () => void): void
}

export type RegistrationStore<R extends RegistrationLike> = {
  subscribe: (listener: () => void) => () => void
  getSnapshot: () => RegistrationSnapshot
  register: () => Promise<void>
  unregister: () => Promise<void>
  checkForUpdate: () => Promise<void>
  activateWaiting: () => void
  getActiveRegistration: () => R | null
}

export type RegistrationStoreOptions<R extends RegistrationLike> = {
  container: ContainerLike<R> | null
  scriptUrl: string
  reload: () => void
}

export function createRegistrationStore<R extends RegistrationLike>({
  container,
  scriptUrl,
  reload,
}: RegistrationStoreOptions<R>): RegistrationStore<R> {
  let snapshot: RegistrationSnapshot = container ? { status: 'checking' } : { status: 'unsupported' }
  let registration: R | null = null
  let lastError: string | null = null
  let started = false
  let reloadOnControllerChange = false
  const listeners = new Set<() => void>()
  const trackedWorkers = new WeakSet<WorkerLike>()
  const trackedRegistrations = new WeakSet<R>()

  const publish = () => {
    if (!container) return
    const controlled = container.controller !== null
    snapshot = registration
      ? { status: 'registered', scope: registration.scope, slots: readSlots(registration), controlled, lastError }
      : { status: 'unregistered', controlled, lastError }
    listeners.forEach((listener) => listener())
  }

  const trackWorker = (worker: WorkerLike | null) => {
    if (!worker || trackedWorkers.has(worker)) return
    trackedWorkers.add(worker)
    worker.addEventListener('statechange', publish)
  }

  const adopt = (next: R | undefined) => {
    registration = next ?? null
    if (next && !trackedRegistrations.has(next)) {
      trackedRegistrations.add(next)
      next.addEventListener('updatefound', () => {
        trackWorker(next.installing)
        publish()
      })
    }
    if (next) {
      trackWorker(next.installing)
      trackWorker(next.waiting)
      trackWorker(next.active)
    }
    publish()
  }

  const fail = (context: string, error: unknown) => {
    lastError = `${context}: ${describeError(error)}`
    publish()
  }

  const start = () => {
    if (started || !container) return
    started = true
    container.addEventListener('controllerchange', () => {
      if (reloadOnControllerChange) {
        reload()
        return
      }
      publish()
    })
    container.getRegistration().then(adopt, (error: unknown) => fail('登録状態の取得に失敗しました', error))
  }

  return {
    subscribe(listener) {
      listeners.add(listener)
      start()
      return () => {
        listeners.delete(listener)
      }
    },
    getSnapshot: () => snapshot,
    async register() {
      if (!container) return
      lastError = null
      try {
        adopt(await container.register(scriptUrl))
      } catch (error) {
        fail('登録に失敗しました', error)
      }
    },
    async unregister() {
      if (!registration) return
      lastError = null
      try {
        const removed = await registration.unregister()
        if (!removed) {
          throw new Error('unregister() が false を返しました')
        }
        adopt(undefined)
      } catch (error) {
        fail('登録解除に失敗しました', error)
      }
    },
    async checkForUpdate() {
      if (!registration) return
      lastError = null
      try {
        await registration.update()
        publish()
      } catch (error) {
        fail('更新の確認に失敗しました', error)
      }
    },
    activateWaiting() {
      const waiting = registration?.waiting
      if (!waiting) return
      reloadOnControllerChange = true
      waiting.postMessage(SKIP_WAITING_MESSAGE)
    },
    getActiveRegistration: () => (registration?.active ? registration : null),
  }
}

function readSlots(registration: RegistrationLike): WorkerSlots {
  return {
    installing: registration.installing?.state ?? null,
    waiting: registration.waiting?.state ?? null,
    active: registration.active?.state ?? null,
  }
}

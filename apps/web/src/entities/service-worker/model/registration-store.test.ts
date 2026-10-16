import { describe, expect, it, vi } from 'vitest'
import {
  createRegistrationStore,
  type ContainerLike,
  type RegistrationLike,
  type WorkerLike,
} from './registration-store.ts'

class FakeWorker extends EventTarget implements WorkerLike {
  state: ServiceWorkerState
  postMessage = vi.fn()

  constructor(state: ServiceWorkerState) {
    super()
    this.state = state
  }

  moveTo(state: ServiceWorkerState) {
    this.state = state
    this.dispatchEvent(new Event('statechange'))
  }
}

class FakeRegistration extends EventTarget implements RegistrationLike {
  scope = 'http://localhost:5180/'
  installing: FakeWorker | null = null
  waiting: FakeWorker | null = null
  active: FakeWorker | null = null
  unregister = vi.fn(async () => true)
  update = vi.fn(async () => undefined)

  startInstalling(worker: FakeWorker) {
    this.installing = worker
    this.dispatchEvent(new Event('updatefound'))
  }
}

class FakeContainer extends EventTarget implements ContainerLike<FakeRegistration> {
  controller: object | null = null
  existing: FakeRegistration | undefined = undefined
  getRegistration = vi.fn(async () => this.existing)
  register = vi.fn(async () => {
    this.existing = this.existing ?? new FakeRegistration()
    return this.existing
  })

  changeController() {
    this.controller = {}
    this.dispatchEvent(new Event('controllerchange'))
  }
}

function setup(existing?: FakeRegistration) {
  const container = new FakeContainer()
  container.existing = existing
  const reload = vi.fn()
  const store = createRegistrationStore({ container, scriptUrl: '/sw.js', reload })
  store.subscribe(() => {})
  return { container, reload, store }
}

describe('createRegistrationStore', () => {
  it('reports unsupported when the browser has no service worker container', () => {
    const store = createRegistrationStore({ container: null, scriptUrl: '/sw.js', reload: vi.fn() })

    expect(store.getSnapshot()).toEqual({ status: 'unsupported' })
  })

  it('loads the existing registration on first subscribe', async () => {
    const { store } = setup()

    await vi.waitFor(() => expect(store.getSnapshot().status).toBe('unregistered'))
  })

  it('follows a new worker from installing to waiting and active via statechange', async () => {
    const { store, container } = setup()
    await store.register()
    const registration = container.existing
    if (!registration) throw new Error('registration should exist')
    const worker = new FakeWorker('installing')

    registration.startInstalling(worker)
    expect(store.getSnapshot()).toMatchObject({ status: 'registered', slots: { installing: 'installing' } })

    registration.installing = null
    registration.waiting = worker
    worker.moveTo('installed')
    expect(store.getSnapshot()).toMatchObject({ slots: { installing: null, waiting: 'installed' } })

    registration.waiting = null
    registration.active = worker
    worker.moveTo('activated')
    expect(store.getSnapshot()).toMatchObject({ slots: { waiting: null, active: 'activated' } })
  })

  it('sends SKIP_WAITING and reloads once the new worker takes control', async () => {
    const registration = new FakeRegistration()
    const waiting = new FakeWorker('installed')
    registration.waiting = waiting
    const { store, container, reload } = setup(registration)
    await vi.waitFor(() => expect(store.getSnapshot().status).toBe('registered'))

    store.activateWaiting()
    container.changeController()

    expect(waiting.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' })
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('does not reload when control changes for other reasons such as clients.claim()', async () => {
    const { store, container, reload } = setup()
    await store.register()

    container.changeController()

    expect(reload).not.toHaveBeenCalled()
    expect(store.getSnapshot()).toMatchObject({ controlled: true })
  })

  it('keeps reporting control after unregister until the page reloads', async () => {
    const registration = new FakeRegistration()
    registration.active = new FakeWorker('activated')
    const { store, container } = setup(registration)
    container.controller = {}
    await vi.waitFor(() => expect(store.getSnapshot().status).toBe('registered'))

    await store.unregister()

    expect(store.getSnapshot()).toEqual({ status: 'unregistered', controlled: true, lastError: null })
    expect(store.getActiveRegistration()).toBeNull()
  })

  it('exposes the registration only while it has an active worker', async () => {
    const registration = new FakeRegistration()
    const { store } = setup(registration)
    await vi.waitFor(() => expect(store.getSnapshot().status).toBe('registered'))
    expect(store.getActiveRegistration()).toBeNull()

    registration.active = new FakeWorker('activated')

    expect(store.getActiveRegistration()).toBe(registration)
  })

  it('surfaces registration failures', async () => {
    const { store, container } = setup()
    container.register.mockRejectedValueOnce(new Error('SecurityError'))

    await store.register()

    expect(store.getSnapshot()).toMatchObject({ lastError: '登録に失敗しました: SecurityError' })
  })
})

import { useSyncExternalStore } from 'react'
import { SW_SCRIPT_URL } from '../config.ts'
import { createRegistrationStore, type RegistrationSnapshot } from './registration-store.ts'

const registrationStore = createRegistrationStore<ServiceWorkerRegistration>({
  container: 'serviceWorker' in navigator ? navigator.serviceWorker : null,
  scriptUrl: SW_SCRIPT_URL,
  reload: () => {
    window.location.reload()
  },
})

export type SwRegistrationApi = {
  snapshot: RegistrationSnapshot
  register: () => Promise<void>
  unregister: () => Promise<void>
  checkForUpdate: () => Promise<void>
  activateWaiting: () => void
  getActiveRegistration: () => ServiceWorkerRegistration | null
}

export function useSwRegistration(): SwRegistrationApi {
  const snapshot = useSyncExternalStore(registrationStore.subscribe, registrationStore.getSnapshot)
  return {
    snapshot,
    register: registrationStore.register,
    unregister: registrationStore.unregister,
    checkForUpdate: registrationStore.checkForUpdate,
    activateWaiting: registrationStore.activateWaiting,
    getActiveRegistration: registrationStore.getActiveRegistration,
  }
}

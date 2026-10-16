export type BrowserSupport = {
  worker: boolean
  sharedWorker: boolean
  serviceWorker: boolean
  pushManager: boolean
  notification: boolean
  secureContext: boolean
  logicalCores: number | null
}

export function detectBrowserSupport(): BrowserSupport {
  return {
    worker: typeof Worker !== 'undefined',
    sharedWorker: typeof SharedWorker !== 'undefined',
    serviceWorker: 'serviceWorker' in navigator,
    pushManager: 'PushManager' in window,
    notification: 'Notification' in window,
    secureContext: window.isSecureContext,
    logicalCores: navigator.hardwareConcurrency > 0 ? navigator.hardwareConcurrency : null,
  }
}

export const browserSupport: BrowserSupport = detectBrowserSupport()

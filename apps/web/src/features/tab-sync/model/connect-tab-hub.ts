import type { HubPort } from './tab-hub-client.ts'

export function connectTabHub(onError: (message: string) => void): HubPort {
  const worker = new SharedWorker(new URL('../worker/tab-hub.shared-worker.ts', import.meta.url), {
    type: 'module',
    name: 'tab-hub',
  })
  worker.addEventListener('error', () => {
    onError('SharedWorker の起動に失敗しました')
  })
  return worker.port
}

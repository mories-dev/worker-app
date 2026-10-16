import { browserSupport } from '@/shared/lib'
import { Badge } from '@/shared/ui'
import styles from './WorkerLabPage.module.css'

const FEATURES = [
  { id: 'worker', label: 'Worker', supported: browserSupport.worker },
  { id: 'shared-worker', label: 'SharedWorker', supported: browserSupport.sharedWorker },
  { id: 'service-worker', label: 'Service Worker', supported: browserSupport.serviceWorker },
  { id: 'push', label: 'Push API', supported: browserSupport.pushManager },
  { id: 'notification', label: 'Notification', supported: browserSupport.notification },
  { id: 'secure', label: '安全なコンテキスト（HTTPS / localhost）', supported: browserSupport.secureContext },
] as const

export function EnvironmentStatus() {
  return (
    <section className={styles.environment} aria-labelledby="environment-heading">
      <h2 id="environment-heading" className={styles.environmentTitle}>
        このブラウザの対応状況
      </h2>
      <ul className={styles.environmentList}>
        {FEATURES.map((feature) => (
          <li key={feature.id}>
            <Badge tone={feature.supported ? 'success' : 'danger'}>{feature.supported ? '対応' : '非対応'}</Badge>{' '}
            {feature.label}
          </li>
        ))}
        <li>
          <Badge tone="neutral">{browserSupport.logicalCores ?? '不明'}</Badge> 論理コア数（
          <code>navigator.hardwareConcurrency</code>）
        </li>
      </ul>
    </section>
  )
}

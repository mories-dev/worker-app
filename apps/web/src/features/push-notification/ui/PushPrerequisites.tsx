import { Badge, Button } from '@/shared/ui'
import type { PublicKeyState } from '../model/use-vapid-public-key.ts'
import type { PushSubscriptionState } from '../model/use-push-subscription.ts'
import styles from './PushDemo.module.css'

const PERMISSION_LABELS: Record<NotificationPermission, string> = {
  default: '未確認（購読するときにブラウザが確認します）',
  granted: '許可済み',
  denied: '拒否されています。アドレスバーのサイト設定から許可に変えてください',
}

export type PushPrerequisitesProps = {
  subscription: PushSubscriptionState
  publicKey: PublicKeyState
  permission: NotificationPermission | null
  onRetryPublicKey: () => void
}

export function PushPrerequisites({ subscription, publicKey, permission, onRetryPublicKey }: PushPrerequisitesProps) {
  if (subscription.status === 'unsupported') {
    return <p role="alert">このブラウザは Push API または通知に対応していません。</p>
  }

  const swReady = subscription.status !== 'waiting-for-sw'
  return (
    <ul className={styles.checklist}>
      <li>
        {swReady ? <Badge tone="success">OK</Badge> : <Badge tone="warning">未完了</Badge>} Service Worker が有効
        {!swReady && <span className={styles.muted}> — 先に「3. Service Worker」の「登録する」を押してください</span>}
      </li>
      <li>
        {publicKey.status === 'ready' && <Badge tone="success">OK</Badge>}
        {publicKey.status === 'loading' && <Badge>確認中</Badge>}
        {publicKey.status === 'error' && <Badge tone="danger">接続できない</Badge>} push-server（VAPID 公開鍵を取得）
        {publicKey.status === 'error' && (
          <span className={styles.errorLine}>
            {publicKey.message} 鍵が未生成なら <code>pnpm setup:push mailto:you@example.com</code> を実行してください。
            <Button onClick={onRetryPublicKey}>再試行</Button>
          </span>
        )}
      </li>
      <li>
        <Badge tone={permission === 'granted' ? 'success' : permission === 'denied' ? 'danger' : 'neutral'}>
          {permission ?? '不明'}
        </Badge>{' '}
        通知の許可: {permission ? PERMISSION_LABELS[permission] : '不明'}
      </li>
    </ul>
  )
}

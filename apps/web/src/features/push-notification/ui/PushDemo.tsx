import { SwLogList } from '@/entities/service-worker'
import { FlowDiagram, KeyPoints, Panel } from '@/shared/ui'
import { usePushSender } from '../model/use-push-sender.ts'
import { usePushSubscription } from '../model/use-push-subscription.ts'
import { useVapidPublicKey } from '../model/use-vapid-public-key.ts'
import { PushControls } from './PushControls.tsx'
import styles from './PushDemo.module.css'
import { PushPrerequisites } from './PushPrerequisites.tsx'

const FLOW_NODES = [
  { id: 'server', label: 'push-server', note: 'VAPID 秘密鍵で署名' },
  { id: 'service', label: 'プッシュサービス', note: 'FCM / Mozilla / Apple など' },
  { id: 'sw', label: 'Service Worker', note: 'push イベントで起動' },
  { id: 'os', label: 'OS の通知', note: 'showNotification()' },
] as const
const FLOW_EDGES = [
  { label: 'POST endpoint', direction: 'forward' },
  { label: 'push', direction: 'forward' },
  { label: 'showNotification', direction: 'forward' },
] as const

const PUSH_EVENTS = ['push', 'notificationclick'] as const

export function PushDemo() {
  const publicKey = useVapidPublicKey()
  const subscriptionApi = usePushSubscription()
  const sender = usePushSender()

  return (
    <>
      <FlowDiagram
        caption="ページが閉じていても、ブラウザがプッシュを受け取ると Service Worker を起こして push イベントを渡します"
        nodes={FLOW_NODES}
        edges={FLOW_EDGES}
      />
      <div className={styles.grid}>
        <Panel title="準備" description="3つの条件がそろうと購読できます。">
          <PushPrerequisites
            subscription={subscriptionApi.state}
            publicKey={publicKey.state}
            permission={subscriptionApi.permission}
            onRetryPublicKey={publicKey.retry}
          />
        </Panel>
        <PushControls
          subscriptionApi={subscriptionApi}
          publicKey={publicKey.state.status === 'ready' ? publicKey.state.publicKey : null}
          sendState={sender.state}
          onSend={(subscription, delaySeconds) => void sender.send(subscription, delaySeconds)}
        />
      </div>
      <Panel title="Service Worker のログ（push）" description="push と notificationclick は、ページではなく Service Worker で発生するイベントです。">
        <SwLogList events={PUSH_EVENTS} emptyMessage="プッシュを受信すると、Service Worker がここにログを送ります。" />
      </Panel>
      <KeyPoints>
        <li>
          通知を受け取るのはページではなく Service Worker です。ブラウザはプッシュを受け取ると SW を起動し、<code>push</code> イベントを渡します。
        </li>
        <li>
          送り主は push-server（アプリケーションサーバー）です。VAPID 秘密鍵で署名して endpoint へ送ります。秘密鍵が漏れると誰でも送れてしまうため、ブラウザ側には置けません。
        </li>
        <li>
          このデモでは送信のたびに購読情報をサーバーへ渡していますが、実際のサービスではサーバー側の DB に保存しておき、好きなときに送ります。
        </li>
        <li>
          Chrome では <code>userVisibleOnly: true</code> が必須で、push を受け取ったら必ず通知を表示します（表示しないと、ブラウザが代わりに汎用の通知を出すことがあります）。
        </li>
        <li>
          通知が出ないときは、OS 側でブラウザの通知が許可されているか（macOS ならシステム設定の「通知」）を確認してください。iPhone / iPad では、ホーム画面に追加した Web アプリでのみ使えます。
        </li>
        <li>
          DevTools の Application → Service workers にある「Push」ボタンでも、サーバー無しで <code>push</code> イベントを試せます（本文はプレーンテキストとして表示されます）。
        </li>
        <li>予約送信は push-server のメモリ上のタイマーなので、push-server を再起動すると消えます。</li>
      </KeyPoints>
    </>
  )
}

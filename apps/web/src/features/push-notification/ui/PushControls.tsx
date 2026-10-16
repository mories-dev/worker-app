import type { PushSubscriptionPayload } from '@worker-lab/push-contract'
import { formatClock } from '@/shared/lib'
import { Badge, Button, Panel } from '@/shared/ui'
import type { PushSendState } from '../model/use-push-sender.ts'
import type { PushSubscriptionApi } from '../model/use-push-subscription.ts'
import styles from './PushDemo.module.css'

const DELAYED_SECONDS = 10

export type PushControlsProps = {
  subscriptionApi: PushSubscriptionApi
  publicKey: string | null
  sendState: PushSendState
  onSend: (subscription: PushSubscriptionPayload, delaySeconds: number) => void
}

function SendResult({ state }: { state: PushSendState }) {
  switch (state.status) {
    case 'idle':
      return null
    case 'sending':
      return <p className={styles.muted}>push-server に依頼しています…</p>
    case 'error':
      return (
        <p role="alert" className={styles.error}>
          {state.message}
        </p>
      )
    case 'done':
      return state.response.status === 'sent' ? (
        <p role="status">
          <Badge tone="success">送信済み</Badge> {formatClock(Date.parse(state.response.sentAt))} に push-server がプッシュサービスへ送りました。
        </p>
      ) : (
        <p role="status">
          <Badge tone="info">予約済み</Badge> {formatClock(Date.parse(state.response.sendAt))} に送信します。今のうちにこのタブを閉じてみてください。
        </p>
      )
  }
}

export function PushControls({ subscriptionApi, publicKey, sendState, onSend }: PushControlsProps) {
  const { state, pending, actionError, subscribe, unsubscribe } = subscriptionApi
  const subscription = state.status === 'ready' ? state.subscription : null
  const canSubscribe = state.status === 'ready' && !subscription && publicKey !== null && pending === null
  const sending = sendState.status === 'sending'

  return (
    <>
      <Panel title="購読する" description="ブラウザがプッシュサービスに登録し、送信先 URL（endpoint）と暗号鍵を発行します。">
        {subscription ? (
          <>
            <p>
              <Badge tone="success">購読中</Badge> 送信先のプッシュサービス: <code>{new URL(subscription.endpoint).host}</code>
            </p>
            <p className={styles.endpoint}>{subscription.endpoint}</p>
            <Button variant="danger" onClick={() => void unsubscribe()} disabled={pending !== null}>
              購読を解除
            </Button>
          </>
        ) : (
          <Button variant="primary" onClick={() => publicKey && void subscribe(publicKey)} disabled={!canSubscribe}>
            {pending === 'subscribe' ? '購読しています…' : '購読する（通知の許可を求めます）'}
          </Button>
        )}
        {state.status === 'loading' && <p className={styles.muted}>購読状態を確認しています…</p>}
        {state.status === 'error' && <p className={styles.error}>{state.message}</p>}
        {actionError && (
          <p role="alert" className={styles.error}>
            {actionError}
          </p>
        )}
      </Panel>
      <Panel title="サーバーから送る" description="push-server が VAPID 秘密鍵で署名し、endpoint へ送ります。">
        <div className={styles.actions}>
          <Button variant="primary" disabled={!subscription || sending} onClick={() => subscription && onSend(subscription, 0)}>
            今すぐ送信
          </Button>
          <Button disabled={!subscription || sending} onClick={() => subscription && onSend(subscription, DELAYED_SECONDS)}>
            {DELAYED_SECONDS}秒後に送信
          </Button>
        </div>
        <p className={styles.muted}>
          「{DELAYED_SECONDS}秒後に送信」を押したら、このタブを閉じてみてください（ブラウザ自体は起動したまま）。それでも通知が届き、クリックするとこのページが開きます。
        </p>
        <SendResult state={sendState} />
      </Panel>
    </>
  )
}

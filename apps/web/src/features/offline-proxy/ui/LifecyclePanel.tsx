import { useState } from 'react'
import type { SwRegistrationApi, WorkerSlots } from '@/entities/service-worker'
import { Badge, Button, Panel, type BadgeTone } from '@/shared/ui'
import styles from './ServiceWorkerDemo.module.css'

const SLOT_NOTES: Record<keyof WorkerSlots, string> = {
  installing: 'インストール中',
  waiting: '待機中',
  active: '有効',
}

const STATE_TONES: Record<ServiceWorkerState, BadgeTone> = {
  parsed: 'neutral',
  installing: 'info',
  installed: 'warning',
  activating: 'info',
  activated: 'success',
  redundant: 'danger',
}

function SlotGrid({ slots }: { slots: WorkerSlots }) {
  const keys = ['installing', 'waiting', 'active'] as const
  return (
    <ol className={styles.slots}>
      {keys.map((key) => {
        const state = slots[key]
        return (
          <li key={key} className={styles.slot}>
            <span className={styles.slotName}>
              <code>{key}</code>
              <span className={styles.muted}>{SLOT_NOTES[key]}</span>
            </span>
            {state ? <Badge tone={STATE_TONES[state]}>{state}</Badge> : <span className={styles.muted}>なし</span>}
          </li>
        )
      })}
    </ol>
  )
}

export function LifecyclePanel({ api }: { api: SwRegistrationApi }) {
  const { snapshot, register, unregister, checkForUpdate, activateWaiting } = api
  const [busy, setBusy] = useState(false)
  const run = (action: () => Promise<void>) => async () => {
    setBusy(true)
    try {
      await action()
    } finally {
      setBusy(false)
    }
  }

  if (snapshot.status === 'unsupported') {
    return (
      <Panel title="登録とライフサイクル">
        <p role="alert">この環境では Service Worker を使えません（HTTPS か localhost で開く必要があります）。</p>
      </Panel>
    )
  }

  const registered = snapshot.status === 'registered'
  const actions = registered ? (
    <>
      <Button onClick={run(checkForUpdate)} disabled={busy}>
        更新を確認
      </Button>
      <Button variant="danger" onClick={run(unregister)} disabled={busy}>
        登録解除
      </Button>
    </>
  ) : (
    <Button variant="primary" onClick={run(register)} disabled={busy || snapshot.status === 'checking'}>
      登録する
    </Button>
  )

  return (
    <Panel
      title="登録とライフサイクル"
      description="新しい Service Worker は installing → waiting → active の順に移動します。"
      actions={actions}
    >
      {snapshot.status === 'checking' && <p className={styles.muted}>登録状態を確認しています…</p>}
      {registered && <SlotGrid slots={snapshot.slots} />}
      {snapshot.status !== 'checking' && (
        <p>
          このページの制御:{' '}
          {snapshot.controlled ? <Badge tone="success">Service Worker の制御下</Badge> : <Badge>制御されていない</Badge>}
          {!registered && snapshot.controlled && (
            <span className={styles.muted}> 登録は解除済みですが、リロードするまでは古い SW が制御を続けます。</span>
          )}
        </p>
      )}
      {registered && snapshot.slots.waiting && (
        <div className={styles.waiting} role="status">
          <p>新しいバージョンが waiting で待機しています。古い SW が制御するページが無くなるまで切り替わりません。</p>
          <Button variant="primary" onClick={activateWaiting}>
            今すぐ切り替える（skipWaiting）
          </Button>
        </div>
      )}
      {snapshot.status !== 'checking' && snapshot.lastError && (
        <p role="alert" className={styles.error}>
          {snapshot.lastError}
        </p>
      )}
      <p className={styles.muted}>
        更新の流れを試すには、<code>apps/web/public/sw.js</code> の <code>VERSION</code> を書き換えてから「更新を確認」を押してください。
      </p>
    </Panel>
  )
}

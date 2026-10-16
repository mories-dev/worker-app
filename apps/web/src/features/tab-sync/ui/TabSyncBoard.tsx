import { formatClock, formatNumber } from '@/shared/lib'
import { Badge, Button, Panel } from '@/shared/ui'
import { STAMPS, type HubSnapshot, type Stamp } from '../model/protocol.ts'
import type { TabIdentity } from '../model/tab-hub-client.ts'
import styles from './TabSyncDemo.module.css'

export type TabSyncBoardProps = {
  me: TabIdentity
  snapshot: HubSnapshot
  onIncrement: () => void
  onStamp: (stamp: Stamp) => void
  onOpenTab: () => void
}

export function TabSyncBoard({ me, snapshot, onIncrement, onStamp, onOpenTab }: TabSyncBoardProps) {
  return (
    <div className={styles.grid}>
      <Panel
        title="接続中のタブ"
        description="このページを別タブでも開くと、同じ SharedWorker に接続されて一覧に増えます。"
        actions={<Button onClick={onOpenTab}>新しいタブで開く</Button>}
      >
        <p className={styles.me}>
          このタブは <strong>{me.label}</strong>
        </p>
        <ul className={styles.tabList}>
          {snapshot.tabs.map((tab) => (
            <li key={tab.id} className={styles.tabItem}>
              {tab.label}
              {tab.id === me.tabId && <Badge tone="info">このタブ</Badge>}
              <span className={styles.muted}>{formatClock(tab.joinedAt)} に接続</span>
            </li>
          ))}
        </ul>
        <dl className={styles.facts}>
          <dt>Worker の起動時刻</dt>
          <dd>{formatClock(snapshot.startedAt)}</dd>
          <dt>これまでの接続数</dt>
          <dd>{formatNumber(snapshot.totalConnections)}</dd>
        </dl>
      </Panel>
      <Panel title="共有カウンター" description="値は Worker の中に1つだけあり、どのタブから押しても全タブに配信されます。">
        <p className={styles.counter} aria-live="polite">
          {formatNumber(snapshot.counter)}
        </p>
        <Button variant="primary" onClick={onIncrement}>
          +1
        </Button>
        <p className={styles.muted}>最後に押したタブ: {snapshot.lastIncrementBy ?? 'まだありません'}</p>
      </Panel>
      <Panel title="スタンプを送る" description="押したスタンプは SharedWorker を経由して全タブに届きます。">
        <div className={styles.stamps}>
          {STAMPS.map((stamp) => (
            <Button key={stamp} onClick={() => onStamp(stamp)}>
              {stamp}
            </Button>
          ))}
        </div>
        {snapshot.messages.length === 0 ? (
          <p className={styles.muted}>まだスタンプはありません。</p>
        ) : (
          <ol className={styles.messages} aria-live="polite">
            {snapshot.messages.map((entry) => (
              <li key={entry.id} className={styles.message}>
                <span className={styles.muted}>{formatClock(entry.at)}</span>
                <strong>{entry.tabLabel}</strong>
                {entry.tabId === me.tabId && <Badge tone="info">自分</Badge>}
                <span>{entry.stamp}</span>
              </li>
            ))}
          </ol>
        )}
      </Panel>
    </div>
  )
}

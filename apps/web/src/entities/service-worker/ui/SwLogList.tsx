import { formatClock } from '@/shared/lib'
import { Badge, Button } from '@/shared/ui'
import type { SwLogEvent } from '../model/sw-message.ts'
import { useSwLogs } from '../model/use-sw-logs.ts'
import styles from './SwLogList.module.css'

export type SwLogListProps = {
  events?: readonly SwLogEvent[]
  emptyMessage: string
}

export function SwLogList({ events, emptyMessage }: SwLogListProps) {
  const { entries, clear } = useSwLogs()
  const visible = events ? entries.filter((entry) => events.includes(entry.event)) : entries

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <span className={styles.count}>{visible.length} 件</span>
        <Button onClick={() => clear(events)} disabled={visible.length === 0}>
          ログを消去
        </Button>
      </div>
      {visible.length === 0 ? (
        <p className={styles.empty}>{emptyMessage}</p>
      ) : (
        <ol className={styles.list} aria-live="polite">
          {visible.map((entry) => (
            <li key={entry.id} className={styles.item}>
              <time className={styles.time} dateTime={new Date(entry.at).toISOString()}>
                {formatClock(entry.at)}
              </time>
              <code className={styles.event}>{entry.event}</code>
              <Badge>{entry.version}</Badge>
              <span className={styles.detail}>{entry.detail}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

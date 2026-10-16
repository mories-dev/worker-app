import { Badge, Button, Panel } from '@/shared/ui'
import type { CacheEntriesApi } from '../model/use-cache-entries.ts'
import { useOnlineStatus } from '../model/use-online-status.ts'
import styles from './ServiceWorkerDemo.module.css'

export function CachePanel({ cache }: { cache: CacheEntriesApi }) {
  const { state, refresh, clearAll } = cache
  const { online } = useOnlineStatus()

  return (
    <Panel
      title="Cache Storage とオフライン"
      description="SW がネットワークから取得できたファイルは、ここに保存されます。ページからも同じ Cache Storage を読めます。"
      actions={
        <>
          <Button onClick={refresh}>再読み込み</Button>
          <Button variant="danger" onClick={() => void clearAll()} disabled={state.status !== 'ready'}>
            キャッシュを削除
          </Button>
        </>
      }
    >
      <p>
        ネットワーク状態（<code>navigator.onLine</code>）: {online ? <Badge tone="success">オンライン</Badge> : <Badge tone="warning">オフライン</Badge>}
        <span className={styles.muted}> ※サーバーの停止は検知できません</span>
      </p>
      {state.status === 'unsupported' && <p role="alert">この環境では Cache Storage を使えません。</p>}
      {state.status === 'loading' && <p className={styles.muted}>読み込み中…</p>}
      {state.status === 'error' && (
        <p role="alert" className={styles.error}>
          {state.message}
        </p>
      )}
      {state.status === 'ready' &&
        (state.entries.length === 0 ? (
          <p className={styles.muted}>キャッシュはまだ空です。</p>
        ) : (
          <>
            <p className={styles.muted}>{state.entries.length} 件（キャッシュ名: {state.entries[0]?.cacheName}）</p>
            <ul className={styles.cacheList}>
              {state.entries.map((entry) => (
                <li key={entry.id}>
                  <code>{entry.path}</code>
                </li>
              ))}
            </ul>
          </>
        ))}
      <details className={styles.steps}>
        <summary>オフラインを体験する手順</summary>
        <ol>
          <li>上の「登録する」で Service Worker を有効にします。</li>
          <li>ページをリロードします。今度はページ本体の読み込みも SW を経由するので、ファイルがキャッシュに入ります。</li>
          <li>
            開発サーバーを止める（<code>Ctrl+C</code>）か、DevTools の Network パネルで「Offline」を選びます。
          </li>
          <li>もう一度リロードします。サーバーに届かなくても、SW がキャッシュから返すのでページが表示されます。</li>
        </ol>
      </details>
    </Panel>
  )
}

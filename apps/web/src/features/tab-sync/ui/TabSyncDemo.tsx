import { Badge, FlowDiagram, KeyPoints } from '@/shared/ui'
import { useTabHub } from '../model/use-tab-hub.ts'
import { TabSyncBoard } from './TabSyncBoard.tsx'
import styles from './TabSyncDemo.module.css'

const FLOW_NODES = [
  { id: 'tabs', label: '同じオリジンのタブ', note: 'タブ 1・タブ 2・タブ 3 …' },
  { id: 'shared', label: 'SharedWorker', note: '状態を1つだけ持つ' },
] as const
const FLOW_EDGES = [{ label: 'MessagePort', direction: 'both' }] as const

function openThisPageInNewTab() {
  window.open(`${window.location.pathname}#shared`, '_blank', 'noopener')
}

export function TabSyncDemo() {
  const { view, increment, sendStamp } = useTabHub()

  return (
    <>
      <FlowDiagram
        caption="各タブは自分専用の MessagePort で同じ1つの Worker とつながり、Worker が全ポートに状態を配信します"
        nodes={FLOW_NODES}
        edges={FLOW_EDGES}
      />
      {view.status === 'unsupported' && (
        <p className={styles.notice} role="alert">
          このブラウザは SharedWorker に対応していません（Chrome for Android は 148 以降、Safari は 16 以降で対応）。
        </p>
      )}
      {view.status === 'connecting' && <p className={styles.notice}>SharedWorker に接続しています…</p>}
      {view.status === 'failed' && (
        <p className={styles.notice} role="alert">
          <Badge tone="danger">接続エラー</Badge> {view.message}
        </p>
      )}
      {view.status === 'connected' && (
        <>
          {view.notice && (
            <p className={styles.notice} role="status">
              <Badge tone="warning">お知らせ</Badge> {view.notice}
            </p>
          )}
          <TabSyncBoard
            me={view.me}
            snapshot={view.snapshot}
            onIncrement={increment}
            onStamp={sendStamp}
            onOpenTab={openThisPageInNewTab}
          />
        </>
      )}
      <KeyPoints>
        <li>
          同じオリジン・同じスクリプト URL・同じ <code>name</code> なら、どのタブからも同じ1つの Worker インスタンスに接続されます。
        </li>
        <li>
          通信は接続ごとの <code>MessagePort</code>（<code>worker.port</code>）経由です。Worker は <code>connect</code>{' '}
          イベントで受け取ったポートを覚えておき、全ポートに状態を配信しています。
        </li>
        <li>
          カウンターやスタンプは Worker のメモリにしかありません。すべてのタブを閉じると Worker ごと消えます（タブが1つだけならリロードでも消えます）。
        </li>
        <li>
          タブが閉じたことを Worker に伝える標準イベントは無いため、<code>pagehide</code> で自分から leave を送っています。クラッシュしたタブは一覧に残ることがあります。
        </li>
        <li>
          Chrome では <code>chrome://inspect/#workers</code>、Firefox では <code>about:debugging#workers</code> から SharedWorker を調べられます。
        </li>
      </KeyPoints>
    </>
  )
}

import { SwLogList, useSwRegistration } from '@/entities/service-worker'
import { FlowDiagram, KeyPoints, Panel } from '@/shared/ui'
import { useCacheEntries } from '../model/use-cache-entries.ts'
import { CachePanel } from './CachePanel.tsx'
import { LifecyclePanel } from './LifecyclePanel.tsx'
import { RequestPlayground } from './RequestPlayground.tsx'
import styles from './ServiceWorkerDemo.module.css'

const FLOW_NODES = [
  { id: 'page', label: 'ページ', note: 'fetch() を呼ぶ' },
  { id: 'sw', label: 'Service Worker', note: 'fetch イベントで横取り' },
  { id: 'network', label: 'ネットワーク / Cache Storage', note: 'どちらから返すかは SW が決める' },
] as const
const FLOW_EDGES = [
  { label: 'request', direction: 'forward' },
  { label: 'respondWith()', direction: 'both' },
] as const

const LIFECYCLE_EVENTS = ['install', 'activate', 'fetch', 'message'] as const

export function ServiceWorkerDemo() {
  const registration = useSwRegistration()
  const cache = useCacheEntries()
  const { snapshot } = registration
  const controlled = 'controlled' in snapshot && snapshot.controlled

  return (
    <>
      <FlowDiagram
        caption="Service Worker はページとネットワークの間に立つプロキシです。ページを閉じても登録は残り、次の訪問でも働きます"
        nodes={FLOW_NODES}
        edges={FLOW_EDGES}
      />
      <div className={styles.grid}>
        <LifecyclePanel api={registration} />
        <Panel title="Service Worker からのログ" description="SW の中で起きたことを、SW がページへ postMessage で知らせています。">
          <SwLogList events={LIFECYCLE_EVENTS} emptyMessage="まだログはありません。登録やリクエストを試してください。" />
        </Panel>
      </div>
      <div className={styles.grid}>
        <RequestPlayground controlled={controlled} onSettled={cache.refresh} />
        <CachePanel cache={cache} />
      </div>
      <KeyPoints>
        <li>
          Service Worker は <code>fetch</code> イベントでページのリクエストを横取りし、<code>respondWith()</code>{' '}
          で自前のレスポンスやキャッシュを返せる「プログラム可能なプロキシ」です。
        </li>
        <li>
          登録はオリジン単位で残り続けます。一方で SW 自体はイベントが無いとブラウザに停止される（Chromium の既定は約30秒）ため、グローバル変数に状態を持たせてはいけません。
        </li>
        <li>
          最初に登録した直後のページは、まだ SW に制御されていません。このデモは <code>activate</code> で{' '}
          <code>clients.claim()</code> を呼び、すぐに制御を始めています。
        </li>
        <li>
          <code>sw.js</code> が1バイトでも変わると新しい版がインストールされ、古い版が制御するページが無くなるまで waiting で待ちます（<code>skipWaiting()</code> で即時に切り替え）。
        </li>
        <li>HTTPS か localhost でしか動きません。Shift を押しながらのリロードは SW を経由しません。</li>
        <li>DevTools の Application パネル（Service workers / Cache storage）で、登録状態とキャッシュの中身を確認できます。</li>
      </KeyPoints>
    </>
  )
}

export type WorkerComparisonRow = {
  id: 'dedicated' | 'shared' | 'service'
  name: string
  relation: string
  lifetime: string
  strengths: string
  messaging: string
  demo: string
}

export const WORKER_COMPARISON: readonly WorkerComparisonRow[] = [
  {
    id: 'dedicated',
    name: 'Dedicated Worker',
    relation: '1つのページ ⇄ 1つの Worker',
    lifetime: '作ったページが閉じるか terminate() されるまで',
    strengths: '重い計算を UI から切り離す',
    messaging: 'worker.postMessage() / message イベント',
    demo: '1. 素数カウント',
  },
  {
    id: 'shared',
    name: 'SharedWorker',
    relation: '同じオリジンの複数タブ ⇄ 1つの Worker',
    lifetime: '接続しているページが1つでも残っている間',
    strengths: 'タブ間の状態共有、接続（WebSocket など）の集約',
    messaging: 'worker.port（MessagePort）経由',
    demo: '2. タブ間カウンターとスタンプ',
  },
  {
    id: 'service',
    name: 'Service Worker',
    relation: 'スコープ内の全ページ ⇄ 1つの Worker（ページとネットワークの間）',
    lifetime: 'ページとは独立。イベントのたびにブラウザが起動・停止する',
    strengths: 'リクエストの横取り、オフライン対応、プッシュ通知',
    messaging: 'controller.postMessage() / clients.matchAll() + postMessage()',
    demo: '3. モック API とキャッシュ / 4. プッシュ通知',
  },
]

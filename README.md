# Worker Lab — ブラウザの Worker を触って比べる

Dedicated Worker / SharedWorker / Service Worker と Web Push 通知の役割を、実際に動かして体感するための学習用アプリです（pnpm モノレポ）。

| セクション | 体験できること |
| --- | --- |
| 1. Dedicated Worker | 同じ素数カウントをメインスレッドと Worker で実行し、画面が固まるかどうかを比べる。`terminate()` で中断する |
| 2. SharedWorker | 複数タブから1つの Worker に接続し、カウンターとスタンプを共有する。タブ一覧で接続と離脱を見る |
| 3. Service Worker | 登録とライフサイクル（installing → waiting → active）、リクエストの横取り（モック API）、ネットワーク優先 + キャッシュによるオフライン表示 |
| 4. プッシュ通知 | 購読 → push-server から送信 → Service Worker が受け取って通知。タブを閉じていても届くことを確かめる |

## 構成

```
apps/
  web/                         Vite + React 19 + TypeScript（Feature-Sliced Design）
    public/sw.js               Service Worker 本体（手書きのクラシックスクリプト、// @ts-check で型検査）
    src/features/prime-offload       1. Dedicated Worker（worker/prime.worker.ts）
    src/features/tab-sync            2. SharedWorker（worker/tab-hub.shared-worker.ts）
    src/features/offline-proxy       3. Service Worker の横取り・キャッシュ・ライフサイクル
    src/features/push-notification   4. プッシュ通知の購読と送信
    src/entities/service-worker      SW の登録状態ストアとログ（3 と 4 で共有）
  push-server/                 Hono + web-push。VAPID 秘密鍵を持ち、プッシュサービスへ送信する
packages/
  push-contract/               web と push-server で共有する zod スキーマ（API の入出力と通知の中身）
```

## 必要なもの

- Node.js 24 以上（push-server は Node の型除去機能で TypeScript を直接実行します）
- pnpm 10
- 最新の Chrome / Edge / Firefox（Safari は 16 以降。Chrome for Android の SharedWorker は 148 以降）

## セットアップと起動

```sh
pnpm install
pnpm setup:push mailto:you@example.com   # 初回のみ。VAPID 鍵を apps/push-server/.env に生成
pnpm dev                                  # web と push-server を同時に起動
```

- web: http://localhost:5180 （Service Worker の登録はポート単位なので、他のプロジェクトと被りにくい固定ポートにしています）
- push-server: http://127.0.0.1:8787 （ループバックのみで待ち受け。web からは Vite のプロキシ経由で `/api/*` に転送）
- 本番ビルドで試す場合は、`pnpm dev` を止めてから `pnpm preview` を実行し、http://localhost:4180 を開きます。

`apps/push-server/.env` には秘密鍵が入ります。`.gitignore` 済みなので、コミットしないでください。VAPID の連絡先は `mailto:` か `https://` で指定します（`localhost` は Apple のプッシュサービスに拒否されることがあります）。

## 試し方のヒント

1. **Dedicated Worker**: 「メインスレッドで実行」を押すと、計算が終わるまでボールと経過時間が止まり、入力欄にも文字が打てません。「Worker で実行」では画面が動き続け、途中経過も届きます。
2. **SharedWorker**: 「新しいタブで開く」で2つ目のタブを開き、どちらかで「+1」を押してください。全タブを閉じると状態は消えます。Chrome では `chrome://inspect/#workers` から中身を調べられます。
3. **Service Worker**: 「登録する」→ ページをリロード（ページ本体もキャッシュに入る）→ 開発サーバーを止めるか DevTools で Offline にする → もう一度リロード、の順に試すとオフラインでも表示されます。`apps/web/public/sw.js` の `VERSION` を書き換えて「更新を確認」を押すと、新しい版が waiting で待つ様子を見られます。
4. **プッシュ通知**: 3 で Service Worker を登録してから「購読する」を押し、通知を許可します。「10秒後に送信」を押してタブを閉じても、通知が届きます。通知が出ないときは OS 側の通知設定（macOS ならシステム設定の「通知」）でブラウザが許可されているか確認してください。

## 開発コマンド

```sh
pnpm test        # 全パッケージの Vitest
pnpm typecheck   # 全パッケージの tsc（web は app / worker / sw / node の4つの tsconfig）
pnpm lint        # ESLint（リポジトリ全体）
pnpm build       # web の本番ビルド
```

## 知っておきたい注意点

- **Service Worker は登録が残り続けます。** 片付けるときは画面の「登録解除」か、DevTools の Application → Service workers → Unregister を使ってください。登録を解除しても、そのページはリロードするまで古い SW の制御下に残ります。
- **SharedWorker は、開いているタブがある限り古いコードのまま動き続けます。** `tab-hub.shared-worker.ts` を変更したら、このアプリのタブをすべて閉じてから開き直してください。
- **push-server は状態を持ちません。** 購読情報は送信のたびに web から受け取り、予約送信はメモリ上のタイマーなので、再起動すると消えます（実運用では購読情報を DB に保存します）。
- **`public/sw.js` はバンドルされない素の JavaScript です。** 次の値は TypeScript 側と手作業で揃えています。
  - キャッシュ名の接頭辞と `SKIP_WAITING` メッセージ: `apps/web/src/entities/service-worker/config.ts`
  - SW からのログの形式: `apps/web/src/entities/service-worker/model/sw-message.ts`
  - `X-Served-By` ヘッダーの値: `apps/web/src/features/offline-proxy/lib/classify-response.ts`
  - 通知の中身（title / body）: `packages/push-contract/src/push-payload.ts`

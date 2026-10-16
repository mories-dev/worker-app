import { ServiceWorkerDemo } from '@/features/offline-proxy'
import { PrimeOffloadDemo } from '@/features/prime-offload'
import { PushDemo } from '@/features/push-notification'
import { TabSyncDemo } from '@/features/tab-sync'
import { DemoSection } from '@/shared/ui'
import { ComparisonTable } from './ComparisonTable.tsx'
import { EnvironmentStatus } from './EnvironmentStatus.tsx'
import styles from './WorkerLabPage.module.css'

const SECTIONS = [
  { id: 'dedicated', title: '1. Dedicated Worker' },
  { id: 'shared', title: '2. SharedWorker' },
  { id: 'service', title: '3. Service Worker' },
  { id: 'push', title: '4. プッシュ通知' },
] as const

export function WorkerLabPage() {
  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <p className={styles.eyebrow}>Worker Lab</p>
        <h1 className={styles.title}>ブラウザの Worker を触って比べる</h1>
        <p className={styles.lead}>
          JavaScript は基本的に1本のメインスレッドで動きます。Worker を使うと、その外側で計算したり、タブ同士で状態を共有したり、ページとネットワークの間に処理を挟んだりできます。3種類の
          Worker とプッシュ通知を実際に動かして、役割の違いを体感してください。
        </p>
        <nav aria-label="目次">
          <ol className={styles.toc}>
            {SECTIONS.map((section) => (
              <li key={section.id}>
                <a href={`#${section.id}`}>{section.title}</a>
              </li>
            ))}
          </ol>
        </nav>
      </header>
      <main className={styles.main}>
        <EnvironmentStatus />
        <ComparisonTable />
        <DemoSection
          id="dedicated"
          index={1}
          accent="dedicated"
          title="Dedicated Worker — 重い計算をメインスレッドから逃がす"
          tagline="1つのページ専用の作業スレッド。UI を止めずに CPU を使う処理を任せられます。"
        >
          <PrimeOffloadDemo />
        </DemoSection>
        <DemoSection
          id="shared"
          index={2}
          accent="shared"
          title="SharedWorker — 複数のタブで1つの Worker を共有する"
          tagline="同じオリジンのタブがすべて同じ Worker につながります。このページを2つ以上のタブで開いて試してください。"
        >
          <TabSyncDemo />
        </DemoSection>
        <DemoSection
          id="service"
          index={3}
          accent="service"
          title="Service Worker — ページとネットワークの間に立つプロキシ"
          tagline="ページのリクエストを横取りして、自前のレスポンスやキャッシュを返せます。オフライン対応の要です。"
        >
          <ServiceWorkerDemo />
        </DemoSection>
        <DemoSection
          id="push"
          index={4}
          accent="push"
          title="プッシュ通知 — ページを閉じていても Service Worker が受け取る"
          tagline="サーバー → プッシュサービス → Service Worker → OS の通知、という流れを実際に送って確かめます。"
        >
          <PushDemo />
        </DemoSection>
      </main>
      <footer className={styles.footer}>
        Worker Lab — apps/web（Vite + React）と apps/push-server（Hono + web-push）の学習用デモ
      </footer>
    </div>
  )
}

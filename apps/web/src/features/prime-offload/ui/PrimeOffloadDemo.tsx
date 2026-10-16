import { useState } from 'react'
import { formatNumber } from '@/shared/lib'
import { Button, FlowDiagram, KeyPoints, Panel } from '@/shared/ui'
import { usePrimeRunner } from '../model/use-prime-runner.ts'
import { MainThreadMonitor } from './MainThreadMonitor.tsx'
import styles from './PrimeOffloadDemo.module.css'
import { PrimeRunStatus } from './PrimeRunStatus.tsx'

const LIMIT_OPTIONS = [10_000_000, 20_000_000, 30_000_000] as const

const FLOW_NODES = [
  { id: 'main', label: 'メインスレッド', note: '描画・入力・React' },
  { id: 'worker', label: 'Dedicated Worker', note: '計算だけを担当' },
] as const
const FLOW_EDGES = [{ label: 'postMessage', direction: 'both' }] as const

export function PrimeOffloadDemo() {
  const [limit, setLimit] = useState<number>(LIMIT_OPTIONS[1])
  const { state, runOnMainThread, runInWorker, cancel } = usePrimeRunner()
  const running = state.status === 'running'
  const cancellable = running && state.mode === 'worker'

  return (
    <>
      <FlowDiagram
        caption="Worker は別スレッドで動き、メインスレッドとは postMessage でメッセージ（データのコピー）を送り合います"
        nodes={FLOW_NODES}
        edges={FLOW_EDGES}
      />
      <div className={styles.grid}>
        <Panel title="計算を実行する" description="同じ素数カウント関数を、どちらのスレッドで動かすかだけを切り替えます。">
          <fieldset className={styles.limits} disabled={running}>
            <legend className={styles.legend}>数える範囲（上限）</legend>
            {LIMIT_OPTIONS.map((option) => (
              <label key={option} className={styles.limitOption}>
                <input
                  type="radio"
                  name="prime-limit"
                  value={option}
                  checked={limit === option}
                  onChange={() => setLimit(option)}
                />
                {formatNumber(option)}
              </label>
            ))}
          </fieldset>
          <div className={styles.actions}>
            <Button variant="primary" onClick={() => runInWorker(limit)} disabled={running}>
              Worker で実行
            </Button>
            <Button onClick={() => runOnMainThread(limit)} disabled={running}>
              メインスレッドで実行
            </Button>
            <Button variant="danger" onClick={cancel} disabled={!cancellable}>
              中断（terminate）
            </Button>
          </div>
          <PrimeRunStatus state={state} />
        </Panel>
        <Panel title="画面の反応を観察する" description="計算中にボールと経過時間が止まるか、入力欄に文字が打てるかを見てください。">
          <MainThreadMonitor />
        </Panel>
      </div>
      <KeyPoints>
        <li>
          どちらのボタンも同じ <code>countPrimes()</code> を実行しています。違うのは「どのスレッドで動くか」だけです。
        </li>
        <li>メインスレッドで重い処理をすると、その間は描画もクリックもキー入力も処理されません。</li>
        <li>Worker は別スレッドなので画面は動き続けます。ただし計算自体が速くなるわけではありません。</li>
        <li>
          Worker は DOM に触れず、<code>postMessage</code> でデータのコピー（構造化複製）を受け渡します。
        </li>
        <li>
          <code>worker.terminate()</code> なら計算の途中でも即座に止められます。メインスレッドで始めた同期処理は止められません。
        </li>
        <li>
          DevTools の Sources パネルのスレッド一覧に <code>prime-counter</code> という Worker が現れます。
        </li>
      </KeyPoints>
    </>
  )
}

import { formatDuration, formatNumber, formatPercent } from '@/shared/lib'
import { Badge } from '@/shared/ui'
import type { PrimeRunState, RunMode } from '../model/use-prime-runner.ts'
import styles from './PrimeOffloadDemo.module.css'

const MODE_LABELS: Record<RunMode, string> = {
  main: 'メインスレッド',
  worker: 'Worker',
}

export function PrimeRunStatus({ state }: { state: PrimeRunState }) {
  switch (state.status) {
    case 'idle':
      return <p className={styles.status}>上限を選んで、2つのボタンを順に試してください。</p>
    case 'running':
      return state.mode === 'main' ? (
        <p className={styles.status} role="status">
          <Badge tone="warning">メインスレッドで計算中</Badge> 計算が終わるまで、この表示・ボール・入力欄はすべて止まります。
        </p>
      ) : (
        <div className={styles.status} role="status">
          <p>
            <Badge tone="info">Worker で計算中</Badge> {formatPercent((state.progress?.checked ?? 0) / state.limit)}{' '}
            完了（素数 {formatNumber(state.progress?.found ?? 0)} 個）
          </p>
          <progress className={styles.progress} max={state.limit} value={state.progress?.checked ?? 0} />
        </div>
      )
    case 'done':
      return (
        <p className={styles.status} role="status">
          <Badge tone="success">{MODE_LABELS[state.mode]}で完了</Badge> {formatNumber(state.limit)} 以下の素数は{' '}
          <strong>{formatNumber(state.found)} 個</strong>（{formatDuration(state.elapsedMs)}）
        </p>
      )
    case 'cancelled':
      return (
        <p className={styles.status} role="status">
          <Badge tone="warning">terminate() で中断</Badge> Worker を破棄しました（
          {formatPercent((state.progress?.checked ?? 0) / state.limit)} まで計算済み）。
        </p>
      )
    case 'error':
      return (
        <p className={styles.status} role="alert">
          <Badge tone="danger">エラー</Badge> {state.message}
        </p>
      )
  }
}

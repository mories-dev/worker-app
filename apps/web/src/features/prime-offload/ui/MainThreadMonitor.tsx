import { useEffect, useRef, useState } from 'react'
import { formatClock, formatDuration } from '@/shared/lib'
import styles from './MainThreadMonitor.module.css'

const STALL_THRESHOLD_MS = 200
const SWING_PERIOD_MS = 1600
// ページ読み込み直後は初期化でフレームが詰まりやすいので、計算による停止と混同しないよう数えない
const WARMUP_MS = 1500

type Stall = { gapMs: number; at: number }

function swingPosition(now: number): number {
  const phase = (now % SWING_PERIOD_MS) / SWING_PERIOD_MS
  return phase < 0.5 ? phase * 2 : 2 - phase * 2
}

export function MainThreadMonitor() {
  const trackRef = useRef<HTMLDivElement>(null)
  const ballRef = useRef<HTMLDivElement>(null)
  const clockRef = useRef<HTMLSpanElement>(null)
  const [lastStall, setLastStall] = useState<Stall | null>(null)

  useEffect(() => {
    let frameId = 0
    const startedAt = performance.now()
    let previous = startedAt

    // タブが非表示の間は rAF が止まるので、戻ってきたときの空白を停止として数えない
    const resetBaseline = () => {
      previous = performance.now()
    }

    const onFrame = (now: number) => {
      const gap = now - previous
      previous = now
      const warmedUp = now - startedAt > WARMUP_MS
      if (warmedUp && gap > STALL_THRESHOLD_MS && document.visibilityState === 'visible') {
        setLastStall({ gapMs: gap, at: Date.now() })
      }
      const track = trackRef.current
      const ball = ballRef.current
      if (track && ball) {
        ball.style.transform = `translateX(${swingPosition(now) * (track.clientWidth - ball.offsetWidth)}px)`
      }
      if (clockRef.current) {
        clockRef.current.textContent = ((now - startedAt) / 1000).toFixed(2)
      }
      frameId = requestAnimationFrame(onFrame)
    }

    frameId = requestAnimationFrame(onFrame)
    document.addEventListener('visibilitychange', resetBaseline)
    return () => {
      cancelAnimationFrame(frameId)
      document.removeEventListener('visibilitychange', resetBaseline)
    }
  }, [])

  return (
    <div className={styles.monitor}>
      <div className={styles.header}>
        <span className={styles.label}>requestAnimationFrame で毎フレーム動かしています</span>
        <span className={styles.clock}>
          経過 <span ref={clockRef} className={styles.clockValue} /> 秒
        </span>
      </div>
      <div ref={trackRef} className={styles.track} aria-hidden="true">
        <div ref={ballRef} className={styles.ball} />
      </div>
      <p className={styles.stall} role="status">
        {lastStall ? (
          <>
            直近の停止: <strong>{formatDuration(lastStall.gapMs)}</strong> 描画が止まりました（
            {formatClock(lastStall.at)}）
          </>
        ) : (
          'まだメインスレッドの停止は検知されていません'
        )}
      </p>
      <label className={styles.inputLabel}>
        入力テスト
        <input className={styles.input} placeholder="計算中にここへ文字を打ってみてください" />
      </label>
    </div>
  )
}

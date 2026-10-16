import { useState } from 'react'
import { formatDuration } from '@/shared/lib'
import { Badge, Button, Panel, type BadgeTone } from '@/shared/ui'
import { DEMO_REQUESTS, runDemoRequest, type DemoRequest, type DemoRequestResult } from '../api/demo-requests.ts'
import { RESPONSE_SOURCE_LABELS } from '../lib/classify-response.ts'
import styles from './ServiceWorkerDemo.module.css'

type RequestEntry = { status: 'pending' } | { status: 'settled'; result: DemoRequestResult }

export type RequestPlaygroundProps = {
  controlled: boolean
  onSettled?: () => void
}

function statusTone(status: number): BadgeTone {
  if (status < 300) return 'success'
  if (status < 500) return 'warning'
  return 'danger'
}

function RequestResultView({ result }: { result: DemoRequestResult }) {
  if (!result.ok) {
    return (
      <p role="alert" className={styles.error}>
        {result.message}（{formatDuration(result.elapsedMs)}）
      </p>
    )
  }
  return (
    <div className={styles.result}>
      <p>
        <Badge tone={statusTone(result.status)}>HTTP {result.status}</Badge> {RESPONSE_SOURCE_LABELS[result.source]}
      </p>
      <p className={styles.muted}>
        Date ヘッダー: {result.date ?? 'なし'} ／ 所要時間: {formatDuration(result.elapsedMs)}
      </p>
      <pre className={styles.body}>{result.body}</pre>
    </div>
  )
}

export function RequestPlayground({ controlled, onSettled }: RequestPlaygroundProps) {
  const [entries, setEntries] = useState<Partial<Record<DemoRequest['id'], RequestEntry>>>({})

  const send = async (request: DemoRequest) => {
    setEntries((prev) => ({ ...prev, [request.id]: { status: 'pending' } }))
    const result = await runDemoRequest(request.path, controlled)
    setEntries((prev) => ({ ...prev, [request.id]: { status: 'settled', result } }))
    onSettled?.()
  }

  return (
    <Panel
      title="リクエストを横取りする"
      description="同じ fetch() でも、Service Worker が間に入るかどうかで返ってくるものが変わります。"
    >
      {DEMO_REQUESTS.map((request) => {
        const entry = entries[request.id]
        return (
          <div key={request.id} className={styles.request}>
            <div className={styles.requestHeader}>
              <code>GET {request.path}</code>
              <Button onClick={() => void send(request)} disabled={entry?.status === 'pending'}>
                送信
              </Button>
            </div>
            <p className={styles.muted}>{request.description}</p>
            {entry?.status === 'pending' && <p className={styles.muted}>送信中…</p>}
            {entry?.status === 'settled' && <RequestResultView result={entry.result} />}
          </div>
        )
      })}
    </Panel>
  )
}

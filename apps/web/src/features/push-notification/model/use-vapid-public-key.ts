import { useEffect, useState } from 'react'
import { describePushServerError, fetchPublicKey } from '../api/push-api.ts'

export type PublicKeyState =
  | { status: 'loading' }
  | { status: 'ready'; publicKey: string }
  | { status: 'error'; message: string }

export type VapidPublicKeyApi = {
  state: PublicKeyState
  retry: () => void
}

// subscribe() はユーザー操作の直後に呼ぶ必要があるため、公開鍵はクリック前に取得しておく
export function useVapidPublicKey(): VapidPublicKeyApi {
  const [state, setState] = useState<PublicKeyState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    fetchPublicKey().then(
      (publicKey) => {
        if (!cancelled) setState({ status: 'ready', publicKey })
      },
      (error: unknown) => {
        if (!cancelled) setState({ status: 'error', message: describePushServerError(error) })
      },
    )
    return () => {
      cancelled = true
    }
  }, [attempt])

  const retry = () => {
    setState({ status: 'loading' })
    setAttempt((count) => count + 1)
  }

  return { state, retry }
}

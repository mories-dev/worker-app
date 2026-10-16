import type { PushSubscriptionPayload, SendPushResponse } from '@worker-lab/push-contract'
import { useState } from 'react'
import { describePushServerError, requestPush } from '../api/push-api.ts'

export type PushSendState =
  | { status: 'idle' }
  | { status: 'sending'; delaySeconds: number }
  | { status: 'done'; response: SendPushResponse }
  | { status: 'error'; message: string }

export type PushSenderApi = {
  state: PushSendState
  send: (subscription: PushSubscriptionPayload, delaySeconds: number) => Promise<void>
}

export function usePushSender(): PushSenderApi {
  const [state, setState] = useState<PushSendState>({ status: 'idle' })

  const send = async (subscription: PushSubscriptionPayload, delaySeconds: number) => {
    setState({ status: 'sending', delaySeconds })
    try {
      const response = await requestPush({ subscription, delaySeconds })
      setState({ status: 'done', response })
    } catch (error) {
      setState({ status: 'error', message: describePushServerError(error) })
    }
  }

  return { state, send }
}

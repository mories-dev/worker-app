// 署名付きリクエストを任意の URL へ送る踏み台（SSRF）にされないよう、送信先をブラウザ各社のプッシュサービスに限定する
const PUSH_SERVICE_HOSTS = [
  'fcm.googleapis.com',
  'android.googleapis.com',
  'push.services.mozilla.com',
  'notify.windows.com',
  'push.apple.com',
] as const

export function isKnownPushServiceEndpoint(endpoint: string): boolean {
  const { protocol, hostname } = new URL(endpoint)
  return (
    protocol === 'https:' && PUSH_SERVICE_HOSTS.some((host) => hostname === host || hostname.endsWith(`.${host}`))
  )
}

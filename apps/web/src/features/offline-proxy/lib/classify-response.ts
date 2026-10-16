export type ResponseSource = 'sw-mock' | 'sw-cache' | 'network-via-sw' | 'network'

export const RESPONSE_SOURCE_LABELS: Record<ResponseSource, string> = {
  'sw-mock': 'Service Worker がその場で生成したレスポンス',
  'sw-cache': 'Service Worker がキャッシュから返したレスポンス（ネットワークに届かなかった）',
  'network-via-sw': 'ネットワークからのレスポンス（Service Worker が中継）',
  network: 'ネットワークからのレスポンス（Service Worker を通っていない）',
}

// public/sw.js が付ける X-Served-By ヘッダーと、このページが SW に制御されているかで応答元を判定する
export function classifyResponse(servedBy: string | null, controlled: boolean): ResponseSource {
  if (servedBy === 'sw-mock') return 'sw-mock'
  if (servedBy === 'sw-cache') return 'sw-cache'
  return controlled ? 'network-via-sw' : 'network'
}

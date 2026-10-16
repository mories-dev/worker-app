// @ts-check

const VERSION = 'v1'
const CACHE_PREFIX = 'worker-lab-'
const CACHE_NAME = `${CACHE_PREFIX}${VERSION}`
const MAX_CACHE_ENTRIES = 200
const MOCK_API_PREFIX = '/sw-api/'
const SERVER_API_PREFIX = '/api/'
const NOTIFICATION_TITLE = 'Worker Lab'
const FORTUNES = ['大吉', '中吉', '小吉', '吉', '末吉', '凶']

const sw = /** @type {ServiceWorkerGlobalScope} */ (/** @type {unknown} */ (self))

/** @typedef {'install' | 'activate' | 'fetch' | 'message' | 'push' | 'notificationclick'} SwLogEvent */

/**
 * @param {SwLogEvent} event
 * @param {string} detail
 */
function createLogMessage(event, detail) {
  return { type: 'sw-log', version: VERSION, event, detail, at: Date.now() }
}

/**
 * @param {SwLogEvent} event
 * @param {string} detail
 */
async function broadcastLog(event, detail) {
  const windows = await sw.clients.matchAll({ type: 'window', includeUncontrolled: true })
  const message = createLogMessage(event, detail)
  for (const client of windows) {
    client.postMessage(message)
  }
}

/**
 * ページ遷移のログは、遷移先として生成される新しいページへ送る（clients.get は準備完了まで待つ）
 * @param {string} clientId
 * @param {string} detail
 */
async function sendFetchLogToClient(clientId, detail) {
  if (!clientId) return
  const client = await sw.clients.get(clientId)
  client?.postMessage(createLogMessage('fetch', detail))
}

/**
 * JS や CSS など1ファイルごとのログは量が多すぎるため、ページ遷移と fetch() による要求だけを記録する
 * @param {FetchEvent} event
 * @param {string} detail
 */
function logFetch(event, detail) {
  const { request } = event
  if (request.mode === 'navigate') {
    event.waitUntil(sendFetchLogToClient(event.resultingClientId, detail))
    return
  }
  if (request.destination === '') {
    event.waitUntil(broadcastLog('fetch', detail))
  }
}

sw.addEventListener('install', (event) => {
  event.waitUntil(broadcastLog('install', `${VERSION} をインストールしました`))
})

sw.addEventListener('activate', (event) => {
  event.waitUntil(activate())
})

async function activate() {
  const keys = await caches.keys()
  const staleKeys = keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
  await Promise.all(staleKeys.map((key) => caches.delete(key)))
  await sw.clients.claim()
  const cleanup = staleKeys.length > 0 ? `、古いキャッシュ (${staleKeys.join(', ')}) を削除` : ''
  await broadcastLog('activate', `${VERSION} を有効化${cleanup}し、ページの制御を開始しました`)
}

sw.addEventListener('message', (event) => {
  if (!isSkipWaitingMessage(event.data)) {
    event.waitUntil(broadcastLog('message', '未対応のメッセージを受信したため無視しました'))
    return
  }
  event.waitUntil(
    Promise.all([broadcastLog('message', 'SKIP_WAITING を受信。待機をやめて有効化します'), sw.skipWaiting()]),
  )
})

/**
 * @param {unknown} data
 * @returns {boolean}
 */
function isSkipWaitingMessage(data) {
  return typeof data === 'object' && data !== null && 'type' in data && data.type === 'SKIP_WAITING'
}

sw.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  const isSameOriginGet = request.method === 'GET' && url.origin === sw.location.origin
  if (!isSameOriginGet || url.pathname.startsWith(SERVER_API_PREFIX)) {
    return
  }
  if (url.pathname.startsWith(MOCK_API_PREFIX)) {
    event.respondWith(respondFromMockApi(url))
    event.waitUntil(broadcastLog('fetch', `モック API として ${url.pathname} に応答しました`))
    return
  }
  event.respondWith(networkFirst(event))
})

/** @param {URL} url */
function respondFromMockApi(url) {
  if (url.pathname !== `${MOCK_API_PREFIX}fortune`) {
    return jsonResponse(404, { error: `${url.pathname} はモック API に存在しません` })
  }
  const fortune = FORTUNES[Math.floor(Math.random() * FORTUNES.length)]
  return jsonResponse(200, {
    fortune,
    servedBy: 'service-worker',
    swVersion: VERSION,
    generatedAt: new Date().toISOString(),
  })
}

/**
 * @param {number} status
 * @param {unknown} body
 */
function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'X-Served-By': 'sw-mock' },
  })
}

/**
 * @param {FetchEvent} event
 * @returns {Promise<Response>}
 */
async function networkFirst(event) {
  const { request } = event
  try {
    const response = await fetch(request)
    if (response.status === 200) {
      event.waitUntil(storeInCache(request, response.clone()))
    }
    return response
  } catch (networkError) {
    return respondFromCache(event, networkError)
  }
}

/**
 * HMR の ?t= 付き URL やビルドごとのハッシュ付きファイルで際限なく増えないよう、古く保存したものから捨てる
 * @param {Request} request
 * @param {Response} response
 */
async function storeInCache(request, response) {
  const cache = await caches.open(CACHE_NAME)
  await cache.put(request, response)
  const keys = await cache.keys()
  const overflow = keys.slice(0, Math.max(0, keys.length - MAX_CACHE_ENTRIES))
  await Promise.all(overflow.map((key) => cache.delete(key)))
}

/**
 * @param {Cache} cache
 * @param {Request} request
 */
async function matchCached(cache, request) {
  const exact = await cache.match(request)
  if (exact || request.mode !== 'navigate') return exact
  // ページ遷移はクエリ違いや未訪問のパスでも、スコープのトップページ（アプリの殻）で代替する
  const options = { ignoreSearch: true, ignoreVary: true }
  return (await cache.match(request, options)) ?? (await cache.match(sw.registration.scope, options))
}

/**
 * @param {FetchEvent} event
 * @param {unknown} networkError
 * @returns {Promise<Response>}
 */
async function respondFromCache(event, networkError) {
  const { request } = event
  const path = new URL(request.url).pathname
  const cached = await matchCached(await caches.open(CACHE_NAME), request)
  if (!cached) {
    logFetch(event, `ネットワークに届かず、キャッシュにも ${path} がありません`)
    throw networkError
  }
  const detail =
    request.mode === 'navigate'
      ? `ネットワークに届かないため、ページ本体（${path}）をキャッシュから返しました`
      : `ネットワークに届かないため、${path} をキャッシュから返しました`
  logFetch(event, detail)
  return withHeader(cached, 'X-Served-By', 'sw-cache')
}

/**
 * @param {Response} response
 * @param {string} name
 * @param {string} value
 */
function withHeader(response, name, value) {
  const headers = new Headers(response.headers)
  headers.set(name, value)
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers })
}

sw.addEventListener('push', (event) => {
  const payload = readPushPayload(event.data)
  event.waitUntil(
    Promise.all([
      sw.registration.showNotification(payload.title, { body: payload.body }),
      broadcastLog('push', `プッシュを受信して通知を表示しました: ${payload.body}`),
    ]),
  )
})

/**
 * @param {PushMessageData | null} data
 * @returns {{ title: string, body: string }}
 */
function readPushPayload(data) {
  if (!data) {
    return { title: NOTIFICATION_TITLE, body: '本文なしのプッシュを受信しました' }
  }
  const text = data.text()
  const parsed = parseJsonOrUndefined(text)
  return isPushPayload(parsed) ? parsed : { title: NOTIFICATION_TITLE, body: text }
}

/**
 * DevTools の Push ボタンなどはプレーンテキストを送るため、JSON でなければ undefined を返して本文扱いにする
 * @param {string} text
 * @returns {unknown}
 */
function parseJsonOrUndefined(text) {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

/**
 * @param {unknown} value
 * @returns {value is { title: string, body: string }}
 */
function isPushPayload(value) {
  return (
    typeof value === 'object' &&
    value !== null &&
    'title' in value &&
    typeof value.title === 'string' &&
    'body' in value &&
    typeof value.body === 'string'
  )
}

sw.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    focusOrOpenWindow().then(
      (action) =>
        broadcastLog(
          'notificationclick',
          action === 'focus' ? '通知のクリックで既存のタブを前面に出しました' : '通知のクリックで新しいタブを開きました',
        ),
      (error) => broadcastLog('notificationclick', `通知のクリックでタブを開けませんでした: ${String(error)}`),
    ),
  )
})

/** @returns {Promise<'focus' | 'open'>} */
async function focusOrOpenWindow() {
  const { scope } = sw.registration
  const windows = await sw.clients.matchAll({ type: 'window', includeUncontrolled: true })
  const existing = windows.find((client) => client.url.startsWith(scope))
  const focused = existing ? await existing.focus().then(() => true, () => false) : false
  if (focused) return 'focus'
  await sw.clients.openWindow(scope)
  return 'open'
}

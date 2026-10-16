import { existsSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import webpush from 'web-push'

const envPath = fileURLToPath(new URL('../.env', import.meta.url))
const subject = process.argv[2]

if (subject === undefined || !/^(mailto:|https:\/\/)/.test(subject)) {
  console.error('使い方: pnpm setup:push mailto:you@example.com')
  console.error('VAPID の連絡先（プッシュサービスが問題発生時に連絡する宛先）を mailto: か https:// で指定してください。')
  process.exit(1)
}

if (existsSync(envPath)) {
  console.error(`${envPath} は既に存在します。鍵を作り直す場合はファイルを削除してから再実行してください。`)
  process.exit(1)
}

const { publicKey, privateKey } = webpush.generateVAPIDKeys()
const content = [`VAPID_PUBLIC_KEY=${publicKey}`, `VAPID_PRIVATE_KEY=${privateKey}`, `VAPID_SUBJECT=${subject}`, ''].join(
  '\n',
)

writeFileSync(envPath, content, { flag: 'wx', mode: 0o600 })
console.info(`VAPID 鍵を ${envPath} に書き出しました。`)

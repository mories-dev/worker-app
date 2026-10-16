import { WORKER_COMPARISON } from '../config/comparison.ts'
import styles from './WorkerLabPage.module.css'

export function ComparisonTable() {
  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <caption className={styles.tableCaption}>3種類の Worker の違い</caption>
        <thead>
          <tr>
            <th scope="col">種類</th>
            <th scope="col">つながり方</th>
            <th scope="col">生きている期間</th>
            <th scope="col">得意なこと</th>
            <th scope="col">通信方法</th>
            <th scope="col">このページのデモ</th>
          </tr>
        </thead>
        <tbody>
          {WORKER_COMPARISON.map((row) => (
            <tr key={row.id}>
              <th scope="row" className={styles[row.id]}>
                {row.name}
              </th>
              <td>{row.relation}</td>
              <td>{row.lifetime}</td>
              <td>{row.strengths}</td>
              <td>
                <code>{row.messaging}</code>
              </td>
              <td>{row.demo}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className={styles.tableNote}>
        共通点: どの Worker もメインスレッドとは別のスレッドで動き、DOM には触れられません。ページとはメッセージ（構造化複製によるデータのコピー）でやり取りします。
      </p>
    </div>
  )
}

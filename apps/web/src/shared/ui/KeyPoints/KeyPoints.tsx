import type { ReactNode } from 'react'
import styles from './KeyPoints.module.css'

export type KeyPointsProps = {
  title?: string
  children: ReactNode
}

export function KeyPoints({ title = 'ポイント', children }: KeyPointsProps) {
  return (
    <aside className={styles.points}>
      <h3 className={styles.title}>{title}</h3>
      <ul className={styles.list}>{children}</ul>
    </aside>
  )
}

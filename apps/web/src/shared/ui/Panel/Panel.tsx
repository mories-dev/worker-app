import type { ReactNode } from 'react'
import styles from './Panel.module.css'

export type PanelProps = {
  title: string
  description?: ReactNode
  actions?: ReactNode
  children: ReactNode
}

export function Panel({ title, description, actions, children }: PanelProps) {
  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h3 className={styles.title}>{title}</h3>
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
      {description && <p className={styles.description}>{description}</p>}
      <div className={styles.content}>{children}</div>
    </div>
  )
}

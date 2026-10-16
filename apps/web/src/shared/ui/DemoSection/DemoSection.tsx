import type { ReactNode } from 'react'
import styles from './DemoSection.module.css'

export type SectionAccent = 'dedicated' | 'shared' | 'service' | 'push'

export type DemoSectionProps = {
  id: string
  index: number
  title: string
  tagline: string
  accent: SectionAccent
  children: ReactNode
}

export function DemoSection({ id, index, title, tagline, accent, children }: DemoSectionProps) {
  const headingId = `${id}-heading`
  return (
    <section id={id} aria-labelledby={headingId} className={`${styles.section} ${styles[accent]}`}>
      <header className={styles.header}>
        <span className={styles.index} aria-hidden="true">
          {index}
        </span>
        <div>
          <h2 id={headingId} className={styles.title}>
            {title}
          </h2>
          <p className={styles.tagline}>{tagline}</p>
        </div>
      </header>
      <div className={styles.body}>{children}</div>
    </section>
  )
}

import { Fragment } from 'react'
import styles from './FlowDiagram.module.css'

export type FlowNode = {
  id: string
  label: string
  note?: string
}

export type FlowEdge = {
  label: string
  direction: 'forward' | 'both'
}

export type FlowDiagramProps = {
  caption: string
  nodes: readonly FlowNode[]
  edges: readonly FlowEdge[]
}

export function FlowDiagram({ caption, nodes, edges }: FlowDiagramProps) {
  return (
    <figure className={styles.figure}>
      <div className={styles.flow}>
        {nodes.map((node, index) => {
          const edge = index > 0 ? edges[index - 1] : undefined
          return (
            <Fragment key={node.id}>
              {edge && (
                <span className={styles.edge}>
                  <span className={styles.edgeLabel}>{edge.label}</span>
                  <span className={styles.arrow} aria-hidden="true">
                    {edge.direction === 'both' ? '⇄' : '→'}
                  </span>
                </span>
              )}
              <span className={styles.node}>
                <strong>{node.label}</strong>
                {node.note && <small className={styles.note}>{node.note}</small>}
              </span>
            </Fragment>
          )
        })}
      </div>
      <figcaption className={styles.caption}>{caption}</figcaption>
    </figure>
  )
}

/** Content of one service (glossary category) page: the structured lists live in the entry's data, the arrangement in its block layout. Pure data. */
import type { PageNode } from '../pages/blocks'

export interface ServiceContent {
  slug: string
  /** search title (≤60 chars) and meta description (≤160) */
  seoTitle: string
  seoDescription: string
  summary: string
  /** "Lucrare | interval | observații" */
  preturi: string[]
  /** "Întrebare | Răspuns" */
  intrebari: string[]
  sinonime: string[]
  blocks: PageNode[]
}

export const node = (id: string, type: string, props: Record<string, unknown> = {}, slots?: Record<string, PageNode[]>): PageNode => ({ id, type, props, ...(slots ? { slots } : {}) })
export const para = (...p: string[]) => p.join('\n\n')

/** Content of one guide (collection "ghiduri"): the question lists live in the entry's data, the arrangement in its block layout. Pure data. */
import type { PageNode } from '../pages/blocks'
export { node, para } from '../services/types'

export interface GuideContent {
  slug: string
  /** glossary category the guide belongs to (its hub) */
  serviciu: string
  title: string
  /** search title (≤60 chars) and meta description (≤160) */
  seoTitle: string
  seoDescription: string
  summary: string
  /** main search term and the other terms the page serves (one page per group of terms) */
  keyword: string
  keywords: string[]
  /** "Întrebare | Răspuns" */
  intrebari: string[]
  blocks: PageNode[]
}

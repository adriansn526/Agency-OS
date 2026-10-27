/**
 * Situation pages: one service page per situation of a category (/lucrari/<categorie>/<situație>), e.g. hidroizolații → baie, fundație, terasă.
 * Each is a guide + prices + FAQ + firms + request form on one page, built from the written guide of the same topic (see docs/SEO/HUB_HIDROIZOLATII.md).
 * Pure data. The guide texts stay the single source: a situation is derived from its guide, so the two never drift apart.
 */
import type { PageNode } from '../pages/blocks'
import { node } from '../services/types'
import { hidroizolatieBaie } from '../guides/hidroizolatie-baie'
import { hidroizolatieFundatie } from '../guides/hidroizolatie-fundatie'
import { hidroizolatieTerasa } from '../guides/hidroizolatie-terasa'
import type { GuideContent } from '../guides/types'

export interface SituationContent {
  /** `<categorie>--<situație>` */
  slug: string
  /** glossary category (the parent) */
  categorie: string
  title: string
  seoTitle: string
  seoDescription: string
  summary: string
  /** search terms the page serves */
  sinonime: string[]
  /** "Întrebare | Răspuns" */
  intrebari: string[]
  blocks: PageNode[]
}

/** Turns a guide into a situation page: firms of the category and the other situations are added; the links to guides stay (the other guides of the hub). */
export function situationFromGuide(g: GuideContent, situation: string): SituationContent {
  const blocks: PageNode[] = []
  for (const b of g.blocks) {
    if (b.type === 'price_links') blocks.push(b, node('situation-links', 'situation_links', { title: 'Alte situații frecvente' }))
    else if (b.type === 'request_cta') blocks.push(node('firms', 'firms_list', { title: 'Firme care fac această lucrare', limit: '6' }), b)
    else blocks.push(b)
  }
  return {
    slug: `${g.serviciu}--${situation}`, categorie: g.serviciu, title: g.title,
    seoTitle: g.seoTitle, seoDescription: g.seoDescription, summary: g.summary,
    sinonime: g.keywords, intrebari: g.intrebari, blocks,
  }
}

export const SITUATIONS: SituationContent[] = [
  situationFromGuide(hidroizolatieBaie, 'baie'),
  situationFromGuide(hidroizolatieFundatie, 'fundatie-subsol-beci'),
  situationFromGuide(hidroizolatieTerasa, 'terasa-acoperis-plat'),
]

import { hidroizolatieBaie } from './hidroizolatie-baie'
import { hidroizolatieFundatie } from './hidroizolatie-fundatie'
import { igrasie } from './igrasie'
import type { GuideContent } from './types'

export type { GuideContent }

/** Guides written for the first hub (hidroizolații). Each one is one page for a group of search terms (see docs/SEO/HUB_HIDROIZOLATII.md). */
export const GUIDES: GuideContent[] = [igrasie, hidroizolatieFundatie, hidroizolatieBaie]

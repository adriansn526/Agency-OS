import { hidroizolatieBaie } from './hidroizolatie-baie'
import { hidroizolatieFundatie } from './hidroizolatie-fundatie'
import { hidroizolatieLichida } from './hidroizolatie-lichida'
import { hidroizolatieTerasa } from './hidroizolatie-terasa'
import { membranaEpdmBituminoasa } from './membrana-epdm-bituminoasa'
import { igrasie } from './igrasie'
import type { GuideContent } from './types'

export type { GuideContent }

/** Guides written for the hub "hidroizolații" (6: damp, foundation/basement, bathroom, terrace/flat roof, EPDM vs bituminous, liquid). Each one is one page for a group of search terms (see docs/SEO/HUB_HIDROIZOLATII.md). */
export const GUIDES: GuideContent[] = [igrasie, hidroizolatieFundatie, hidroizolatieBaie, hidroizolatieTerasa, membranaEpdmBituminoasa, hidroizolatieLichida]

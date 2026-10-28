import { hidroizolatieLichida } from './hidroizolatie-lichida'
import { membranaEpdmBituminoasa } from './membrana-epdm-bituminoasa'
import { igrasie } from './igrasie'
import { polistirenSauVataBazaltica } from './polistiren-sau-vata-bazaltica'
import { prosumatorCumFunctioneaza } from './prosumator-cum-functioneaza'
import type { GuideContent } from './types'

export type { GuideContent }

/** Informative guides of the hub "hidroizolații" (damp, EPDM vs bituminous, liquid). The situations (bathroom, foundation/basement, terrace) are service pages under the category, see ../situations. Each one is one page for a group of search terms (see docs/SEO/HUB_HIDROIZOLATII.md). */
export const GUIDES: GuideContent[] = [igrasie, membranaEpdmBituminoasa, hidroizolatieLichida, polistirenSauVataBazaltica, prosumatorCumFunctioneaza]

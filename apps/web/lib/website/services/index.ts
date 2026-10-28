import { acoperisuri } from './acoperisuri'
import { climatizare } from './climatizare'
import { instalatiiElectrice } from './instalatii-electrice'
import { fundatiiBeton } from './fundatii-beton'
import { gardurPavaje } from './garduri-pavaje'
import { geamuri } from './geamuri'
import { hidroizolatii } from './hidroizolatii'
import { instalatiiSanitare } from './instalatii-sanitare'
import { pardoseliPlacari } from './pardoseli-placari'
import { izolatiiTermice } from './izolatii-termice'
import { zugraveliVopsitorie } from './zugraveli-vopsitorie'
import { ipsoserieGipsCarton } from './ipsoserie-gips-carton'
import { instalatiiTermice } from './instalatii-termice'
import { centralePompeCaldura } from './centrale-pompe-caldura'
import { fotovoltaiceEnergieRegenerabila } from './fotovoltaice-energie-regenerabila'
import { tersePergoleFoisoare } from './terase-pergole-foisoare'
import type { ServiceContent } from './types'

export type { ServiceContent }
export { NEW_CATEGORIES, type NewCategory } from './categories'

/** Service pages written in full (pilot + first priority wave of the SEO analysis); the rest follow the same shape. */
export const SERVICE_CONTENT: ServiceContent[] = [acoperisuri, climatizare, instalatiiElectrice, geamuri, gardurPavaje, fundatiiBeton, pardoseliPlacari, instalatiiSanitare, hidroizolatii, izolatiiTermice, zugraveliVopsitorie, ipsoserieGipsCarton, instalatiiTermice, centralePompeCaldura, fotovoltaiceEnergieRegenerabila, tersePergoleFoisoare]

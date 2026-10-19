import { acoperisuri } from './acoperisuri'
import { climatizare } from './climatizare'
import { instalatiiElectrice } from './instalatii-electrice'
import type { ServiceContent } from './types'

export type { ServiceContent }
export { NEW_CATEGORIES, type NewCategory } from './categories'

/** Pilot service pages written in full; the rest follow the same shape. */
export const SERVICE_CONTENT: ServiceContent[] = [acoperisuri, climatizare, instalatiiElectrice]

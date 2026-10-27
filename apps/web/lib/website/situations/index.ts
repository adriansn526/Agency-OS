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
import { acoperisTerasa } from './acoperisuri/acoperis-terasa'
import { invelitoareAcoperis } from './acoperisuri/invelitoare-acoperis'
import { izolatieMansardaAcoperis } from './acoperisuri/izolatie-mansarda-acoperis'
import { jgheaburiBurlane } from './acoperisuri/jgheaburi-burlane'
import { sarpanta } from './acoperisuri/sarpanta'
import { curatareIgienizareAerConditionat } from './climatizare/curatare-igienizare-aer-conditionat'
import { montajAerConditionat } from './climatizare/montaj-aer-conditionat'
import { pompaCalduraAerAer } from './climatizare/pompa-caldura-aer-aer'
import { reparatiiServiceAerConditionat } from './climatizare/reparatii-service-aer-conditionat'
import { ventilatieRecuperareCaldura } from './climatizare/ventilatie-recuperare-caldura'
import { fundatieCasa } from './fundatii-beton/fundatie-casa'
import { placaBetonArmat } from './fundatii-beton/placa-beton-armat'
import { sapaAutonivelanta } from './fundatii-beton/sapa-autonivelanta'
import { sapaMecanizata } from './fundatii-beton/sapa-mecanizata'
import { betonAmprentat } from './garduri-pavaje/beton-amprentat'
import { gardBeton } from './garduri-pavaje/gard-beton'
import { gardMetalic } from './garduri-pavaje/gard-metalic'
import { pavajCurte } from './garduri-pavaje/pavaj-curte'
import { poartaCulisantaAutomatizare } from './garduri-pavaje/poarta-culisanta-automatizare'
import { reparatiiReglajTermopane } from './geamuri/reparatii-reglaj-termopane'
import { ruloriJaluzeleExterioare } from './geamuri/rulouri-jaluzele-exterioare'
import { usiCulisanteGlisante } from './geamuri/usi-culisante-glisante'
import { usiTermopan } from './geamuri/usi-termopan'
import { electricieniAutorizatiAnre } from './instalatii-electrice/electricieni-autorizati-anre'
import { instalatieElectricaCasa } from './instalatii-electrice/instalatie-electrica-casa'
import { paratrasnetPrizaDePamant } from './instalatii-electrice/paratrasnet-priza-de-pamant'
import { tablouElectric } from './instalatii-electrice/tablou-electric'
import { desfundareCanalizare } from './instalatii-sanitare/desfundare-canalizare'
import { fosaSepticaStatieEpurare } from './instalatii-sanitare/fosa-septica-statie-epurare'
import { microcimentPoliuretan } from './pardoseli-placari/microciment-poliuretan'
import { montajGresieFaianta } from './pardoseli-placari/montaj-gresie-faianta'
import { montajParchet } from './pardoseli-placari/montaj-parchet'
import { pardosealaEpoxidica } from './pardoseli-placari/pardoseala-epoxidica'

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
  // other categories: one file per situation under ./<categorie>/ (docs/SEO/PLAN_SITUATII_TOATE_CATEGORIILE.md)
  acoperisTerasa,
  invelitoareAcoperis,
  izolatieMansardaAcoperis,
  jgheaburiBurlane,
  sarpanta,
  curatareIgienizareAerConditionat,
  montajAerConditionat,
  pompaCalduraAerAer,
  reparatiiServiceAerConditionat,
  ventilatieRecuperareCaldura,
  fundatieCasa,
  placaBetonArmat,
  sapaAutonivelanta,
  sapaMecanizata,
  betonAmprentat,
  gardBeton,
  gardMetalic,
  pavajCurte,
  poartaCulisantaAutomatizare,
  reparatiiReglajTermopane,
  ruloriJaluzeleExterioare,
  usiCulisanteGlisante,
  usiTermopan,
  electricieniAutorizatiAnre,
  instalatieElectricaCasa,
  paratrasnetPrizaDePamant,
  tablouElectric,
  desfundareCanalizare,
  fosaSepticaStatieEpurare,
  microcimentPoliuretan,
  montajGresieFaianta,
  montajParchet,
  pardosealaEpoxidica,
]

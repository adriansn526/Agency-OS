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
import { izolatieFatadaTermosistem } from './izolatii-termice/izolatie-fatada-termosistem'
import { izolatiePeretiInterior } from './izolatii-termice/izolatie-pereti-interior'
import { izolatiePodSpumaPoliuretanica } from './izolatii-termice/izolatie-pod-spuma-poliuretanica'
import { gletGletuire } from './zugraveli-vopsitorie/glet-gletuire'
import { tencuialaDecorativa } from './zugraveli-vopsitorie/tencuiala-decorativa'
import { zugravitInterior } from './zugraveli-vopsitorie/zugravit-interior'
import { peretiDespartitoriRigips } from './ipsoserie-gips-carton/pereti-despartitori-rigips'
import { tavanFalsRigips } from './ipsoserie-gips-carton/tavan-fals-rigips'
import { tencuialaMecanizataManuala } from './ipsoserie-gips-carton/tencuiala-mecanizata-manuala'
import { calorifereRadiatoare } from './instalatii-termice/calorifere-radiatoare'
import { centralaLemnePeleti } from './instalatii-termice/centrala-lemne-peleti'
import { incalzireInPardoseala } from './instalatii-termice/incalzire-in-pardoseala'
import { montajCentralaTermicaGaz } from './centrale-pompe-caldura/montaj-centrala-termica-gaz'
import { pompaCalduraAerApa } from './centrale-pompe-caldura/pompa-caldura-aer-apa'
import { revizieServiceCentralaTermica } from './centrale-pompe-caldura/revizie-service-centrala-termica'
import { bateriiStocareInvertor } from './fotovoltaice-energie-regenerabila/baterii-stocare-invertor'
import { panouriFotovoltaiceCasa } from './fotovoltaice-energie-regenerabila/panouri-fotovoltaice-casa'
import { panouriSolareApaCalda } from './fotovoltaice-energie-regenerabila/panouri-solare-apa-calda'
import { foisorLemnGradina } from './terase-pergole-foisoare/foisor-lemn-gradina'
import { inchidereTerasaBalcon } from './terase-pergole-foisoare/inchidere-terasa-balcon'
import { pergolaLemnAluminiu } from './terase-pergole-foisoare/pergola-lemn-aluminiu'
import { pergolaRetractabilaBioclimatica } from './terase-pergole-foisoare/pergola-retractabila-bioclimatica'
import { terasaLemnWpc } from './terase-pergole-foisoare/terasa-lemn-wpc'
import { construirePiscina } from './piscine-saune/construire-piscina'
import { incalzireIntretinerePiscina } from './piscine-saune/incalzire-intretinere-piscina'
import { saunaJacuzzi } from './piscine-saune/sauna-jacuzzi'
import { semineuPeLemne } from './sobe-semineuri/semineu-pe-lemne'
import { sobaTeracota } from './sobe-semineuri/soba-teracota'
import { sobeLemnePelet } from './sobe-semineuri/sobe-lemne-pelet'
import { scariMetaliceBalustrade } from './structuri-metalice-fier-forjat/scari-metalice-balustrade'
import { haleConstructiiMetalice } from './structuri-metalice-fier-forjat/hale-constructii-metalice'
import { marchizeCopertine } from './structuri-metalice-fier-forjat/marchize-copertine'
import { usiMetalice } from './structuri-metalice-fier-forjat/usi-metalice'
import { amenajareGradinaCurte } from './amenajari-gradini/amenajare-gradina-curte'
import { gazonIrigatii } from './amenajari-gradini/gazon-irigatii'
import { gardViu } from './amenajari-gradini/gard-viu'
import { seraSolarii } from './sere/sera-solarii'
import { liftCasaExterior } from './lifturi/lift-casa-exterior'
import { liftBlocDizabilitati } from './lifturi/lift-bloc-dizabilitati'
import { alpinismUtilitar } from './lucru-la-inaltime/alpinism-utilitar'
import { inchiriereSchela } from './inchirieri-utilaje-schele/inchiriere-schela'
import { inchiriereBuldoexcavatorMiniexcavator } from './inchirieri-utilaje-schele/inchiriere-buldoexcavator-miniexcavator'
import { evaluareImobilRaport } from './evaluare-imobiliara/evaluare-imobil-raport'
import { containereLocuit } from './case-modulare/containere-locuit'
import { caseModulareLaCheie } from './case-modulare/case-modulare-la-cheie'
import { caseStructuraMetalicaLemn } from './case-modulare/case-structura-metalica-lemn'
import { proiectCasa } from './proiectare-arhitectura/proiect-casa'
import { designInterior } from './proiectare-arhitectura/design-interior'
import { usiInterior } from './tamplarie-dulgherie/usi-interior'
import { usiExteriorIntrare } from './tamplarie-dulgherie/usi-exterior-intrare'
import { usiGaraj } from './tamplarie-dulgherie/usi-garaj'
import { firmaConstructiiManopera } from './constructii-cladiri/firma-constructii-manopera'
import { bransamentGazeApaCanalizare } from './retele-bransamente-gaze/bransament-gaze-apa-canalizare'
import { revizieVerificareInstalatieGaze } from './instalatii-gaze/revizie-verificare-instalatie-gaze'
import { detectorGaze } from './instalatii-gaze/detector-gaze'
import { instalatorAutorizatGazeAnre } from './instalatii-gaze/instalator-autorizat-gaze-anre'
import { forajPutApa } from './foraj-sondaj/foraj-put-apa'
import { studiuGeotehnic } from './foraj-sondaj/studiu-geotehnic'
import { renovareBaie } from './renovari-amenajari-interioare/renovare-baie'
import { renovareApartament } from './renovari-amenajari-interioare/renovare-apartament'
import { piatraDecorativaTravertin } from './pardoseli-placari/piatra-decorativa-travertin'
import { linoleumMochetaVinil } from './pardoseli-placari/linoleum-mocheta-vinil'
import { certificatUrbanism } from './autorizari-avize/certificat-urbanism'
import { autorizatieConstruire } from './autorizari-avize/autorizatie-construire'
import { autorizareIsu } from './autorizari-avize/autorizare-isu'
import { cadastruIntabulare } from './topografie-cadastru/cadastru-intabulare'
import { topografMasuratori } from './topografie-cadastru/topograf-masuratori'
import { certificatEnergetic } from './audit-certificat-energetic/certificat-energetic'
import { camereSupraveghere } from './securitate-automatizari/camere-supraveghere'
import { interfonVideointerfon } from './securitate-automatizari/interfon-videointerfon'
import { alarmaSmartHome } from './securitate-automatizari/alarma-smart-home'
import { demolareCasaConstructii } from './demolari/demolare-casa-constructii'
import { expertizaTehnicaConstructii } from './expertiza-tehnica/expertiza-tehnica-constructii'
import { diriginteSantierAutorizat } from './diriginte-santier/diriginte-santier-autorizat'
import { plaseTantari } from './geamuri/plase-tantari'

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
  pardosealaEpoxidica,  // wave 2 (docs/SEO/PLAN_SITUATII_VAL2.md)
  izolatieFatadaTermosistem,
  izolatiePeretiInterior,
  izolatiePodSpumaPoliuretanica,
  gletGletuire,
  tencuialaDecorativa,
  zugravitInterior,
  peretiDespartitoriRigips,
  tavanFalsRigips,
  tencuialaMecanizataManuala,
  calorifereRadiatoare,
  centralaLemnePeleti,
  incalzireInPardoseala,
  montajCentralaTermicaGaz,
  pompaCalduraAerApa,
  revizieServiceCentralaTermica,
  bateriiStocareInvertor,
  panouriFotovoltaiceCasa,
  panouriSolareApaCalda,
  foisorLemnGradina,
  inchidereTerasaBalcon,
  pergolaLemnAluminiu,
  pergolaRetractabilaBioclimatica,
  terasaLemnWpc,  // wave 3 (docs/SEO/PLAN_SITUATII_VAL3.md)
  construirePiscina,
  incalzireIntretinerePiscina,
  saunaJacuzzi,
  semineuPeLemne,
  sobaTeracota,
  sobeLemnePelet,
  scariMetaliceBalustrade,
  haleConstructiiMetalice,
  marchizeCopertine,
  usiMetalice,
  amenajareGradinaCurte,
  gazonIrigatii,
  gardViu,
  seraSolarii,
  liftCasaExterior,
  liftBlocDizabilitati,
  alpinismUtilitar,
  inchiriereSchela,
  inchiriereBuldoexcavatorMiniexcavator,
  evaluareImobilRaport,
  containereLocuit,
  caseModulareLaCheie,
  caseStructuraMetalicaLemn,
  proiectCasa,
  designInterior,
  usiInterior,
  usiExteriorIntrare,
  usiGaraj,
  firmaConstructiiManopera,
  bransamentGazeApaCanalizare,
  revizieVerificareInstalatieGaze,
  detectorGaze,
  instalatorAutorizatGazeAnre,
  forajPutApa,
  studiuGeotehnic,
  renovareBaie,
  renovareApartament,
  piatraDecorativaTravertin,
  linoleumMochetaVinil,
  certificatUrbanism,
  autorizatieConstruire,
  autorizareIsu,
  cadastruIntabulare,
  topografMasuratori,
  certificatEnergetic,
  camereSupraveghere,
  interfonVideointerfon,
  alarmaSmartHome,
  demolareCasaConstructii,
  expertizaTehnicaConstructii,
  diriginteSantierAutorizat,
  plaseTantari,
]

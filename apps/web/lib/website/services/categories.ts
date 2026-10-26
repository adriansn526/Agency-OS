/**
 * Service categories the SEO analysis (docs/SEO) asks for that the glossary did not have: before this, garduri, pavaj, izolații, hidroizolații,
 * fundații and renovări were hidden under the "Alte …" buckets. Entries are created as drafts in the "servicii" collection (the live taxonomy).
 */
export interface NewCategory { slug: string; title: string; group: string; summary: string; sinonime: string[] }

export const NEW_CATEGORIES: NewCategory[] = [
  { slug: 'izolatii-termice', title: 'Izolații termice și fațade', group: 'finisaje', summary: 'Termoizolarea fațadelor, podurilor și fundațiilor cu polistiren, vată minerală sau spumă, pentru facturi mai mici la încălzire.', sinonime: ['polistiren', 'termosistem', 'vată minerală', 'izolație fațadă', 'termoizolație'] },
  { slug: 'garduri-pavaje', title: 'Garduri, pavaje și amenajări exterioare', group: 'finisaje', summary: 'Garduri din beton, metal sau lemn, pavaj și beton amprentat pentru curte, alei și parcări, plus amenajarea grădinii.', sinonime: ['gard', 'pavele', 'pavaj curte', 'beton amprentat', 'amenajare grădină', 'alei'] },
  { slug: 'renovari-amenajari-interioare', title: 'Renovări și amenajări interioare', group: 'finisaje', summary: 'Renovarea completă a apartamentelor și caselor: de la demolări ușoare și instalații la finisaje, cu o singură echipă.', sinonime: ['renovare apartament', 'amenajări interioare', 'renovare completă', 'redecorare'] },
  { slug: 'fundatii-beton', title: 'Fundații și lucrări din beton', group: 'structura-cladiri', summary: 'Fundații, plăci, stâlpi și grinzi din beton armat, turnarea betonului cu pompă și cofraje.', sinonime: ['fundație', 'turnare beton', 'beton armat', 'placă beton', 'cofraj'] },
  { slug: 'case-modulare', title: 'Case modulare și structuri ușoare', group: 'structura-cladiri', summary: 'Case modulare și pe structură ușoară din lemn sau metal, livrate la cheie, cu termen de execuție scurt.', sinonime: ['casă modulară', 'casă din lemn', 'casă pe structură metalică', 'casă la cheie'] },
  { slug: 'hidroizolatii', title: 'Hidroizolații', group: 'lucrari-speciale', summary: 'Hidroizolarea băilor, fundațiilor, teraselor și acoperișurilor plate împotriva infiltrațiilor și igrasiei.', sinonime: ['hidroizolare baie', 'hidroizolație terasă', 'hidroizolație fundație', 'igrasie', 'membrană bituminoasă'] },
  { slug: 'terase-pergole-foisoare', title: 'Terase, pergole și foișoare', group: 'finisaje', summary: 'Închiderea teraselor și a balcoanelor (sticlă, folie, rulouri), pergole, foișoare din lemn și copertine pentru curte și terasă.', sinonime: ['inchidere terasa', 'terasa inchisa', 'inchidere balcon', 'pergola', 'foisor', 'copertina', 'prelata terasa'] },
  { slug: 'ventilatie-industriala', title: 'Ventilație industrială și exhaustare', group: 'instalatii', summary: 'Sisteme de ventilație, exhaustare și desfumare pentru hale, restaurante și ateliere: tubulatură, ventilatoare și montaj.', sinonime: ['ventilatie industriala', 'exhaustare', 'desfumare', 'tubulatura ventilatie', 'hote profesionale'] },
]

/** Categories that exist in the live glossary (entries of "servicii") but not in the built-in taxonomy list: valid targets for price pages. */
export const LIVE_ONLY_SLUGS = ['fotovoltaice-energie-regenerabila', 'centrale-pompe-caldura']
export const EXTRA_CATEGORY_SLUGS = [...NEW_CATEGORIES.map((c) => c.slug), ...LIVE_ONLY_SLUGS]

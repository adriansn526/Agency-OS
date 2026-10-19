/**
 * Starting layouts (block templates) for the SEO pages: a price page and a service (category) page. Pure.
 *
 * The templates only contain wording that is true for any service (what drives a price, how to choose a firm) and the structure of the page.
 * What the team must write (the intro, the prices) is marked with PLACEHOLDER, so a page cannot go live before that is done.
 */
import { PLACEHOLDER } from './blocks'
import type { PageLayout, PageNode } from '../pages/blocks'

const node = (id: string, type: string, props: Record<string, unknown> = {}): PageNode => ({ id, type, props })

const PRICE_FACTORS = [
  { title: 'Complexitatea lucrării', text: 'Cu cât lucrarea este mai pretențioasă sau mai greu accesibilă, cu atât manopera costă mai mult.' },
  { title: 'Materialele', text: 'Prețul diferă după calitatea materialelor și după cine le asigură. Cere oferte care spun clar ce include prețul.' },
  { title: 'Suprafața', text: 'Lucrările mari au de obicei un preț pe unitate mai mic decât cele mici.' },
  { title: 'Zona și perioada', text: 'Tarifele sunt mai mari în orașele mari și în sezonul aglomerat.' },
]

const CHOOSE = 'Cere cel puțin două sau trei oferte și compară-le pe aceleași criterii: ce include prețul, termenul de execuție și garanția.\n\nVerifică referințele și lucrările anterioare ale firmei înainte să semnezi. Pe IntraConstruct vezi firmele verificate și recenziile clienților.'

/** Question | answer pairs that are true for every price page (they feed the FAQPage schema). */
export const PRICE_FAQ = [
  'Prețurile de pe această pagină sunt finale? | Nu, sunt intervale orientative. Prețul exact depinde de lucrare, materiale și zonă și îl afli cerând oferte gratuite de la firme.',
  'Cum primesc oferte de la firme? | Trimiți cererea cu o scurtă descriere a lucrării. Cererea ajunge la firme potrivite, iar cele care o acceptă te contactează, de obicei în 1–2 zile.',
]

export function priceTemplate(o: { summary?: string | null } = {}): PageLayout {
  return { version: 2, blocks: [
    node('hero', 'hero', { ...(o.summary ? { subtitle: o.summary.slice(0, 250) } : {}), buttonLabel: 'Cere oferte gratuite', bg: 'dark' }),
    node('intro', 'text', { body: `${PLACEHOLDER} Scrie 2–3 propoziții: intervalul de preț principal, ce include (manoperă sau materiale) și pentru ce tip de lucrare se aplică.` }),
    node('prices', 'price_table', { title: 'Prețuri orientative' }),
    node('factors-h', 'heading', { text: 'De ce depinde prețul', level: 'h2' }),
    node('factors', 'cards', { items: PRICE_FACTORS, columns: '2' }),
    node('choose-h', 'heading', { text: 'Cum alegi firma', level: 'h2' }),
    node('choose', 'text', { body: CHOOSE }),
    node('faq', 'faq_list', { title: 'Întrebări frecvente' }),
    node('areas', 'areas', { title: 'Unde oferim serviciul' }),
    node('cta', 'request_cta', { title: 'Cere oferte gratuite', text: 'Descrie lucrarea și primești oferte de la firme potrivite din zona ta, fără obligații.', buttonLabel: 'Trimite cererea' }),
  ] }
}

export function serviceTemplate(o: { summary?: string | null } = {}): PageLayout {
  return { version: 2, blocks: [
    node('hero', 'hero', { ...(o.summary ? { subtitle: o.summary.slice(0, 250) } : {}), buttonLabel: 'Cere oferte gratuite', bg: 'dark' }),
    node('intro', 'text', { body: `${PLACEHOLDER} Explică pe scurt ce presupune această lucrare, când e nevoie de ea și ce ar trebui să știe un client înainte să ceară oferte.` }),
    node('prices', 'price_links', { title: 'Prețuri orientative' }),
    node('choose-h', 'heading', { text: 'Cum alegi firma', level: 'h2' }),
    node('choose', 'text', { body: CHOOSE }),
  ] }
}

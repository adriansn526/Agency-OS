/**
 * Blocks of the SEO content pages of services (glossary) and prices: the catalog of what the team can put on a page and how it is validated.
 *
 * Same engine and layout format (v2) as the firms' custom pages (lib/website/pages/blocks.ts), a different catalog: no firm context, so no
 * "services / projects / reviews" blocks; instead blocks that read the entry's own structured data (the `preturi` and `intrebari` lists, so prices
 * stay editable as data) and a call to the request form. Images are references to the entry's own uploaded media. Nothing is free HTML or a free URL.
 */
import { emptyPageLayout, mediaRefs, parsePageLayout, type PageBlockDef, type PageField, type PageLayout, type PageParse } from '../pages/blocks'

/** Marker of text still to be written by the team (seeded in skeletons and templates). A page that carries it is never shown on the site. */
export const PLACEHOLDER = '[DE COMPLETAT]'

/** Collections whose entries are laid out with these blocks. */
export const CONTENT_COLLECTIONS = ['preturi', 'servicii', 'ghiduri'] as const
export const isContentCollection = (key: string) => (CONTENT_COLLECTIONS as readonly string[]).includes(key)

const opt = (...o: [string, string][]) => o.map(([value, label]) => ({ value, label }))
const ALIGN = (): PageField => ({ key: 'align', label: 'Aliniere', kind: 'select', options: opt(['left', 'Stânga'], ['center', 'Centru']) })
const TITLE = (placeholder: string, max = 100): PageField => ({ key: 'title', label: 'Titlu', kind: 'text', max, placeholder })

export const CONTENT_CATALOG: PageBlockDef[] = [
  { type: 'hero', label: 'Banner principal (hero)', description: 'Titlul paginii (H1), un text sub el, o imagine de fundal opțională și butonul spre cererea de ofertă. Pune-l primul.', fields: [
    { key: 'title', label: 'Titlu (H1)', kind: 'text', max: 120, placeholder: 'Lasă gol ca să folosești titlul intrării' },
    { key: 'subtitle', label: 'Text sub titlu', kind: 'textarea', max: 250 },
    { key: 'image', label: 'Imagine de fundal', kind: 'media' },
    { key: 'imageAlt', label: 'Descrierea imaginii (pentru cei care nu o văd)', kind: 'text', max: 200 },
    { key: 'buttonLabel', label: 'Text buton (duce la cererea de ofertă)', kind: 'text', max: 40, placeholder: 'Cere oferte gratuite' },
    { key: 'checks', label: 'Bife sub butoane (ex.: Gratuit, Fără obligații)', kind: 'list', maxItems: 4, max: 40 },
    { key: 'bg', label: 'Fundal fără imagine', kind: 'select', options: opt(['dark', 'Închis'], ['brand', 'Portocaliu'], ['light', 'Deschis']) },
    ALIGN(),
  ] },
  { type: 'heading', label: 'Titlu', description: 'Un titlu de secțiune.', fields: [{ key: 'text', label: 'Text', kind: 'text', max: 120 }, { key: 'level', label: 'Mărime', kind: 'select', options: opt(['h2', 'Mare'], ['h3', 'Mai mică']) }, ALIGN()] },
  { type: 'text', label: 'Text', description: 'Unul sau mai multe paragrafe (rând gol între ele). Fără formatare.', fields: [{ key: 'body', label: 'Text', kind: 'textarea', max: 3000 }, ALIGN()] },
  { type: 'image', label: 'Imagine', description: 'O imagine din galeria intrării.', fields: [{ key: 'image', label: 'Imagine', kind: 'media' }, { key: 'alt', label: 'Descriere pentru cei care nu văd imaginea', kind: 'text', max: 200 }, { key: 'caption', label: 'Legendă', kind: 'text', max: 200 }, { key: 'size', label: 'Lățime', kind: 'select', options: opt(['wide', 'Lată'], ['narrow', 'Îngustă']) }] },
  { type: 'gallery', label: 'Galerie foto', description: 'Mai multe imagini din galeria intrării.', fields: [{ key: 'images', label: 'Imagini', kind: 'medias', maxItems: 12 }, { key: 'columns', label: 'Coloane', kind: 'select', options: opt(['3', '3 coloane'], ['2', '2 coloane'], ['4', '4 coloane']) }] },
  { type: 'cards', label: 'Carduri', description: 'Până la 6 carduri cu titlu și text.', fields: [{ key: 'items', label: 'Carduri', kind: 'pairs', maxItems: 6, pair: { a: 'title', b: 'text', aLabel: 'Titlu', bLabel: 'Text', aMax: 60, bMax: 240 } }, { key: 'columns', label: 'Coloane', kind: 'select', options: opt(['3', '3 coloane'], ['2', '2 coloane']) }] },
  { type: 'facts', label: 'Pe scurt (cifre cheie)', description: 'Până la 4 repere afișate ca bandă sub banner: durată, garanție, autorizare etc.', fields: [{ key: 'items', label: 'Repere', kind: 'pairs', maxItems: 4, pair: { a: 'label', b: 'value', aLabel: 'Eticheta', bLabel: 'Valoarea', aMax: 30, bMax: 60 } }] },
  { type: 'steps', label: 'Pași numerotați', description: 'Cum decurge lucrarea, în pași numerotați (până la 6).', fields: [TITLE('Cum decurge lucrarea'), { key: 'items', label: 'Pași', kind: 'pairs', maxItems: 6, pair: { a: 'title', b: 'text', aLabel: 'Pas', bLabel: 'Explicație', aMax: 60, bMax: 240 } }] },
  { type: 'media_text', label: 'Imagine + text', description: 'O imagine din galerie lângă un text.', fields: [
    { key: 'image', label: 'Imagine (din galeria intrării)', kind: 'media' },
    { key: 'imageAlt', label: 'Descrierea imaginii (pentru cei care nu o văd)', kind: 'text', max: 200 },
    { key: 'eyebrow', label: 'Etichetă mică deasupra titlului', kind: 'text', max: 40 },
    TITLE('Titlu'),
    { key: 'text', label: 'Text', kind: 'textarea', max: 800 },
    { key: 'side', label: 'Imaginea este în', kind: 'select', options: opt(['left', 'Stânga'], ['right', 'Dreapta']) },
    { key: 'bg', label: 'Fundalul secțiunii', kind: 'select', options: opt(['none', 'Alb'], ['light', 'Gri deschis']) },
  ] },
  { type: 'price_table', label: 'Tabel de prețuri', description: 'Afișează lista „Prețuri” a intrării (Lucrare | interval | observații). Prețurile rămân date, se schimbă din câmpul intrării.', fields: [TITLE('Prețuri orientative'), { key: 'note', label: 'Notă sub tabel', kind: 'text', max: 240, placeholder: 'Prețuri orientative, fără TVA' }] },
  { type: 'faq_list', label: 'Întrebări frecvente (FAQ)', description: 'Afișează lista „Întrebări frecvente” a intrării și generează automat schema FAQPage pentru Google.', fields: [TITLE('Întrebări frecvente')] },
  { type: 'price_links', label: 'Linkuri către prețuri', description: 'Paginile de prețuri din aceeași categorie (se completează singure din paginile de prețuri publicate). Util pe paginile de servicii.', fields: [TITLE('Prețuri orientative')] },
  { type: 'situation_links', label: 'Linkuri către situații', description: 'Paginile pe situații ale categoriei (de exemplu baie, fundație, terasă), publicate; se completează singure. Pune-l pe pagina categoriei și pe fiecare situație, ca să lege hub-ul.', fields: [TITLE('Situații frecvente')] },
  { type: 'guide_links', label: 'Linkuri către ghiduri', description: 'Ghidurile publicate din aceeași categorie (se completează singure). Pune-l pe pagina categoriei și la finalul fiecărui ghid, ca să lege hub-ul.', fields: [TITLE('Ghiduri')] },
  { type: 'areas', label: 'Zone deservite (locație)', description: 'Pe pagina unui serviciu afișează automat județele cu cel puțin 3 firme publicate (cu link spre firmele din județ); fără astfel de județe, secțiunea nu apare. Localitățile scrise aici se afișează doar când nu există județe cu firme și intră în schema Service (areaServed).', fields: [TITLE('Unde oferim serviciul'), { key: 'areas', label: 'Localități / județe', kind: 'list', maxItems: 40, max: 60 }] },
  { type: 'request_cta', label: 'Cerere de ofertă', description: 'Un apel la acțiune cu buton către formularul de cerere de ofertă.', fields: [TITLE('Cere oferte gratuite'), { key: 'text', label: 'Text', kind: 'textarea', max: 300 }, { key: 'buttonLabel', label: 'Text buton', kind: 'text', max: 40, placeholder: 'Trimite cererea' }] },
  { type: 'firms_list', label: 'Lista de firme', description: 'Firmele publicate pentru serviciul paginii (cu link spre profil). Fără firme, arată invitația „Alătură-te ca Pro”. Pe o pagină de prețuri nu are ce afișa.', fields: [TITLE('Firme pentru acest serviciu'), { key: 'limit', label: 'Câte firme', kind: 'select', options: opt(['6', '6 firme'], ['12', '12 firme']) }] },
  { type: 'request_form', label: 'Formular de cerere de ofertă', description: 'Formularul complet de cerere de ofertă pentru serviciul paginii. Butoanele din pagină (banner, „Cere oferte”) duc la el. Pune-l o singură dată pe pagină.', fields: [TITLE('Titlu deasupra formularului (opțional)')] },
  { type: 'columns', label: 'Coloane', description: 'Două coloane în care pui alte blocuri.', fields: [{ key: 'ratio', label: 'Proporție', kind: 'select', options: opt(['50-50', '50 / 50'], ['33-67', '1/3 și 2/3'], ['67-33', '2/3 și 1/3']) }], slots: [{ key: 'left', label: 'Stânga' }, { key: 'right', label: 'Dreapta' }] },
  { type: 'section', label: 'Secțiune cu fundal', description: 'Un fundal în jurul altor blocuri.', fields: [{ key: 'bg', label: 'Fundal', kind: 'select', options: opt(['light', 'Deschis'], ['none', 'Fără'], ['brand', 'Portocaliu'], ['dark', 'Închis']) }], slots: [{ key: 'content', label: 'Conținut' }] },
]

export const parseContentLayout = (raw: unknown, mediaIds: ReadonlySet<string>): PageParse => parsePageLayout(raw, { mediaIds, catalog: CONTENT_CATALOG })
export const contentMediaRefs = (layout: PageLayout) => mediaRefs(layout, CONTENT_CATALOG)

const idsOf = (raw: unknown): Set<string> => { const out = new Set<string>(); const walk = (x: unknown) => { if (typeof x === 'string' && /^[A-Za-z0-9_-]{10,40}$/.test(x)) out.add(x); else if (Array.isArray(x)) x.forEach(walk); else if (x && typeof x === 'object') Object.values(x).forEach(walk) }; walk(raw); return out }

/** A stored layout read back (it was validated on save): its own references count as known; damaged storage falls back to an empty page. */
export function effectiveContentLayout(raw: unknown): PageLayout {
  if (raw == null) return emptyPageLayout()
  const r = parseContentLayout(raw, idsOf(raw))
  return r.ok ? r.layout : emptyPageLayout()
}

const texts = (nodes: PageLayout['blocks']): string[] => nodes.flatMap((n) => [...Object.values(n.props).flatMap((v) => (typeof v === 'string' ? [v] : Array.isArray(v) ? v.flatMap((x) => (typeof x === 'string' ? [x] : x && typeof x === 'object' ? Object.values(x).filter((y): y is string => typeof y === 'string') : [])) : [])), ...Object.values(n.slots ?? {}).flatMap(texts)])
export const layoutHasPlaceholder = (layout: PageLayout) => texts(layout.blocks).some((t) => t.includes(PLACEHOLDER))

/**
 * Whether a page may be shown on the site: with blocks, when none of them still carries the marker (the body is not used then);
 * without blocks (default layout), when the body is written (not empty, no marker).
 */
export function contentReady(layout: PageLayout, body: string | null | undefined): boolean {
  if (layout.blocks.length > 0) return !layoutHasPlaceholder(layout)
  return !!body && !body.includes(PLACEHOLDER)
}

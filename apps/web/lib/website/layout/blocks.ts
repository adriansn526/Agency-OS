/**
 * Home page blocks of a firm's website: the catalog, validation and the default layout. One source of truth: the partner editor is generated
 * from the catalog (labels and fields) and everything saved is validated with the same rules. Blocks hold plain text only (no HTML, no scripts).
 * An empty text field means "use the automatic text derived from the profile".
 */
import { z } from 'zod'

export type FieldKind = 'text' | 'textarea' | 'number' | 'bool' | 'list' | 'pairs' | 'select'
export interface Field {
  key: string; label: string; kind: FieldKind; max?: number; min?: number; maxItems?: number; placeholder?: string
  /** select: the allowed values (the first is what "automatic" means when the field is left empty) */
  options?: { value: string; label: string }[]
  /** pairs: names of the two keys of each item, with their labels */
  pair?: { a: string; b: string; aLabel: string; bLabel: string; aMax: number; bMax: number }
}
export interface BlockDef { type: string; label: string; description: string; locked?: boolean; fields: Field[] }

const title = (placeholder: string): Field => ({ key: 'title', label: 'Titlu', kind: 'text', max: 100, placeholder })

export const CATALOG: BlockDef[] = [
  { type: 'hero', label: 'Banner principal', description: 'Titlul paginii, textul de sub el și butoanele. Rămâne mereu primul.', locked: true, fields: [
    { key: 'headline', label: 'Titlu', kind: 'text', max: 120, placeholder: 'ex: Instalații sanitare în Mureș' },
    { key: 'subheadline', label: 'Text sub titlu', kind: 'textarea', max: 250 },
    { key: 'ctaLabel', label: 'Text buton', kind: 'text', max: 40, placeholder: 'Cere ofertă gratuită' },
    { key: 'hidePhone', label: 'Ascunde butonul „Sună acum”', kind: 'bool' },
    { key: 'hideLogo', label: 'Ascunde logo-ul din banner', kind: 'bool' },
    { key: 'bg', label: 'Fundal', kind: 'select', options: [{ value: 'auto', label: 'Automat (imaginea de copertă sau degrade)' }, { value: 'video', label: 'Video (încarcă mai jos)' }, { value: 'gradient', label: 'Degrade' }, { value: 'color', label: 'Culoare unică' }] },
    { key: 'color', label: 'Culoarea fundalului (pentru „Culoare unică”)', kind: 'select', options: [{ value: 'ink', label: 'Închis' }, { value: 'brand', label: 'Portocaliu' }, { value: 'trust', label: 'Verde' }] },
    { key: 'overlay', label: 'Întunecare peste imagine / video', kind: 'select', options: [{ value: '50', label: 'Medie' }, { value: '0', label: 'Fără' }, { value: '25', label: 'Ușoară' }, { value: '70', label: 'Puternică' }] },
    { key: 'height', label: 'Înălțime', kind: 'select', options: [{ value: 'm', label: 'Medie' }, { value: 's', label: 'Mică' }, { value: 'l', label: 'Mare' }] },
    { key: 'align', label: 'Aliniere text', kind: 'select', options: [{ value: 'left', label: 'Stânga' }, { value: 'center', label: 'Centru' }] },
    { key: 'secondaryLabel', label: 'Al doilea buton (text)', kind: 'text', max: 40, placeholder: 'ex: Vezi lucrările noastre' },
    { key: 'secondaryTarget', label: 'Al doilea buton duce la', kind: 'select', options: [{ value: 'proiecte', label: 'Proiecte' }, { value: 'servicii', label: 'Servicii' }, { value: 'contact', label: 'Contact' }] },
  ] },
  { type: 'trust', label: 'Pe scurt (cifre)', description: 'Ani de activitate, angajați, domenii și zona de lucru, din datele firmei.', fields: [] },
  { type: 'services', label: 'Servicii', description: 'Serviciile alese în profil, cu buton de cerere de ofertă.', fields: [title('Ce putem face pentru dumneavoastră'), { key: 'max', label: 'Câte servicii se afișează', kind: 'number', min: 3, max: 12 }] },
  { type: 'why', label: 'De ce noi', description: 'Până la 3 argumente. Lasă gol pentru textele automate.', fields: [title('De ce firma ta'), { key: 'reasons', label: 'Argumente', kind: 'pairs', maxItems: 3, pair: { a: 'title', b: 'text', aLabel: 'Titlu', bLabel: 'Text', aMax: 60, bMax: 200 } }] },
  { type: 'about', label: 'Despre noi (scurt)', description: 'Un paragraf de prezentare pe pagina de Acasă.', fields: [title('Despre noi'), { key: 'text', label: 'Text', kind: 'textarea', max: 800 }] },
  { type: 'projects', label: 'Proiecte recente', description: 'Ultimele proiecte din portofoliu (apare doar dacă ai proiecte).', fields: [title('Proiecte recente'), { key: 'max', label: 'Câte proiecte se afișează', kind: 'number', min: 3, max: 12 }] },
  { type: 'reviews', label: 'Recenzii', description: 'Recenziile aprobate (apare doar dacă ai recenzii).', fields: [title('Ce spun clienții')] },
  { type: 'certs', label: 'Autorizații și certificări', description: 'Lista din profil (apare doar dacă ai completat-o).', fields: [title('Autorizații și certificări')] },
  { type: 'steps', label: 'Cum lucrăm', description: 'Cei patru pași, de la cerere la execuție.', fields: [title('Cum lucrăm împreună')] },
  { type: 'areas', label: 'Zone deservite', description: 'Localitățile în care lucrezi.', fields: [title('Unde lucrăm'), { key: 'areas', label: 'Localități', kind: 'list', maxItems: 15, max: 60 }] },
  { type: 'faq', label: 'Întrebări frecvente', description: 'Până la 8 întrebări cu răspuns (ajută și în Google).', fields: [title('Întrebări frecvente'), { key: 'items', label: 'Întrebări', kind: 'pairs', maxItems: 8, pair: { a: 'q', b: 'a', aLabel: 'Întrebare', bLabel: 'Răspuns', aMax: 120, bMax: 600 } }] },
  { type: 'cta', label: 'Apel final', description: 'Încheierea paginii, cu buton de cerere de ofertă.', fields: [title('Aveți un proiect în minte?'), { key: 'text', label: 'Text', kind: 'textarea', max: 200 }, { key: 'ctaLabel', label: 'Text buton', kind: 'text', max: 40, placeholder: 'Cere ofertă gratuită' }] },
]

export const BLOCK_TYPES = CATALOG.map((b) => b.type)
export const MAX_BLOCKS = CATALOG.length

export interface Block { type: string; enabled: boolean; props: Record<string, unknown> }
export interface Layout { version: 1; blocks: Block[] }

const DEFAULT_ORDER = ['hero', 'trust', 'services', 'why', 'projects', 'reviews', 'steps', 'cta']
export const defaultLayout = (): Layout => ({ version: 1, blocks: DEFAULT_ORDER.map((type) => ({ type, enabled: true, props: {} })) })

const text = (max: number) => z.string().trim().max(max)

function fieldSchema(f: Field): z.ZodTypeAny {
  switch (f.kind) {
    case 'text': case 'textarea': return text(f.max ?? 200)
    case 'bool': return z.boolean()
    case 'select': return z.union([z.literal(''), z.enum(f.options!.map((o) => o.value) as [string, ...string[]])])   // '' = automatic
    case 'number': return z.number().int().min(f.min ?? 0).max(f.max ?? 100)
    case 'list': return z.array(text(f.max ?? 100).min(1)).max(f.maxItems ?? 20)
    case 'pairs': { const p = f.pair!; return z.array(z.object({ [p.a]: text(p.aMax).min(1), [p.b]: text(p.bMax).min(1) }).strict()).max(f.maxItems ?? 10) }
  }
}

const propsSchema = (def: BlockDef) => z.object(Object.fromEntries(def.fields.map((f) => [f.key, fieldSchema(f).optional()]))).strict()

/** Drops empty values so "empty" always means "automatic". */
function clean(props: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined || v === '' || v === false || (Array.isArray(v) && v.length === 0)) continue
    out[k] = v
  }
  return out
}

export type ParseResult = { ok: true; layout: Layout } | { ok: false; issues: string[] }

/** Validates a layout from the editor or from storage and returns the canonical form (hero first and enabled, one block per type, empty props removed). */
export function parseLayout(raw: unknown): ParseResult {
  const list = Array.isArray(raw) ? raw : raw && typeof raw === 'object' ? (raw as { blocks?: unknown }).blocks : undefined
  if (!Array.isArray(list)) return { ok: false, issues: ['Lipsește lista de blocuri'] }
  if (list.length > MAX_BLOCKS) return { ok: false, issues: [`Maxim ${MAX_BLOCKS} blocuri`] }
  const issues: string[] = []
  const seen = new Set<string>()
  const blocks: Block[] = []
  for (const [i, b] of list.entries()) {
    const item = b as { type?: unknown; enabled?: unknown; props?: unknown }
    const def = CATALOG.find((d) => d.type === item?.type)
    if (!def) { issues.push(`Bloc ${i + 1}: tip necunoscut`); continue }
    if (seen.has(def.type)) { issues.push(`„${def.label}” apare de două ori`); continue }
    seen.add(def.type)
    if (item.enabled !== undefined && typeof item.enabled !== 'boolean') { issues.push(`„${def.label}”: starea trebuie să fie da/nu`); continue }
    const parsed = propsSchema(def).safeParse(item.props ?? {})
    if (!parsed.success) { issues.push(...parsed.error.issues.map((x) => `„${def.label}” — ${x.path.join('.') || 'conținut'}: ${x.message}`)); continue }
    blocks.push({ type: def.type, enabled: def.locked ? true : item.enabled !== false, props: clean(parsed.data as Record<string, unknown>) })
  }
  if (issues.length) return { ok: false, issues }
  const hero = blocks.find((b) => b.type === 'hero') ?? { type: 'hero', enabled: true, props: {} }
  return { ok: true, layout: { version: 1, blocks: [hero, ...blocks.filter((b) => b.type !== 'hero')] } }
}

/** The layout to use for a stored value: invalid or missing → the default. */
export function effectiveLayout(stored: unknown): Layout {
  if (stored == null) return defaultLayout()
  const r = parseLayout(stored)
  return r.ok ? r.layout : defaultLayout()
}

export const canonical = (l: Layout) => JSON.stringify(l)

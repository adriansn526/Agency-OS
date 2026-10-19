/**
 * Blocks of a firm's custom pages (layout format v2, edited with Puck).
 *
 * Same principles as the home page blocks (lib/website/layout/blocks.ts): the catalog is the single source of truth, everything saved is validated
 * against it, nothing is free HTML or a free URL. What v2 adds: blocks can repeat and be ordered freely, containers nest other blocks through
 * named slots (depth ≤ 3, ≤ 60 blocks), and images are references to the firm's own uploaded media.
 */
import { z } from 'zod'
import { CATALOG as HOME_CATALOG, MEDIA_TEXT_FIELDS, type Field } from '../layout/blocks'

export type PageFieldKind = Field['kind'] | 'media' | 'medias'
export type PageField = Omit<Field, 'kind'> & { kind: PageFieldKind }
export interface PageBlockDef { type: string; label: string; description: string; fields: PageField[]; /** container: named slots that hold other blocks */ slots?: { key: string; label: string }[] }

export const LIMITS = { maxDepth: 3, maxBlocks: 60, maxBytes: 120_000 } as const
const opt = (...o: [string, string][]) => o.map(([value, label]) => ({ value, label }))
const ALIGN = (): PageField => ({ key: 'align', label: 'Aliniere', kind: 'select', options: opt(['left', 'Stânga'], ['center', 'Centru']) })
const fromHome = (type: string) => HOME_CATALOG.find((b) => b.type === type)!
const reuse = (type: string): PageBlockDef => { const b = fromHome(type); return { type: b.type, label: b.label, description: b.description, fields: b.fields } }
const TARGETS = opt(['oferta', 'Cerere de ofertă'], ['telefon', 'Sună'], ['contact', 'Contact'], ['proiecte', 'Proiecte'], ['servicii', 'Servicii'])

export const PAGE_CATALOG: PageBlockDef[] = [
  { type: 'heading', label: 'Titlu', description: 'Un titlu de secțiune.', fields: [{ key: 'text', label: 'Text', kind: 'text', max: 120 }, { key: 'level', label: 'Mărime', kind: 'select', options: opt(['h2', 'Mare'], ['h3', 'Mai mică']) }, ALIGN()] },
  { type: 'text', label: 'Text', description: 'Unul sau mai multe paragrafe (rând gol între ele). Fără formatare.', fields: [{ key: 'body', label: 'Text', kind: 'textarea', max: 3000 }, ALIGN()] },
  { type: 'image', label: 'Imagine', description: 'O imagine din galeria firmei.', fields: [{ key: 'image', label: 'Imagine', kind: 'media' }, { key: 'alt', label: 'Descriere pentru cei care nu văd imaginea', kind: 'text', max: 200 }, { key: 'caption', label: 'Legendă', kind: 'text', max: 200 }, { key: 'size', label: 'Lățime', kind: 'select', options: opt(['wide', 'Lată'], ['narrow', 'Îngustă']) }] },
  { type: 'gallery', label: 'Galerie', description: 'Mai multe imagini din galeria firmei.', fields: [{ key: 'images', label: 'Imagini', kind: 'medias', maxItems: 12 }, { key: 'columns', label: 'Coloane', kind: 'select', options: opt(['3', '3 coloane'], ['2', '2 coloane'], ['4', '4 coloane']) }] },
  { type: 'cards', label: 'Carduri', description: 'Până la 6 carduri cu titlu și text.', fields: [{ key: 'items', label: 'Carduri', kind: 'pairs', maxItems: 6, pair: { a: 'title', b: 'text', aLabel: 'Titlu', bLabel: 'Text', aMax: 60, bMax: 240 } }, { key: 'columns', label: 'Coloane', kind: 'select', options: opt(['3', '3 coloane'], ['2', '2 coloane']) }] },
  { type: 'buttons', label: 'Butoane', description: 'Unul sau două butoane care duc în site (nu la adrese externe).', fields: [{ key: 'primaryLabel', label: 'Primul buton (text)', kind: 'text', max: 40 }, { key: 'primaryTarget', label: 'Primul buton duce la', kind: 'select', options: TARGETS }, { key: 'secondaryLabel', label: 'Al doilea buton (text)', kind: 'text', max: 40 }, { key: 'secondaryTarget', label: 'Al doilea buton duce la', kind: 'select', options: TARGETS }, ALIGN()] },
  { type: 'media_text', label: 'Imagine + text', description: 'O imagine din galerie lângă un text, cu buton.', fields: MEDIA_TEXT_FIELDS },
  reuse('faq'), reuse('cta'), reuse('services'), reuse('projects'), reuse('reviews'),
  { type: 'columns', label: 'Coloane', description: 'Două coloane în care pui alte blocuri.', fields: [{ key: 'ratio', label: 'Proporție', kind: 'select', options: opt(['50-50', '50 / 50'], ['33-67', '1/3 și 2/3'], ['67-33', '2/3 și 1/3']) }], slots: [{ key: 'left', label: 'Stânga' }, { key: 'right', label: 'Dreapta' }] },
  { type: 'section', label: 'Secțiune cu fundal', description: 'Un fundal în jurul altor blocuri.', fields: [{ key: 'bg', label: 'Fundal', kind: 'select', options: opt(['light', 'Deschis'], ['none', 'Fără'], ['brand', 'Portocaliu'], ['dark', 'Închis']) }], slots: [{ key: 'content', label: 'Conținut' }] },
]

export const PAGE_BLOCK_TYPES = PAGE_CATALOG.map((b) => b.type)
export const isContainer = (def: PageBlockDef) => !!def.slots?.length

export interface PageNode { id: string; type: string; props: Record<string, unknown>; slots?: Record<string, PageNode[]> }
export interface PageLayout { version: 2; blocks: PageNode[] }
export const emptyPageLayout = (): PageLayout => ({ version: 2, blocks: [] })

const ID_RE = /^[A-Za-z0-9_-]{1,60}$/
const MEDIA_ID_RE = /^[A-Za-z0-9_-]{10,40}$/
const text = (max: number) => z.string().trim().max(max)

function fieldSchema(f: PageField): z.ZodTypeAny {
  switch (f.kind) {
    case 'text': case 'textarea': return text(f.max ?? 200)
    case 'bool': return z.boolean()
    case 'number': return z.number().int().min(f.min ?? 0).max(f.max ?? 100)
    case 'select': return z.union([z.literal(''), z.enum(f.options!.map((o) => o.value) as [string, ...string[]])])
    case 'list': return z.array(text(f.max ?? 100).min(1)).max(f.maxItems ?? 20)
    case 'pairs': { const p = f.pair!; return z.array(z.object({ [p.a]: text(p.aMax).min(1), [p.b]: text(p.bMax).min(1) }).strict()).max(f.maxItems ?? 10) }
    case 'media': return z.union([z.literal(''), z.string().regex(MEDIA_ID_RE)])
    case 'medias': return z.array(z.string().regex(MEDIA_ID_RE)).max(f.maxItems ?? 12)
  }
}
const propsSchema = (def: PageBlockDef) => z.object(Object.fromEntries(def.fields.map((f) => [f.key, fieldSchema(f).optional()]))).strict()

/** Empty means "default": '', false and empty lists are dropped so the stored form is canonical. */
function clean(props: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(props)) { if (v === undefined || v === '' || v === false || (Array.isArray(v) && v.length === 0)) continue; out[k] = v }
  return out
}

export type PageParse = { ok: true; layout: PageLayout } | { ok: false; issues: string[] }

/**
 * Validates a v2 layout coming from the editor or from storage. `mediaIds` = the ids of the firm's own images: a reference to anything else is refused.
 * Unknown types, unknown props, wrong values, duplicate ids, containers in the wrong place, too deep / too many / too big layouts are all rejected, with every problem listed.
 */
export function parsePageLayout(raw: unknown, ctx: { mediaIds: ReadonlySet<string> }): PageParse {
  const list = Array.isArray(raw) ? raw : raw && typeof raw === 'object' ? (raw as { blocks?: unknown; version?: unknown }).blocks : undefined
  if (raw && typeof raw === 'object' && !Array.isArray(raw) && (raw as { version?: unknown }).version !== 2) return { ok: false, issues: ['Format necunoscut (se așteaptă versiunea 2)'] }
  if (!Array.isArray(list)) return { ok: false, issues: ['Lipsește lista de blocuri'] }
  if (JSON.stringify(list).length > LIMITS.maxBytes) return { ok: false, issues: ['Pagina este prea mare'] }
  const issues: string[] = []
  const ids = new Set<string>()
  let count = 0
  const byType = new Map(PAGE_CATALOG.map((d) => [d.type, d]))

  const walk = (items: unknown, depth: number, where: string, parentType: string | null): PageNode[] => {
    if (!Array.isArray(items)) { issues.push(`${where}: lista de blocuri lipsește`); return [] }
    const out: PageNode[] = []
    for (const [i, it] of items.entries()) {
      const at = `${where}[${i}]`
      const item = it as { id?: unknown; type?: unknown; props?: unknown; slots?: unknown }
      if (!item || typeof item !== 'object' || typeof item.type !== 'string') { issues.push(`${at}: bloc invalid`); continue }
      const def = byType.get(item.type)
      if (!def) { issues.push(`${at}: tip necunoscut „${item.type.slice(0, 40)}”`); continue }
      if (++count > LIMITS.maxBlocks) { if (count === LIMITS.maxBlocks + 1) issues.push(`Maxim ${LIMITS.maxBlocks} de blocuri`); continue }
      if (typeof item.id !== 'string' || !ID_RE.test(item.id)) { issues.push(`„${def.label}”: id invalid`); continue }
      if (ids.has(item.id)) { issues.push(`„${def.label}”: id duplicat`); continue }
      ids.add(item.id)
      if (def.type === 'section' && parentType) { issues.push(`„${def.label}” se pune doar direct pe pagină`); continue }
      if (def.type === 'columns' && parentType === 'columns') { issues.push(`„${def.label}” nu poate fi pus în alte coloane`); continue }
      if (depth > LIMITS.maxDepth) { issues.push(`${at}: prea multe niveluri`); continue }
      const parsed = propsSchema(def).safeParse(item.props ?? {})
      if (!parsed.success) { issues.push(...parsed.error.issues.map((x) => `„${def.label}” — ${x.path.join('.') || 'conținut'}: ${x.message}`)); continue }
      const props = clean(parsed.data as Record<string, unknown>)
      for (const f of def.fields) {
        const v = props[f.key]
        const refs = f.kind === 'media' && typeof v === 'string' ? [v] : f.kind === 'medias' && Array.isArray(v) ? (v as string[]) : []
        for (const r of refs) if (!ctx.mediaIds.has(r)) issues.push(`„${def.label}” — ${f.label}: imaginea nu există în galeria firmei`)
      }
      const node: PageNode = { id: item.id, type: def.type, props }
      if (isContainer(def)) {
        const given = item.slots && typeof item.slots === 'object' && !Array.isArray(item.slots) ? (item.slots as Record<string, unknown>) : {}
        const allowed = new Set(def.slots!.map((s) => s.key))
        for (const k of Object.keys(given)) if (!allowed.has(k)) issues.push(`„${def.label}”: zona „${k}” nu există`)
        node.slots = Object.fromEntries(def.slots!.map((s) => [s.key, walk(given[s.key] ?? [], depth + 1, `${at}.${s.key}`, def.type)]))
      } else if (item.slots !== undefined && !(typeof item.slots === 'object' && item.slots !== null && Object.keys(item.slots).length === 0)) issues.push(`„${def.label}” nu are zone pentru alte blocuri`)
      out.push(node)
    }
    return out
  }
  const blocks = walk(list, 1, 'blocuri', null)
  return issues.length ? { ok: false, issues } : { ok: true, layout: { version: 2, blocks } }
}

/** Every media id a layout refers to (to check ownership, or to resolve URLs when the page is served). */
export function mediaRefs(layout: PageLayout): string[] {
  const out = new Set<string>()
  const walk = (nodes: PageNode[]) => {
    for (const n of nodes) {
      const def = PAGE_CATALOG.find((d) => d.type === n.type)
      for (const f of def?.fields ?? []) { const v = n.props[f.key]; if (f.kind === 'media' && typeof v === 'string') out.add(v); if (f.kind === 'medias' && Array.isArray(v)) for (const x of v) out.add(String(x)) }
      for (const s of Object.values(n.slots ?? {})) walk(s)
    }
  }
  walk(layout.blocks)
  return [...out]
}

export const countBlocks = (layout: PageLayout): number => { let n = 0; const walk = (a: PageNode[]) => { for (const x of a) { n++; for (const s of Object.values(x.slots ?? {})) walk(s) } }; walk(layout.blocks); return n }

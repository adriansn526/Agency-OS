/** What a logged-in partner sees and may change on their own entry. Changes are live immediately and written to the activity log. */
import { z } from 'zod'
import { db, Prisma } from '@repo/db'
import { AdminError } from '../admin/errors'
import { normalizeWebsite } from '../admin/url'
import { getTaxonomy, unknownCategories, type LiveTaxonomy } from '../glossary/live'
import { nationalPhone } from '../../prospectare/import-mapping'
import { THEME_PRESETS } from '../theme'
import { canonicalCase, caseImageUrls, caseVideoFiles, urlsInList } from './cazuistica'

/** Medical claims proposed by the doctor wait here for the team (data key, JSON text); the public profile keeps showing the checked values. */
export const PENDING_KEY = 'modificari_asteptare'
export const GATED_KEYS = ['servicii', 'specializare', 'subspecializari', 'cod_parafa', 'cazuistica'] as const
const MEDICAL_LIVE_KEYS = ['tarif_consultatie', 'consult_online', 'experienta_ani', 'clinici', 'limbi', 'studii', 'afilieri', 'intrebari'] as const
export type Gated = Partial<Record<(typeof GATED_KEYS)[number], string | string[] | null>>

export function parsePending(v: unknown): (Gated & { at?: string }) | null {
  if (typeof v !== 'string' || !v) return null
  try { const o = JSON.parse(v); return o && typeof o === 'object' && !Array.isArray(o) ? o : null } catch { return null }
}

/** A medical line is one whose people collection declares the parafa code. */
export async function isMedicalEntry(entry: { collectionId: string }) {
  const c = await db.websiteCollection.findUnique({ where: { id: entry.collectionId }, select: { fields: true } })
  return Array.isArray(c?.fields) && (c!.fields as { key?: string }[]).some((f) => f.key === 'cod_parafa')
}

/** Name and CUI are not editable here: changing them needs re-verification by the team. */
export const LOCKED_FIELDS = ['title', 'cui'] as const

const text = (max: number) => z.string().trim().max(max).nullish().transform((v) => (v ? v : null))

export const profilePatch = z.object({
  summary: text(500), body: text(20_000), phone: text(40), address: text(200), city: text(80), county: text(80), program: text(500),
  email: z.string().trim().email().max(200).nullish().transform((v) => (v ? v : null)),
  websiteUrl: z.string().trim().max(300).nullish().transform((v, ctx) => {
    if (!v) return null
    const u = normalizeWebsite(v)
    if (!u) ctx.addIssue({ code: 'custom', message: 'Adresă de website invalidă' })
    return u
  }),
  servicii: z.array(z.string().trim().min(1).max(60)).max(12).optional(),
  certificari: z.array(z.string().trim().min(1).max(120)).max(20).optional(),
  // medical lines (collection with the cod_parafa field): the doctor's own facts, live at once
  tarif_consultatie: z.number().int().min(0).max(100_000).nullish().transform((v) => v ?? null),
  consult_online: z.enum(['da', 'nu']).nullish().transform((v) => v ?? null),
  experienta_ani: z.number().int().min(0).max(70).nullish().transform((v) => v ?? null),
  clinici: z.array(z.string().trim().min(1).max(200)).max(10).optional(),
  limbi: z.array(z.string().trim().min(1).max(60)).max(15).optional(),
  studii: z.array(z.string().trim().min(1).max(300)).max(15).optional(),
  afilieri: z.array(z.string().trim().min(1).max(150)).max(15).optional(),
  /** "Întrebare | Răspuns" */
  intrebari: z.array(z.string().trim().min(3).max(600).refine((s) => /\|/.test(s) && s.split('|')[0]!.trim().length >= 3 && s.split('|').slice(1).join('|').trim().length >= 1, 'Format: Întrebare | Răspuns')).max(12).optional(),
  // medical lines: medical claims that the team checks before they show (specialty, procedures, sub-specialities, parafa code)
  specializare: text(120),
  subspecializari: z.array(z.string().trim().min(1).max(100)).max(20).optional(),
  /** anonymised special cases: a JSON case (title + blocks) or an older "Titlu | Descriere"; the team reads them before they show */
  cazuistica: z.array(z.string().trim().min(10).max(24_000).transform((v, ctx) => { const r = canonicalCase(v); if (!r.ok) { ctx.addIssue({ code: 'custom', message: r.message }); return z.NEVER } return r.value })).max(12).optional(),
  cod_parafa: z.string().trim().regex(/^[A-Za-z0-9]{4,10}$/, 'Codul de parafă are 4–10 litere și cifre').nullish().transform((v) => v ?? null),
  /** colour theme: a preset key and/or a custom #rrggbb accent (null clears) */
  tema: z.enum(THEME_PRESETS as [string, ...string[]]).nullish().transform((v) => v ?? null),
  accent: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, 'Culoare invalidă (#rrggbb)').nullish().transform((v) => (v ? v.toLowerCase() : null)),
}).strict().partial()

type EntryWithMedia = Prisma.WebsiteEntryGetPayload<{ include: { media: true } }>

/** The hero background video (two media rows of kind "file": the video and its poster), or null. */
function heroVideoOf(media: EntryWithMedia['media']) {
  const v = media.find((m) => m.kind === 'file' && m.alt === 'hero-video'), p = media.find((m) => m.kind === 'file' && m.alt === 'hero-poster')
  return v && p ? { url: v.url, posterUrl: p.url, bytes: v.sizeBytes } : null
}

export function serializeProfile(e: EntryWithMedia, tax: LiveTaxonomy, medical = false) {
  const d = (e.data ?? {}) as Record<string, unknown>
  const list = (k: string) => (Array.isArray(d[k]) ? (d[k] as unknown[]).map(String) : [])
  return {
    ...(medical ? {
      medical: true,
      tarif_consultatie: typeof d.tarif_consultatie === 'number' ? d.tarif_consultatie : null, consult_online: d.consult_online === 'da' || d.consult_online === 'nu' ? d.consult_online : null,
      experienta_ani: typeof d.experienta_ani === 'number' ? d.experienta_ani : null, specializare: typeof d.specializare === 'string' ? d.specializare : null, cod_parafa: typeof d.cod_parafa === 'string' ? d.cod_parafa : null,
      clinici: list('clinici'), limbi: list('limbi'), studii: list('studii'), afilieri: list('afilieri'), subspecializari: list('subspecializari'), intrebari: list('intrebari'), cazuistica: list('cazuistica'),
      pending: parsePending(d[PENDING_KEY]),
    } : {}),
    id: e.id, slug: e.slug, status: e.status, title: e.title, cui: typeof d.cui === 'string' ? d.cui : null,
    summary: e.summary, body: e.body, phone: e.phone, email: e.email, websiteUrl: e.websiteUrl, address: e.address, city: e.city, county: e.county,
    logoUrl: e.logoUrl, coverUrl: e.coverUrl,
    // company facts the website shows (read-only here): used by the editor's live preview
    facts: Object.fromEntries(['forma_juridica', 'an_infiintare', 'banda_vechime', 'banda_angajati', 'banda_cifra_afaceri', 'regiune'].filter((k) => typeof d[k] === 'string' || typeof d[k] === 'number').map((k) => [k, d[k]])),
    tema: typeof d.tema === 'string' ? d.tema : null, accent: typeof d.accent === 'string' ? d.accent : null,
    servicii: Array.isArray(d.servicii) ? d.servicii.map(String) : [], program: typeof d.program === 'string' ? d.program : null, certificari: Array.isArray(d.certificari) ? d.certificari.map(String) : [],
    heroVideo: heroVideoOf(e.media),
    media: e.media.filter((m) => m.kind === 'image').map((m) => ({ id: m.id, url: m.url, alt: m.alt, width: m.width, height: m.height })),
    locked: [...LOCKED_FIELDS], publicPath: e.status === 'published' ? `/companii/${e.slug}` : null,
    categories: tax.categories, groups: tax.groups,
  }
}

export async function updateProfile(entry: EntryWithMedia, raw: unknown) {
  const parsed = profilePatch.safeParse(raw)
  if (!parsed.success) throw new AdminError('Date invalide', 422, parsed.error.issues.map((i) => `${i.path.join('.') || 'cerere'}: ${i.message}`))
  const p = parsed.data
  const medical = await isMedicalEntry(entry)
  if (!medical) for (const k of ['specializare', 'subspecializari', 'cod_parafa', 'cazuistica', ...MEDICAL_LIVE_KEYS] as const) if ((p as Record<string, unknown>)[k] !== undefined) throw new AdminError('Date invalide', 422, [`${k}: câmp indisponibil pe această linie`])
  if (p.servicii) {
    const bad = unknownCategories(await getTaxonomy(entry.businessLineId), p.servicii)
    if (bad.length) throw new AdminError('Date invalide', 422, [`servicii: categorie necunoscută (${bad.join(', ')})`])
  }
  if (p.cazuistica) {
    // images in a case must be ones this doctor uploaded to their own profile
    const own = new Set(entry.media.filter((m) => m.kind === 'image' || (m.kind === 'file' && (m.alt === 'cazuistica-video' || m.alt === 'cazuistica-poster'))).map((m) => m.url))
    const foreign = p.cazuistica.flatMap((c) => { const r = canonicalCase(c); return r.ok ? [...caseImageUrls(r.case), ...caseVideoFiles(r.case)] : [] }).filter((u) => !own.has(u))
    if (foreign.length) throw new AdminError('Date invalide', 422, ['cazuistica: imagine necunoscută (încarcă fișierele din editor)'])
  }
  const d = { ...((entry.data ?? {}) as Record<string, unknown>) }
  const column: Prisma.WebsiteEntryUpdateInput = {}
  const changed: string[] = []
  const set = <K extends 'summary' | 'body' | 'phone' | 'address' | 'city' | 'county' | 'email' | 'websiteUrl'>(k: K, v: string | null | undefined) => {
    if (v === undefined || v === entry[k]) return
    ;(column as Record<string, unknown>)[k] = v; changed.push(k)
  }
  set('summary', p.summary); set('body', p.body); set('address', p.address); set('city', p.city); set('county', p.county); set('email', p.email); set('websiteUrl', p.websiteUrl)
  if (p.phone !== undefined) set('phone', p.phone ? nationalPhone(p.phone) ?? p.phone : null)
  for (const k of ['tema', 'accent'] as const) {
    const v = p[k]
    if (v === undefined) continue
    if (v === (typeof d[k] === 'string' ? d[k] : null)) continue
    if (v === null) delete d[k]; else d[k] = v
    changed.push(k)
  }
  // medical: free-form facts go live; claims the team must check are only proposed
  const gatedProposal: Gated = {}
  for (const k of GATED_KEYS) { if (medical && (p as Record<string, unknown>)[k] !== undefined) (gatedProposal as Record<string, unknown>)[k] = (p as Record<string, unknown>)[k] }
  for (const k of medical ? MEDICAL_LIVE_KEYS : []) {
    const v = (p as Record<string, unknown>)[k]
    if (v === undefined) continue
    if (JSON.stringify(v) === JSON.stringify(d[k] ?? (Array.isArray(v) ? [] : null))) continue
    if (v === null || (Array.isArray(v) && v.length === 0)) delete d[k]; else d[k] = v
    changed.push(k)
  }
  if (Object.keys(gatedProposal).length) {
    const pend = { ...(parsePending(d[PENDING_KEY]) ?? {}) } as Record<string, unknown>
    let touched = false
    for (const k of GATED_KEYS) {
      const v = (gatedProposal as Record<string, unknown>)[k]
      if (v === undefined) continue
      const live = d[k] ?? (Array.isArray(v) ? [] : null)
      if (JSON.stringify(v ?? (Array.isArray(live) ? [] : null)) === JSON.stringify(live)) { if (k in pend) { delete pend[k]; touched = true } continue }
      pend[k] = v; touched = true
    }
    if (touched) {
      const { at: _at, ...rest } = pend
      if (Object.keys(rest).length) d[PENDING_KEY] = JSON.stringify({ ...rest, at: new Date().toISOString() }); else delete d[PENDING_KEY]
      changed.push('modificari_in_asteptare')
    }
  }
  for (const k of (medical ? ['program', 'certificari'] : ['servicii', 'program', 'certificari']) as ('servicii' | 'program' | 'certificari')[]) {
    const v = p[k]
    if (v === undefined) continue
    if (JSON.stringify(v) === JSON.stringify(d[k] ?? (k === 'program' ? null : []))) continue
    if (v === null || (Array.isArray(v) && v.length === 0)) delete d[k]; else d[k] = v
    changed.push(k)
  }
  if (!changed.length) return { changed }
  if (changed.some((k) => ['servicii', 'program', 'certificari', 'tema', 'accent', 'modificari_in_asteptare', ...MEDICAL_LIVE_KEYS].includes(k))) column.data = d as Prisma.InputJsonValue
  await db.$transaction([
    db.websiteEntry.update({ where: { id: entry.id }, data: column }),
    db.activity.create({ data: {
      businessLineId: entry.businessLineId, userName: 'Partener (Profilul meu)', action: 'partner_profile_edit', entityType: 'website_entry', entityId: entry.id, entityName: entry.title,
      leadId: entry.leadId ?? undefined, details: { changed } as Prisma.InputJsonValue,
    } }),
  ])
  return { changed }
}

/** Images that a live or proposed case still points at: they must not be deleted from under it. */
export function caseImagesInUse(data: unknown): string[] {
  const d = (data ?? {}) as Record<string, unknown>
  return [...urlsInList(d.cazuistica), ...urlsInList(parsePending(d[PENDING_KEY])?.cazuistica)]
}

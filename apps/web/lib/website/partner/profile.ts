/** What a logged-in partner sees and may change on their own entry. Changes are live immediately and written to the activity log. */
import { z } from 'zod'
import { db, Prisma } from '@repo/db'
import { AdminError } from '../admin/errors'
import { normalizeWebsite } from '../admin/url'
import { CATEGORIES, GROUPS, isCategorySlug } from '../glossary/taxonomy'
import { nationalPhone } from '../../prospectare/import-mapping'
import { THEME_PRESETS } from '../theme'

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
  servicii: z.array(z.string().trim()).max(12).optional().refine((a) => !a || a.every(isCategorySlug), 'Categorie necunoscută'),
  certificari: z.array(z.string().trim().min(1).max(120)).max(20).optional(),
  /** colour theme: a preset key and/or a custom #rrggbb accent (null clears) */
  tema: z.enum(THEME_PRESETS as [string, ...string[]]).nullish().transform((v) => v ?? null),
  accent: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, 'Culoare invalidă (#rrggbb)').nullish().transform((v) => (v ? v.toLowerCase() : null)),
}).strict().partial()

type EntryWithMedia = Prisma.WebsiteEntryGetPayload<{ include: { media: true } }>

export function serializeProfile(e: EntryWithMedia) {
  const d = (e.data ?? {}) as Record<string, unknown>
  return {
    id: e.id, slug: e.slug, status: e.status, title: e.title, cui: typeof d.cui === 'string' ? d.cui : null,
    summary: e.summary, body: e.body, phone: e.phone, email: e.email, websiteUrl: e.websiteUrl, address: e.address, city: e.city, county: e.county,
    logoUrl: e.logoUrl, coverUrl: e.coverUrl,
    // company facts the website shows (read-only here): used by the editor's live preview
    facts: Object.fromEntries(['forma_juridica', 'an_infiintare', 'banda_vechime', 'banda_angajati', 'banda_cifra_afaceri', 'regiune'].filter((k) => typeof d[k] === 'string' || typeof d[k] === 'number').map((k) => [k, d[k]])),
    tema: typeof d.tema === 'string' ? d.tema : null, accent: typeof d.accent === 'string' ? d.accent : null,
    servicii: Array.isArray(d.servicii) ? d.servicii.map(String) : [], program: typeof d.program === 'string' ? d.program : null, certificari: Array.isArray(d.certificari) ? d.certificari.map(String) : [],
    media: e.media.filter((m) => m.kind === 'image').map((m) => ({ id: m.id, url: m.url, alt: m.alt, width: m.width, height: m.height })),
    locked: [...LOCKED_FIELDS], publicPath: e.status === 'published' ? `/companii/${e.slug}` : null,
    categories: CATEGORIES.map((c) => ({ slug: c.slug, title: c.title, group: c.group })), groups: GROUPS.map((g) => ({ slug: g.slug, title: g.title })),
  }
}

export async function updateProfile(entry: EntryWithMedia, raw: unknown) {
  const parsed = profilePatch.safeParse(raw)
  if (!parsed.success) throw new AdminError('Date invalide', 422, parsed.error.issues.map((i) => `${i.path.join('.') || 'cerere'}: ${i.message}`))
  const p = parsed.data
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
  for (const k of ['servicii', 'program', 'certificari'] as const) {
    const v = p[k]
    if (v === undefined) continue
    if (JSON.stringify(v) === JSON.stringify(d[k] ?? (k === 'program' ? null : []))) continue
    if (v === null || (Array.isArray(v) && v.length === 0)) delete d[k]; else d[k] = v
    changed.push(k)
  }
  if (!changed.length) return { changed }
  if (changed.some((k) => ['servicii', 'program', 'certificari', 'tema', 'accent'].includes(k))) column.data = d as Prisma.InputJsonValue
  await db.$transaction([
    db.websiteEntry.update({ where: { id: entry.id }, data: column }),
    db.activity.create({ data: {
      businessLineId: entry.businessLineId, userName: 'Partener (Profilul meu)', action: 'partner_profile_edit', entityType: 'website_entry', entityId: entry.id, entityName: entry.title,
      leadId: entry.leadId ?? undefined, details: { changed } as Prisma.InputJsonValue,
    } }),
  ])
  return { changed }
}

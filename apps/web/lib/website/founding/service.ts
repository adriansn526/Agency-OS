/**
 * Founding-partner places: a limited number per county × service category, claimed (first come, first served) when a firm accepts its preview.
 * Capacity, the price-lock period and the benefit text live in WebsiteChannel.config.founding and are edited in the UI. Disabled by default.
 * Claiming is serialised per county × category with an advisory lock, so two firms accepting at the same moment cannot overshoot the capacity.
 */
import { z } from 'zod'
import { db, Prisma } from '@repo/db'
import { CATEGORIES } from '../glossary/taxonomy'

export const foundingConfigSchema = z.object({
  enabled: z.boolean().default(false),
  perCombo: z.number().int().min(1).max(50).default(3),
  lockMonths: z.number().int().min(0).max(36).default(12),
  benefit: z.string().trim().max(240).default(''),
  /** the firm gets the "abonament" plan (direct requests complete and free) until its price lock ends */
  includeSubscription: z.boolean().default(true),
  /** shown to firms: the public monthly price, and the founder price that applies after the free period (0 = not shown) */
  subscriptionValueRon: z.number().int().min(0).max(10_000).default(0),
  subscriptionFounderRon: z.number().int().min(0).max(10_000).default(0),
  /** a place can be reviewed after this many days; it is released by the team, never automatically */
  graceDays: z.number().int().min(0).max(365).default(30),
  /** minimum profile completeness (0 = not checked) and unanswered requests tolerated (0 = not checked) */
  minProfileScore: z.number().int().min(0).max(100).default(80),
  maxMissedRequests: z.number().int().min(0).max(50).default(3),
})
export type FoundingConfig = z.infer<typeof foundingConfigSchema>

export function foundingConfig(channelConfig: unknown): FoundingConfig {
  const raw = (channelConfig as { founding?: unknown } | null)?.founding
  const r = foundingConfigSchema.safeParse(raw ?? {})
  return r.success ? r.data : foundingConfigSchema.parse({})
}

const titleOf = (slug: string) => CATEGORIES.find((c) => c.slug === slug)?.title ?? slug
const addMonths = (d: Date, m: number) => { const x = new Date(d); x.setMonth(x.getMonth() + m); return x }

export interface Combo { county: string; category: string; categoryTitle: string; total: number; taken: number; left: number }

export async function comboStatus(lineId: string, county: string, category: string, cfg: FoundingConfig): Promise<Combo> {
  const taken = await db.websiteFoundingSlot.count({ where: { businessLineId: lineId, county, category } })
  return { county, category, categoryTitle: titleOf(category), total: cfg.perCombo, taken, left: Math.max(0, cfg.perCombo - taken) }
}

export interface ClaimResult { enabled: boolean; claimed: Combo[]; full: Combo[]; /** the abonament plan granted with the places, ISO date it lasts until */ subscriptionUntil?: string }

/** Claims one place per service category the firm offers in its county (those already full are reported, never over-filled). Idempotent. */
export async function claimSlots(entry: { id: string; businessLineId: string; county: string | null; data: unknown }, now = new Date()): Promise<ClaimResult> {
  const channel = await db.websiteChannel.findUnique({ where: { businessLineId: entry.businessLineId }, select: { config: true } })
  const cfg = foundingConfig(channel?.config)
  const county = entry.county?.trim()
  const cats = Array.isArray((entry.data as { servicii?: unknown } | null)?.servicii) ? ((entry.data as { servicii: unknown[] }).servicii).map(String) : []
  if (!cfg.enabled || !county || !cats.length) return { enabled: cfg.enabled, claimed: [], full: [] }
  const claimed: Combo[] = [], full: Combo[] = []
  for (const category of cats) {
    await db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`founding:${entry.businessLineId}:${county}:${category}`}))`
      const mine = await tx.websiteFoundingSlot.findUnique({ where: { entryId_county_category: { entryId: entry.id, county, category } } })
      const taken = await tx.websiteFoundingSlot.count({ where: { businessLineId: entry.businessLineId, county, category } })
      const combo = (t: number): Combo => ({ county, category, categoryTitle: titleOf(category), total: cfg.perCombo, taken: t, left: Math.max(0, cfg.perCombo - t) })
      if (mine) { claimed.push(combo(taken)); return }
      if (taken >= cfg.perCombo) { full.push(combo(taken)); return }
      await tx.websiteFoundingSlot.create({ data: { businessLineId: entry.businessLineId, entryId: entry.id, county, category, claimedAt: now, lockUntil: cfg.lockMonths ? addMonths(now, cfg.lockMonths) : null } })
      claimed.push(combo(taken + 1))
    })
  }
  let subscriptionUntil: string | undefined
  if (claimed.length && cfg.includeSubscription && cfg.lockMonths > 0) subscriptionUntil = (await grantSubscription(entry.id))?.toISOString()
  return { enabled: true, claimed, full, ...(subscriptionUntil ? { subscriptionUntil } : {}) }
}

/** Founders get the abonament plan until their latest price lock ends; a longer plan the team set by hand is never shortened. */
async function grantSubscription(entryId: string): Promise<Date | null> {
  const slots = await db.websiteFoundingSlot.findMany({ where: { entryId, lockUntil: { not: null } }, select: { lockUntil: true } })
  const until = slots.reduce<Date | null>((m, x) => (x.lockUntil && (!m || x.lockUntil > m) ? x.lockUntil : m), null)
  if (!until) return null
  const e = await db.websiteEntry.findUnique({ where: { id: entryId }, select: { plan: true, planUntil: true } })
  if (!e) return null
  if (e.plan === 'abonament' && (!e.planUntil || e.planUntil >= until)) return e.planUntil
  await db.websiteEntry.update({ where: { id: entryId }, data: { plan: 'abonament', planUntil: until } })
  return until
}

/** What the programme gives and asks, as one sentence for the accept screen (empty when no subscription is included). */
export function subscriptionTerms(cfg: FoundingConfig): string {
  if (!cfg.includeSubscription || cfg.lockMonths <= 0) return ''
  const value = cfg.subscriptionValueRon > 0 ? ` (valoare ${cfg.subscriptionValueRon} lei/lună)` : ''
  const after = cfg.subscriptionFounderRon > 0 ? `, apoi ${cfg.subscriptionFounderRon} lei/lună, preț garantat` : ''
  const asks = [cfg.minProfileScore > 0 ? `profilul să rămână completat (minim ${cfg.minProfileScore}%)` : '', cfg.maxMissedRequests > 0 ? 'să răspundeți la cereri' : ''].filter(Boolean).join(' și ')
  return `Abonamentul${value} este gratuit ${cfg.lockMonths} luni${after}.${asks ? ` Locul se păstrează dacă ${asks}.` : ''}`
}

/** The sentence a campaign shows a firm: how many places are left for ITS first category with a free place, in ITS county. Empty when the programme is off, has no benefit text or is full. */
export async function founderOffer(lineId: string, entry: { county: string | null; data: unknown }, cfg: FoundingConfig): Promise<string> {
  const county = entry.county?.trim()
  const cats = Array.isArray((entry.data as { servicii?: unknown } | null)?.servicii) ? ((entry.data as { servicii: unknown[] }).servicii).map(String) : []
  if (!cfg.enabled || !cfg.benefit || !county) return ''
  for (const category of cats) {
    const c = await comboStatus(lineId, county, category, cfg)
    if (c.left > 0) return `Acum mai sunt ${c.left} din ${c.total} locuri de partener fondator pentru ${c.categoryTitle.toLowerCase()} în ${county}: ${cfg.benefit}`
  }
  return ''
}

/** Overview for the admin UI: every county × category that has at least one place taken, with who holds them. */
export async function overview(lineId: string) {
  const channel = await db.websiteChannel.findUnique({ where: { businessLineId: lineId }, select: { config: true } })
  const cfg = foundingConfig(channel?.config)
  const slots = await db.websiteFoundingSlot.findMany({ where: { businessLineId: lineId }, orderBy: [{ county: 'asc' }, { category: 'asc' }, { claimedAt: 'asc' }], include: { entry: { select: { id: true, title: true } } } })
  const groups = new Map<string, Combo & { firms: { slotId: string; entryId: string; title: string; claimedAt: string; lockUntil: string | null }[] }>()
  for (const s of slots) {
    const k = `${s.county}\u0000${s.category}`
    const g = groups.get(k) ?? { county: s.county, category: s.category, categoryTitle: titleOf(s.category), total: cfg.perCombo, taken: 0, left: 0, firms: [] }
    g.taken++; g.left = Math.max(0, cfg.perCombo - g.taken)
    g.firms.push({ slotId: s.id, entryId: s.entry.id, title: s.entry.title, claimedAt: s.claimedAt.toISOString(), lockUntil: s.lockUntil?.toISOString() ?? null })
    groups.set(k, g)
  }
  return { config: cfg, combos: [...groups.values()], totalSlots: slots.length, inactive: await inactiveSlots(lineId) }
}

export async function removeSlot(lineId: string, slotId: string) {
  const slot = await db.websiteFoundingSlot.findFirst({ where: { id: slotId, businessLineId: lineId }, select: { id: true, entryId: true, lockUntil: true } })
  if (!slot) return { removed: 0 }
  await db.websiteFoundingSlot.delete({ where: { id: slot.id } })
  // the plan that came with the place goes with it, unless the firm holds other places or the team gave it a longer plan
  const [left, e] = await Promise.all([db.websiteFoundingSlot.count({ where: { entryId: slot.entryId } }), db.websiteEntry.findUnique({ where: { id: slot.entryId }, select: { plan: true, planUntil: true } })])
  const founderPlan = e?.plan === 'abonament' && !!e.planUntil && !!slot.lockUntil && e.planUntil <= new Date(slot.lockUntil.getTime() + 86_400_000)
  if (!left && founderPlan) await db.websiteEntry.update({ where: { id: slot.entryId }, data: { plan: 'gratuit', planUntil: null } })
  return { removed: 1, planReverted: !left && founderPlan }
}

/** Profile completeness 0–100 (same weights as the firm's own dashboard). */
export function profileScore(e: { logoUrl: string | null; coverUrl: string | null; summary: string | null; body: string | null; data: unknown; projectsWithPhotos: number }): number {
  const d = (e.data ?? {}) as Record<string, unknown>
  const list = (v: unknown) => Array.isArray(v) && v.length > 0
  return (e.logoUrl ? 15 : 0) + ((e.summary ?? '').length >= 60 ? 10 : 0) + ((e.body ?? '').length >= 200 ? 15 : 0) + (list(d.servicii) ? 15 : 0)
    + (e.projectsWithPhotos >= 3 ? 25 : 0) + (d.program ? 5 : 0) + (list(d.certificari) ? 10 : 0) + (e.coverUrl ? 5 : 0)
}

/** Places whose firm, after the grace period, has an incomplete profile or leaves requests unanswered. For the team to review: nothing is released automatically. */
export async function inactiveSlots(lineId: string, now = new Date()) {
  const channel = await db.websiteChannel.findUnique({ where: { businessLineId: lineId }, select: { config: true } })
  const cfg = foundingConfig(channel?.config)
  if (!cfg.enabled || (!cfg.minProfileScore && !cfg.maxMissedRequests)) return []
  const slots = await db.websiteFoundingSlot.findMany({ where: { businessLineId: lineId, claimedAt: { lte: new Date(now.getTime() - cfg.graceDays * 86_400_000) } }, include: { entry: { select: { id: true, title: true, logoUrl: true, coverUrl: true, summary: true, body: true, data: true } } } })
  const since = new Date(now.getTime() - 60 * 86_400_000)
  const out: { slotId: string; entryId: string; title: string; county: string; category: string; categoryTitle: string; reasons: string[] }[] = []
  const cache = new Map<string, string[]>()
  for (const s of slots) {
    let reasons = cache.get(s.entryId)
    if (!reasons) {
      reasons = []
      if (cfg.minProfileScore) {
        const projects = await db.websiteEntry.findMany({ where: { parentId: s.entryId, status: 'published' }, select: { _count: { select: { media: true } } } })
        const score = profileScore({ ...s.entry, projectsWithPhotos: projects.filter((p) => p._count.media > 0).length })
        if (score < cfg.minProfileScore) reasons.push(`Profil completat ${score}% (minim ${cfg.minProfileScore}%)`)
      }
      if (cfg.maxMissedRequests) {
        const rows = await db.websiteRequestDelivery.findMany({ where: { entryId: s.entryId, sentAt: { gte: since } }, select: { status: true, request: { select: { expiresAt: true } } } })
        const missed = rows.filter((r) => r.status === 'expired' || (r.status === 'sent' && r.request.expiresAt <= now)).length
        const answered = rows.filter((r) => r.status === 'accepted' || r.status === 'declined').length
        if (missed >= cfg.maxMissedRequests && answered === 0) reasons.push(`${missed} cereri fără răspuns în ultimele 60 de zile`)
      }
      cache.set(s.entryId, reasons)
    }
    if (reasons.length) out.push({ slotId: s.id, entryId: s.entryId, title: s.entry.title, county: s.county, category: s.category, categoryTitle: titleOf(s.category), reasons })
  }
  return out
}

/** Saves the programme settings into the channel config (other config keys are kept). */
export async function saveConfig(lineId: string, raw: unknown) {
  const parsed = foundingConfigSchema.parse(raw)
  const ch = await db.websiteChannel.findUnique({ where: { businessLineId: lineId }, select: { id: true, config: true } })
  if (!ch) return null
  await db.websiteChannel.update({ where: { id: ch.id }, data: { config: { ...((ch.config ?? {}) as Record<string, unknown>), founding: parsed } as Prisma.InputJsonValue } })
  return parsed
}

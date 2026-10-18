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

export interface ClaimResult { enabled: boolean; claimed: Combo[]; full: Combo[] }

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
  return { enabled: true, claimed, full }
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
  return { config: cfg, combos: [...groups.values()], totalSlots: slots.length }
}

export async function removeSlot(lineId: string, slotId: string) {
  const r = await db.websiteFoundingSlot.deleteMany({ where: { id: slotId, businessLineId: lineId } })
  return { removed: r.count }
}

/** Saves the programme settings into the channel config (other config keys are kept). */
export async function saveConfig(lineId: string, raw: unknown) {
  const parsed = foundingConfigSchema.parse(raw)
  const ch = await db.websiteChannel.findUnique({ where: { businessLineId: lineId }, select: { id: true, config: true } })
  if (!ch) return null
  await db.websiteChannel.update({ where: { id: ch.id }, data: { config: { ...((ch.config ?? {}) as Record<string, unknown>), founding: parsed } as Prisma.InputJsonValue } })
  return parsed
}

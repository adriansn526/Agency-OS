import { db, Prisma } from '@repo/db'
import { AdminError } from '../admin/errors'
import { getTaxonomy } from '../glossary/live'
import { activeCmr, CMR_KEY, decodeCmr } from '../verification/cmr-data'
import { endorseInput, isCounted, MONTHLY_LIMIT, sharesClinic, visibilityInput, WINDOW_DAYS } from './rules'

type Doctor = { id: string; businessLineId: string; title: string; leadId?: string | null }
const DAY = 86_400_000
const cmrActive = (data: unknown, now: Date) => activeCmr(decodeCmr((data as Record<string, unknown> | null)?.[CMR_KEY]), now).length > 0

const audit = (d: Doctor, action: string, details: Record<string, unknown>) =>
  db.activity.create({ data: { businessLineId: d.businessLineId, userName: 'Partener (Profilul meu)', action, entityType: 'website_entry', entityId: d.id, entityName: d.title, leadId: d.leadId ?? undefined, details: details as Prisma.InputJsonValue } })

/** A doctor recommends a colleague (or updates an existing recommendation). Only published doctors with a valid CMR verification can recommend. */
export async function endorse(endorser: Doctor, raw: unknown, now = new Date()) {
  const input = endorseInput.parse(raw)
  const me = await db.websiteEntry.findUnique({ where: { id: endorser.id }, select: { id: true, businessLineId: true, title: true, status: true, data: true, slug: true } })
  if (!me || me.status !== 'published') throw new AdminError('Profilul tău trebuie să fie publicat ca să poți recomanda', 403)
  if (!cmrActive(me.data, now)) throw new AdminError('Poți recomanda doar după ce echipa a verificat dreptul tău de practică în Registrul CMR', 403)
  if (input.slug === me.slug) throw new AdminError('Nu te poți recomanda singur', 422)

  const target = await db.websiteEntry.findFirst({ where: { businessLineId: me.businessLineId, slug: input.slug, status: 'published', collection: { key: 'companii' } }, select: { id: true, title: true, data: true } })
  if (!target) throw new AdminError('Medicul nu există', 404)

  // "for" must be something the colleague really lists on the profile
  const listed = new Set(((target.data as { servicii?: unknown } | null)?.servicii as string[] | undefined) ?? [])
  const notListed = (input.servicii ?? []).filter((s) => !listed.has(s))
  if (notListed.length) throw new AdminError('Poți recomanda doar pentru ce face colegul, conform profilului lui', 422, notListed)

  const existing = await db.websiteEndorsement.findUnique({ where: { endorserId_endorseeId: { endorserId: me.id, endorseeId: target.id } } })
  if (existing?.status === 'removed') throw new AdminError('Această recomandare a fost scoasă de echipă', 403)
  const isNew = !existing || existing.status !== 'active'
  if (isNew) {
    const recent = await db.websiteEndorsement.count({ where: { endorserId: me.id, endorsedAt: { gt: new Date(now.getTime() - WINDOW_DAYS * DAY) }, ...(existing ? { id: { not: existing.id } } : {}) } })
    if (recent >= MONTHLY_LIMIT) throw new AdminError(`Poți face cel mult ${MONTHLY_LIMIT} recomandări noi la 30 de zile`, 429)
  }

  const data = { note: input.note || null, ...(input.showName !== undefined ? { showName: input.showName } : {}), ...(input.servicii !== undefined ? { forServicii: input.servicii } : {}), sameClinic: sharesClinic(me.data, target.data), status: 'active', ...(isNew ? { endorsedAt: now } : {}) }
  const row = await db.websiteEndorsement.upsert({
    where: { endorserId_endorseeId: { endorserId: me.id, endorseeId: target.id } },
    create: { businessLineId: me.businessLineId, endorserId: me.id, endorseeId: target.id, ...data, showName: input.showName ?? false, endorsedAt: now },
    update: data,
  })
  await audit(me, isNew ? 'endorsement_created' : 'endorsement_updated', { endorsee: target.id, endorseeTitle: target.title })
  return { id: row.id, endorsee: { slug: input.slug, title: target.title }, note: row.note, showName: row.showName, servicii: input.servicii ?? ((row.forServicii as string[] | null) ?? []), counted: !row.sameClinic }
}

export async function withdraw(endorser: Doctor, id: string) {
  const row = await db.websiteEndorsement.findFirst({ where: { id, endorserId: endorser.id, status: 'active' } })
  if (!row) throw new AdminError('Recomandarea nu există', 404)
  await db.websiteEndorsement.update({ where: { id }, data: { status: 'withdrawn' } })
  await audit(endorser, 'endorsement_withdrawn', { endorsee: row.endorseeId })
  return { withdrawn: id }
}

export async function setVisibility(endorser: Doctor, id: string, raw: unknown) {
  const { showName } = visibilityInput.parse(raw)
  const row = await db.websiteEndorsement.findFirst({ where: { id, endorserId: endorser.id, status: 'active' } })
  if (!row) throw new AdminError('Recomandarea nu există', 404)
  await db.websiteEndorsement.update({ where: { id }, data: { showName } })
  return { id, showName }
}

/** "Profilul meu": what this doctor recommended and what colleagues recommended about them (names only where the colleague agreed). */
export async function listMine(me: Doctor, now = new Date()) {
  const [given, receivedRows] = await Promise.all([
    db.websiteEndorsement.findMany({ where: { endorserId: me.id, status: 'active' }, orderBy: { endorsedAt: 'desc' }, include: { endorsee: { select: { slug: true, title: true } } } }),
    db.websiteEndorsement.count({ where: { endorseeId: me.id, status: 'active' } }),
  ])
  const summary = (await summaries(me.businessLineId, [me.id], now)).get(me.id)
  const since = new Date(now.getTime() - WINDOW_DAYS * DAY)
  const used = await db.websiteEndorsement.count({ where: { endorserId: me.id, endorsedAt: { gt: since } } })
  return {
    given: given.map((g) => ({ id: g.id, slug: g.endorsee.slug, title: g.endorsee.title, note: g.note, showName: g.showName, servicii: (g.forServicii as string[] | null) ?? [], counted: !g.sameClinic })),
    received: { total: receivedRows, counted: summary?.count ?? 0 },
    limit: { used, max: MONTHLY_LIMIT, windowDays: WINDOW_DAYS },
  }
}

export interface EndorsementSummary { count: number; items: { slug: string; title: string; specialty: string | null; note: string | null; servicii: { slug: string; title: string }[] }[] }

/** Public summary per endorsee: the counted endorsements and, of those, the ones whose author agreed to be named. */
export async function summaries(lineId: string, endorseeIds: string[], now = new Date()): Promise<Map<string, EndorsementSummary>> {
  const out = new Map<string, EndorsementSummary>()
  if (!endorseeIds.length) return out
  const rows = await db.websiteEndorsement.findMany({
    where: { businessLineId: lineId, endorseeId: { in: endorseeIds }, status: 'active', endorser: { status: 'published' } },
    orderBy: { endorsedAt: 'desc' },
    include: { endorser: { select: { slug: true, title: true, data: true } }, endorsee: { select: { data: true } } },
  })
  const tax = await getTaxonomy(lineId)
  const back = await db.websiteEndorsement.findMany({ where: { businessLineId: lineId, endorserId: { in: endorseeIds }, status: 'active' }, select: { endorserId: true, endorseeId: true } })
  const backSet = new Set(back.map((b) => `${b.endorserId}>${b.endorseeId}`))
  for (const r of rows) {
    if (!isCounted({ endorserId: r.endorserId, endorseeId: r.endorseeId, sameClinic: r.sameClinic, endorserCmrActive: cmrActive(r.endorser.data, now) }, backSet)) continue
    const s = out.get(r.endorseeId) ?? { count: 0, items: [] }
    s.count++
    if (r.showName) {
      // only areas the colleague still lists, with their titles
      const listed = new Set(((r.endorsee.data as { servicii?: unknown } | null)?.servicii as string[] | undefined) ?? [])
      const servicii = ((r.forServicii as string[] | null) ?? []).filter((x) => listed.has(x)).map((x) => ({ slug: x, title: tax.categories.find((c) => c.slug === x)?.title ?? x }))
      s.items.push({ slug: r.endorser.slug, title: r.endorser.title, specialty: String((r.endorser.data as { specializare?: unknown } | null)?.specializare ?? '') || null, note: r.note, servicii })
    }
    out.set(r.endorseeId, s)
  }
  return out
}

// ─── team side ───────────────────────────────────────────────────

export async function adminList(lineId: string, page = 1) {
  const take = 30
  const [rows, total] = await Promise.all([
    db.websiteEndorsement.findMany({ where: { businessLineId: lineId }, orderBy: { createdAt: 'desc' }, skip: (Math.max(1, page) - 1) * take, take, include: { endorser: { select: { title: true } }, endorsee: { select: { title: true } } } }),
    db.websiteEndorsement.count({ where: { businessLineId: lineId } }),
  ])
  return { total, items: rows.map((r) => ({ id: r.id, endorser: r.endorser.title, endorsee: r.endorsee.title, note: r.note, status: r.status, showName: r.showName, sameClinic: r.sameClinic, removedReason: r.removedReason, endorsedAt: r.endorsedAt.toISOString() })) }
}

/** The team removes an endorsement (abuse, a rejected claim): the endorser cannot make it again. */
export async function adminRemove(lineId: string, id: string, reason: string, user: { id?: string | null; name?: string | null }) {
  const row = await db.websiteEndorsement.findFirst({ where: { id, businessLineId: lineId }, include: { endorser: { select: { id: true, title: true } } } })
  if (!row) throw new AdminError('Recomandarea nu există', 404)
  await db.websiteEndorsement.update({ where: { id }, data: { status: 'removed', removedReason: reason.trim().slice(0, 300) || null } })
  await db.activity.create({ data: { businessLineId: lineId, userId: user.id ?? 'system', userName: user.name ?? 'System', action: 'endorsement_removed', entityType: 'website_entry', entityId: row.endorser.id, entityName: row.endorser.title, details: { endorsementId: id, reason } as Prisma.InputJsonValue } })
  return { removed: id }
}

/**
 * Medical claims a doctor proposes from "Profilul meu" (specialty, procedures, sub-specialities, parafa code) wait for the team: the public
 * profile keeps showing the values already checked. The team approves (the proposal replaces the live values) or rejects (it is dropped).
 */
import { db, Prisma } from '@repo/db'
import { AdminError } from '../admin/errors'
import { assertLine } from '../admin/service'
import { getTaxonomy, invalidateTaxonomy, unknownCategories } from '../glossary/live'
import { GATED_KEYS, PENDING_KEY, parsePending, type Gated } from './profile'

type User = { id?: string | null; name?: string | null }

async function entryOf(lineId: string, id: string) {
  await assertLine(lineId)
  const e = await db.websiteEntry.findFirst({ where: { id, businessLineId: lineId, collection: { key: 'companii' } }, select: { id: true, title: true, data: true, leadId: true } })
  if (!e) throw new AdminError('Medicul nu există', 404)
  return e
}

export async function getPending(lineId: string, entryId: string) {
  const e = await entryOf(lineId, entryId)
  const d = (e.data ?? {}) as Record<string, unknown>
  const proposed = parsePending(d[PENDING_KEY])
  const tax = await getTaxonomy(lineId)
  const title = (slug: string) => tax.categories.find((c) => c.slug === slug)?.title ?? slug
  const live: Record<string, unknown> = Object.fromEntries(GATED_KEYS.map((k) => [k, d[k] ?? null]))
  return { proposed: proposed ? Object.fromEntries(GATED_KEYS.filter((k) => k in proposed).map((k) => [k, (proposed as Record<string, unknown>)[k]])) : null, at: proposed?.at ?? null, live, titles: Object.fromEntries(tax.categories.map((c) => [c.slug, title(c.slug)])) }
}

const audit = (lineId: string, user: User, action: string, e: { id: string; title: string; leadId: string | null }, details: Record<string, unknown>) =>
  db.activity.create({ data: { businessLineId: lineId, userId: user.id ?? 'system', userName: user.name ?? 'System', action, entityType: 'website_entry', entityId: e.id, entityName: e.title, leadId: e.leadId ?? undefined, details: details as Prisma.InputJsonValue } })

export async function approvePending(lineId: string, entryId: string, user: User) {
  const e = await entryOf(lineId, entryId)
  const d = { ...((e.data ?? {}) as Record<string, unknown>) }
  const proposed = parsePending(d[PENDING_KEY])
  if (!proposed) throw new AdminError('Nu există modificări în așteptare', 404)
  const slugs = Array.isArray(proposed.servicii) ? proposed.servicii : []
  const bad = unknownCategories(await getTaxonomy(lineId), slugs)
  if (bad.length) throw new AdminError(`Categorii necunoscute în propunere: ${bad.join(', ')}`, 422)
  const applied: string[] = []
  for (const k of GATED_KEYS) {
    if (!(k in proposed)) continue
    const v = (proposed as Record<string, unknown>)[k]
    if (v === null || (Array.isArray(v) && v.length === 0)) delete d[k]; else d[k] = v
    applied.push(k)
  }
  delete d[PENDING_KEY]
  await db.websiteEntry.update({ where: { id: e.id }, data: { data: d as Prisma.InputJsonValue } })
  await audit(lineId, user, 'partner_changes_approved', e, { applied })
  invalidateTaxonomy(lineId)
  return { approved: applied }
}

export async function rejectPending(lineId: string, entryId: string, user: User, reason?: string) {
  const e = await entryOf(lineId, entryId)
  const d = { ...((e.data ?? {}) as Record<string, unknown>) }
  if (!parsePending(d[PENDING_KEY])) throw new AdminError('Nu există modificări în așteptare', 404)
  delete d[PENDING_KEY]
  await db.websiteEntry.update({ where: { id: e.id }, data: { data: d as Prisma.InputJsonValue } })
  await audit(lineId, user, 'partner_changes_rejected', e, { reason: reason?.slice(0, 300) })
  return { rejected: true }
}

export type { Gated }

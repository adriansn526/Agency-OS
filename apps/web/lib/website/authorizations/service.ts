/**
 * Verified authorizations of a firm. They are written ONLY by the team after checking the register (never by the firm), stored in the entry's
 * data (key autorizatii_verificate, one JSON string per authorization) and shown on the public profile as "verificat de IntraConstruct" until they expire.
 */
import { db, Prisma } from '@repo/db'
import { AdminError } from '../admin/errors'
import { assertLine } from '../admin/service'
import { registerName, resolveOperator, searchOperators, ANRE_PUBLIC_LIST, type AnreOperator } from './anre'

export const VERIFIED_KEY = 'autorizatii_verificate'

export interface VerifiedAuth { issuer: 'ANRE'; type: string; number: string; issued: string; expires: string; verifiedAt: string; verifiedBy: string; operator: string; source: string }

/** Stored as short pipe-separated strings (list items are limited in length): issuer|type|number|issued|expires|verifiedAt|verifiedBy|operator */
const clean = (v: string) => v.replace(/[|\n\r]/g, ' ').trim().slice(0, 40)
export const encodeVerified = (a: VerifiedAuth) => [a.issuer, a.type, a.number, a.issued, a.expires, a.verifiedAt.slice(0, 10), clean(a.verifiedBy), clean(a.operator)].join('|')
export function decodeVerified(list: unknown): VerifiedAuth[] {
  if (!Array.isArray(list)) return []
  const out: VerifiedAuth[] = []
  for (const s of list) {
    const p = String(s).split('|')
    if (p.length === 8 && p[0] === 'ANRE' && p[1] && /^\d+$/.test(p[2]!) && /^\d{4}-\d{2}-\d{2}$/.test(p[3]!) && /^\d{4}-\d{2}-\d{2}$/.test(p[4]!)) out.push({ issuer: 'ANRE', type: p[1], number: p[2]!, issued: p[3]!, expires: p[4]!, verifiedAt: p[5]!, verifiedBy: p[6]!, operator: p[7]!, source: ANRE_PUBLIC_LIST })
  }
  return out
}
/** Authorizations that are still valid on `now` (a verification does not outlive the expiry date printed on it). */
export const activeVerified = (list: VerifiedAuth[], now = new Date()) => list.filter((a) => a.expires >= now.toISOString().slice(0, 10))

type Deps = { search: (q: string, county?: string) => Promise<AnreOperator[]>; resolve: (ref: string) => Promise<AnreOperator | null> }
const live: Deps = { search: (q, county) => searchOperators(q, county), resolve: (ref) => resolveOperator(ref) }

async function entryOf(lineId: string, id: string) {
  await assertLine(lineId)
  const e = await db.websiteEntry.findFirst({ where: { id, businessLineId: lineId, collection: { key: 'companii' } }, select: { id: true, title: true, data: true, leadId: true, collectionId: true } })
  if (!e) throw new AdminError('Firma nu există', 404)
  return e
}

/** Candidates from the register for the team to compare (name, address, representative, authorizations). Nothing is saved. */
export async function searchAnre(lineId: string, entryId: string, query: string | undefined, county: string | undefined, deps: Deps = live): Promise<{ query: string; operators: AnreOperator[]; current: VerifiedAuth[] }> {
  const e = await entryOf(lineId, entryId)
  const q = (query ?? '').trim() || registerName(e.title)
  const operators = await deps.search(q, county)
  return { query: q, operators, current: decodeVerified((e.data as Record<string, unknown> | null)?.[VERIFIED_KEY]) }
}

/** The team confirmed that this register operator is the firm: its currently valid, granted authorizations are re-read from the register and stored. */
export async function confirmAnre(lineId: string, entryId: string, ref: string, user: { id?: string | null; name?: string | null }, deps: Deps = live, now = new Date()) {
  const e = await entryOf(lineId, entryId)
  const op = await deps.resolve(ref)
  if (!op) throw new AdminError('Operatorul nu există în registrul ANRE', 404)
  const today = now.toISOString().slice(0, 10)
  const valid = op.authorizations.filter((a) => /acordat/i.test(a.state) && a.expires >= today)
  if (!valid.length) throw new AdminError('Operatorul nu are autorizații valide în registru', 422)
  const items: VerifiedAuth[] = valid.map((a) => ({ issuer: 'ANRE', type: a.type, number: a.number, issued: a.issued, expires: a.expires, verifiedAt: now.toISOString(), verifiedBy: user.name ?? 'echipa', operator: op.name, source: ANRE_PUBLIC_LIST }))
  const prev = decodeVerified((e.data as Record<string, unknown> | null)?.[VERIFIED_KEY]).filter((a) => a.issuer !== 'ANRE')
  await ensureField(e.collectionId)
  await db.websiteEntry.update({ where: { id: e.id }, data: { data: { ...((e.data ?? {}) as Record<string, unknown>), [VERIFIED_KEY]: [...prev, ...items].map(encodeVerified) } as Prisma.InputJsonValue } })
  await db.activity.create({ data: { businessLineId: lineId, userId: user.id ?? 'system', userName: user.name ?? 'System', action: 'authorizations_verified', entityType: 'website_entry', entityId: e.id, entityName: e.title, leadId: e.leadId ?? undefined, details: { issuer: 'ANRE', operator: op.name, representative: op.representative, address: op.address, authorizations: valid.map((a) => ({ type: a.type, number: a.number, expires: a.expires })) } as Prisma.InputJsonValue } })
  return { verified: items }
}

export async function removeVerified(lineId: string, entryId: string, number: string, user: { id?: string | null; name?: string | null }) {
  const e = await entryOf(lineId, entryId)
  const all = decodeVerified((e.data as Record<string, unknown> | null)?.[VERIFIED_KEY])
  const left = all.filter((a) => a.number !== number)
  if (left.length === all.length) throw new AdminError('Autorizația nu există', 404)
  await db.websiteEntry.update({ where: { id: e.id }, data: { data: { ...((e.data ?? {}) as Record<string, unknown>), [VERIFIED_KEY]: left.map(encodeVerified) } as Prisma.InputJsonValue } })
  await db.activity.create({ data: { businessLineId: lineId, userId: user.id ?? 'system', userName: user.name ?? 'System', action: 'authorization_removed', entityType: 'website_entry', entityId: e.id, entityName: e.title, leadId: e.leadId ?? undefined, details: { number } as Prisma.InputJsonValue } })
  return { removed: number }
}

/** The collection must declare the field, otherwise saving the entry in the admin would drop it (unknown keys are cleaned away). */
export async function ensureField(collectionId: string) {
  const c = await db.websiteCollection.findUnique({ where: { id: collectionId }, select: { fields: true } })
  const fields = (Array.isArray(c?.fields) ? c!.fields : []) as { key: string }[]
  if (fields.some((f) => f.key === VERIFIED_KEY)) return
  await db.websiteCollection.update({ where: { id: collectionId }, data: { fields: [...fields, { key: VERIFIED_KEY, label: 'Autorizații verificate (completat de echipă)', type: 'list' }] as unknown as Prisma.InputJsonValue } })
}

/**
 * Verification of a doctor's right to practise against the CMR public register (https://regmed.cmr.ro).
 *
 * The register can only be queried through its web page: every request needs a reCAPTCHA token, so the platform does NOT query it
 * automatically. The team searches the register by name, compares it with the profile and records what it shows here. Doctors cannot write
 * this field. It is stored in the entry's data (key verificare_cmr, one pipe-separated string) and shown on the public profile as
 * "verificat în Registrul CMR" only while the recorded practice right (the annual aviz) has not expired.
 */
import { db, Prisma } from '@repo/db'
import { AdminError } from '../admin/errors'
import { activeCmr, CMR_KEY, CMR_REGISTER_URL, cmrInput, decodeCmr, encodeCmr, type CmrVerification } from './cmr-data'

export * from './cmr-data'
import { assertLine } from '../admin/service'

async function entryOf(lineId: string, id: string) {
  await assertLine(lineId)
  const e = await db.websiteEntry.findFirst({ where: { id, businessLineId: lineId, collection: { key: 'companii' } }, select: { id: true, title: true, data: true, collectionId: true } })
  if (!e) throw new AdminError('Medicul nu există', 404)
  return e
}

/** The collection must declare the field, otherwise saving the entry in the admin would drop it (unknown keys are cleaned away). */
export async function ensureCmrField(collectionId: string) {
  const c = await db.websiteCollection.findUnique({ where: { id: collectionId }, select: { fields: true } })
  const fields = (Array.isArray(c?.fields) ? c!.fields : []) as { key: string }[]
  if (fields.some((f) => f.key === CMR_KEY)) return
  await db.websiteCollection.update({ where: { id: collectionId }, data: { fields: [...fields, { key: CMR_KEY, label: 'Verificare CMR (completat de echipă)', type: 'list' }] as unknown as Prisma.InputJsonValue } })
}

type User = { id?: string | null; name?: string | null }
const log = (lineId: string, user: User, action: string, e: { id: string; title: string }, details: Record<string, unknown>) =>
  db.activity.create({ data: { businessLineId: lineId, userId: user.id ?? 'system', userName: user.name ?? 'System', action, entityType: 'website_entry', entityId: e.id, entityName: e.title, details: details as Prisma.InputJsonValue } })

export async function getCmr(lineId: string, entryId: string) {
  const e = await entryOf(lineId, entryId)
  return { registerUrl: CMR_REGISTER_URL, current: decodeCmr((e.data as Record<string, unknown> | null)?.[CMR_KEY]) }
}

/** The team read the register entry and confirms it is this doctor: one verification per profile (a new one replaces the old). */
export async function confirmCmr(lineId: string, entryId: string, raw: unknown, user: User, now = new Date()) {
  const e = await entryOf(lineId, entryId)
  const input = cmrInput.parse(raw)
  if (input.practiceUntil < now.toISOString().slice(0, 10)) throw new AdminError('Dreptul de practică din registru a expirat; nu se poate marca ca verificat', 422)
  const v: CmrVerification = { name: input.name, county: input.county, specialities: input.specialities, practiceUntil: input.practiceUntil, parafa: input.parafa, verifiedAt: now.toISOString(), verifiedBy: user.name ?? 'echipa' }
  await ensureCmrField(e.collectionId)
  await db.websiteEntry.update({ where: { id: e.id }, data: { data: { ...((e.data ?? {}) as Record<string, unknown>), [CMR_KEY]: [encodeCmr(v)] } as Prisma.InputJsonValue } })
  await log(lineId, user, 'cmr_verified', e, { practiceUntil: v.practiceUntil, parafa: v.parafa || undefined })
  return { verified: v }
}

export async function removeCmr(lineId: string, entryId: string, user: User) {
  const e = await entryOf(lineId, entryId)
  const data = { ...((e.data ?? {}) as Record<string, unknown>) }
  if (!decodeCmr(data[CMR_KEY]).length) throw new AdminError('Medicul nu are verificare CMR', 404)
  delete data[CMR_KEY]
  await db.websiteEntry.update({ where: { id: e.id }, data: { data: data as Prisma.InputJsonValue } })
  await log(lineId, user, 'cmr_verification_removed', e, {})
  return { removed: true }
}

/** "Nu mai doriți mesaje": marks every lead of the line with that email or phone as opted out of commercial messages. Always answers the same way. */
import { db } from '@repo/db'
import { nationalPhone } from '../prospectare/import-mapping'

export type OptOutResult = { matched: number }

export async function optOut(lineId: string, rawIdentifier: unknown, now = new Date()): Promise<OptOutResult> {
  const s = String(rawIdentifier ?? '').trim()
  if (!s || s.length > 200) return { matched: 0 }
  const isEmail = s.includes('@')
  const email = isEmail && /^[^@\s]+@[^@\s]+\.[A-Za-z]{2,24}$/.test(s) ? s.toLowerCase() : null
  const phone = isEmail ? null : nationalPhone(s)
  if (!email && !phone) return { matched: 0 }
  const where = email
    ? { businessLineId: lineId, optOut: false, OR: [{ email: { equals: email, mode: 'insensitive' as const } }, { email2: { equals: email, mode: 'insensitive' as const } }] }
    : { businessLineId: lineId, optOut: false, OR: [{ phone }, { phone2: phone }, { phone3: phone }] }
  const leads = await db.lead.findMany({ where, select: { id: true, companyName: true } })
  if (!leads.length) return { matched: 0 }
  await db.$transaction([
    db.lead.updateMany({ where: { id: { in: leads.map((l) => l.id) } }, data: { optOut: true } }),
    ...leads.map((l) => db.activity.create({ data: { businessLineId: lineId, userName: 'Destinatar (dezabonare)', action: 'lead_opt_out', entityType: 'lead', entityId: l.id, entityName: l.companyName, leadId: l.id, details: { by: email ? 'email' : 'telefon', at: now.toISOString() }, createdAt: now } })),
  ])
  return { matched: leads.length }
}

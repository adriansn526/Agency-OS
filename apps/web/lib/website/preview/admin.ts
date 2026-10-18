/** What the team sees about a firm's private preview, and a way to issue its link. The link itself is never stored (only its hash), so it can only be shown at the moment it is generated. */
import { db, Prisma } from '@repo/db'
import { AdminError } from '../admin/errors'
import { assertLine } from '../admin/service'
import { issuePreview } from './service'

const siteOf = async (lineId: string) => ((await db.websiteChannel.findUnique({ where: { businessLineId: lineId }, select: { siteUrl: true } }))?.siteUrl || process.env.NEXT_PUBLIC_SITE_URL || 'https://intraconstruct.ro').replace(/\/$/, '')

const str = (v: unknown) => (typeof v === 'string' && v ? v : null)

export async function previewStatus(lineId: string, entryId: string, now = new Date()) {
  await assertLine(lineId)
  const e = await db.websiteEntry.findFirst({ where: { id: entryId, businessLineId: lineId }, select: { id: true, slug: true, status: true, previewSentAt: true, previewExpiresAt: true, previewTokenHash: true, leadId: true } })
  if (!e) throw new AdminError('Intrarea nu există', 404)
  const lead = e.leadId ? await db.lead.findUnique({ where: { id: e.leadId }, select: { customFields: true } }) : null
  const cf = (lead?.customFields ?? {}) as Record<string, unknown>
  const site = await siteOf(lineId)
  return {
    status: e.status, publicUrl: e.status === 'published' ? `${site}/companii/${e.slug}` : null,
    link: { active: e.status === 'preview' && !!e.previewTokenHash && !!e.previewExpiresAt && e.previewExpiresAt > now, issuedAt: e.previewSentAt?.toISOString() ?? null, expiresAt: e.previewExpiresAt?.toISOString() ?? null },
    views: typeof cf.previzualizari === 'number' ? cf.previzualizari : 0, firstViewAt: str(cf.previzualizare_vazuta_la), lastViewAt: str(cf.ultima_previzualizare_la),
    answer: str(cf.preview_raspuns), answerAt: str(cf.preview_raspuns_la),
  }
}

/** Issues a NEW link (the previous one stops working) and returns it together with the direct link to the answer (accept / changes / decline) page. */
export async function generatePreviewLink(lineId: string, entryId: string, user: { id?: string | null; name?: string | null }, now = new Date()) {
  await assertLine(lineId)
  const r = await issuePreview(lineId, entryId, { now })
  const site = await siteOf(lineId)
  const e = await db.websiteEntry.findUniqueOrThrow({ where: { id: entryId }, select: { title: true, leadId: true } })
  await db.activity.create({ data: { businessLineId: lineId, userId: user.id ?? 'system', userName: user.name ?? 'System', action: 'note', entityType: 'website_entry', entityId: entryId, entityName: e.title, leadId: e.leadId ?? undefined, details: { note: `Link de previzualizare generat (valabil ${r.days} zile)` } as Prisma.InputJsonValue } })
  return { link: `${site}/p/${r.token}`, answerLink: `${site}/previzualizare/${r.token}/raspuns`, expiresAt: r.expiresAt.toISOString(), days: r.days }
}

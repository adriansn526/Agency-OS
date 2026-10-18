/** A firm cannot find its service: it suggests one. The suggestion is an activity entry the team sees in Marketing → Website and answers by creating the service. */
import { z } from 'zod'
import { db, Prisma } from '@repo/db'
import { AdminError } from '../admin/errors'

export const suggestionInput = z.object({ title: z.string().trim().min(3).max(80), note: z.string().trim().max(300).optional() }).strict()
export const MAX_PER_DAY = 5

type Parent = { id: string; businessLineId: string; title: string; leadId: string | null }

export async function suggestService(parent: Parent, raw: unknown, notify?: (subject: string, text: string) => Promise<void>, now = new Date()) {
  const p = suggestionInput.safeParse(raw)
  if (!p.success) throw new AdminError('Date invalide', 422, p.error.issues.map((i) => `${i.path.join('.') || 'cerere'}: ${i.message}`))
  const recent = await db.activity.count({ where: { entityId: parent.id, action: 'partner_service_suggestion', createdAt: { gt: new Date(now.getTime() - 86_400_000) } } })
  if (recent >= MAX_PER_DAY) throw new AdminError('Ai trimis deja mai multe sugestii azi. Scrie-ne direct.', 429)
  await db.activity.create({ data: { businessLineId: parent.businessLineId, userName: 'Partener (Profilul meu)', action: 'partner_service_suggestion', entityType: 'website_entry', entityId: parent.id, entityName: parent.title, leadId: parent.leadId ?? undefined, details: { title: p.data.title, note: p.data.note ?? null } as Prisma.InputJsonValue, createdAt: now } })
  await notify?.(`Sugestie de serviciu: ${p.data.title}`, `${parent.title} sugerează serviciul „${p.data.title}”.${p.data.note ? `\nNotă: ${p.data.note}` : ''}`).catch(() => undefined)
  return { ok: true }
}

export interface PendingSuggestion { id: string; title: string; note: string | null; firm: string; entryId: string; at: string }

/** Open suggestions, newest first; "done" ones (answered by the team) are left out. */
export async function pendingSuggestions(lineId: string, limit = 50): Promise<PendingSuggestion[]> {
  const rows = await db.activity.findMany({ where: { businessLineId: lineId, action: 'partner_service_suggestion' }, orderBy: { createdAt: 'desc' }, take: 200 })
  const done = new Set((await db.activity.findMany({ where: { businessLineId: lineId, action: 'partner_service_suggestion_done' }, select: { details: true }, take: 500 })).map((a) => String((a.details as { suggestionId?: unknown } | null)?.suggestionId ?? '')))
  return rows.filter((r) => !done.has(r.id)).slice(0, limit).map((r) => { const d = (r.details ?? {}) as { title?: string; note?: string | null }; return { id: r.id, title: d.title ?? '', note: d.note ?? null, firm: r.entityName, entryId: r.entityId, at: r.createdAt.toISOString() } })
}

export async function markDone(lineId: string, id: string) {
  const s = await db.activity.findFirst({ where: { id, businessLineId: lineId, action: 'partner_service_suggestion' }, select: { id: true, entityId: true, entityName: true } })
  if (!s) throw new AdminError('Sugestia nu există', 404)
  await db.activity.create({ data: { businessLineId: lineId, userName: 'Echipă', action: 'partner_service_suggestion_done', entityType: 'website_entry', entityId: s.entityId, entityName: s.entityName, details: { suggestionId: s.id } as Prisma.InputJsonValue } })
  return { ok: true }
}

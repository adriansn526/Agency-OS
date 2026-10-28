/** A partner asks to move the mini-site to its own domain (a paid service). The request is recorded for the team; DNS and certificates are set up by hand for now. */
import { z } from 'zod'
import { db, Prisma } from '@repo/db'
import { AdminError } from '../admin/errors'

const DOMAIN_RE = /^(?=.{4,253}$)(?!-)([a-z0-9-]{1,63}(?<!-)\.)+[a-z]{2,24}$/

/** The platform's own sites cannot be claimed as a partner's domain. */
const RESERVED = /(^|\.)(intraconstruct|topdoctori|doctorchirurg|omniamed)\.ro$/

export function parseDomain(raw: unknown): string | null {
  const v = String(raw ?? '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '')
  return DOMAIN_RE.test(v) && !RESERVED.test(v) ? v : null
}

export const domainRequestInput = z.object({ domain: z.unknown(), note: z.string().trim().max(500).optional() })

type Parent = { id: string; businessLineId: string; title: string; leadId: string | null }

export async function lastDomainRequest(entryId: string) {
  const a = await db.activity.findFirst({ where: { entityId: entryId, action: 'partner_domain_request' }, orderBy: { createdAt: 'desc' }, select: { details: true, createdAt: true } })
  const d = (a?.details ?? {}) as { domain?: string }
  return a && d.domain ? { domain: d.domain, at: a.createdAt.toISOString() } : null
}

export async function requestDomain(parent: Parent, raw: unknown, notify?: (subject: string, text: string) => Promise<void>, now = new Date()) {
  const body = domainRequestInput.safeParse(raw)
  const domain = body.success ? parseDomain(body.data.domain) : null
  if (!domain) throw new AdminError('Domeniu invalid (exemplu: firma.ro)', 422)
  const recent = await db.activity.count({ where: { entityId: parent.id, action: 'partner_domain_request', createdAt: { gt: new Date(now.getTime() - 86_400_000) } } })
  if (recent >= 3) throw new AdminError('Ai trimis deja mai multe cereri azi. Scrie-ne direct.', 429)
  await db.$transaction([
    db.activity.create({ data: { businessLineId: parent.businessLineId, userName: 'Partener (Profilul meu)', action: 'partner_domain_request', entityType: 'website_entry', entityId: parent.id, entityName: parent.title, leadId: parent.leadId ?? undefined, details: { domain, note: body.success ? body.data.note ?? null : null } as Prisma.InputJsonValue, createdAt: now } }),
    ...(parent.leadId ? [db.$executeRaw`UPDATE "Lead" SET "customFields" = coalesce("customFields", '{}'::jsonb) || ${JSON.stringify({ domeniu_cerut: domain })}::jsonb WHERE "id" = ${parent.leadId}`] : []),
  ])
  await notify?.(`Cerere domeniu propriu: ${parent.title}`, `${parent.title} cere mini-site-ul pe domeniul ${domain}.${body.success && body.data.note ? `\nNotă: ${body.data.note}` : ''}\nProfil: ${parent.id}`).catch((e) => console.error('[partner-domain] notify failed', e instanceof Error ? e.message : e))
  return { domain, at: now.toISOString() }
}

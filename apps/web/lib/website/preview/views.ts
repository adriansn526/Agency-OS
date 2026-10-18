/**
 * Tracking of private preview links: who opened which firm's page, how often and when.
 *
 * A view is reported by the BROWSER (the page stays visible for a moment), not by the page request: messaging apps, antivirus and link scanners fetch links
 * without running scripts, and their user agents are ignored as well. Reloads within 10 minutes count as one visit. Everything is kept on the lead
 * (customFields: previzualizari, ultima_previzualizare_la, previzualizare_vazuta_la) and in its timeline; the first visit and a return after
 * 12+ hours also go to Telegram.
 */
import { db, Prisma } from '@repo/db'
import { lookupPreview } from './service'
import { esc, leadUrl, sendIntraconstructTelegram } from '@/lib/notifications/intraconstruct-telegram'

const SAME_VISIT_MS = 10 * 60_000
const RETURN_GAP_MS = 12 * 3_600_000

const BOT_RE = /bot\b|bot[\/;)\s]|crawl|spider|slurp|preview|facebookexternalhit|facebot|whatsapp|telegrambot|slackbot|discord|linkedin|twitter|skype|googlebot|google-read-aloud|googleother|google-inspectiontool|apis-google|bingpreview|yandex|duckduck|headless|phantom|lighthouse|pingdom|uptime|curl\/|wget|python|java\/|go-http|okhttp\/|libwww|httpclient|scan|virus|safelink|mimecast|proofpoint|barracuda|symantec|trend ?micro|kaspersky/i
export const isBot = (userAgent: string | null | undefined) => !userAgent || userAgent.length < 20 || BOT_RE.test(userAgent)

export type ViewResult = { counted: false; reason: 'bot' | 'invalid' | 'expired' | 'no_lead' | 'same_visit' } | { counted: true; first: boolean; returning: boolean; count: number }

export async function recordPreviewView(lineId: string, token: string, o: { userAgent?: string | null; now?: Date; notify?: boolean } = {}): Promise<ViewResult> {
  const now = o.now ?? new Date()
  if (isBot(o.userAgent)) return { counted: false, reason: 'bot' }
  const found = await lookupPreview(lineId, token, now)
  if (found.state !== 'ok') return { counted: false, reason: found.state }
  const leadId = found.entry.leadId
  if (!leadId) return { counted: false, reason: 'no_lead' }

  const iso = now.toISOString(), cutoff = new Date(now.getTime() - SAME_VISIT_MS).toISOString()
  // one statement: reads the previous visit, writes the new counters, and does nothing when the previous visit is under 10 minutes old
  const rows = await db.$queryRaw<{ prev: string | null; count: number }[]>(Prisma.sql`
    WITH prev AS (SELECT id, "customFields"->>'ultima_previzualizare_la' AS last FROM "Lead" WHERE id = ${leadId} FOR UPDATE)
    UPDATE "Lead" l SET "customFields" = COALESCE(l."customFields", '{}'::jsonb) || jsonb_build_object(
        'previzualizari', COALESCE(NULLIF(l."customFields"->>'previzualizari', '')::int, 0) + 1,
        'ultima_previzualizare_la', ${iso}::text,
        'previzualizare_vazuta_la', COALESCE(NULLIF(l."customFields"->>'previzualizare_vazuta_la', ''), ${iso}::text))
    FROM prev WHERE l.id = prev.id AND (prev.last IS NULL OR prev.last < ${cutoff})
    RETURNING prev.last AS prev, (l."customFields"->>'previzualizari')::int AS count`)
  const row = rows[0]
  if (!row) return { counted: false, reason: 'same_visit' }
  const first = !row.prev
  const returning = !first && now.getTime() - new Date(row.prev!).getTime() >= RETURN_GAP_MS
  if (first || returning) await announce(leadId, { first, count: row.count }, o.notify !== false)
  return { counted: true, first, returning, count: row.count }
}

async function announce(leadId: string, v: { first: boolean; count: number }, notify: boolean) {
  try {
    const lead = await db.lead.findUnique({ where: { id: leadId }, select: { id: true, companyName: true, city: true, county: true, phone: true, businessLineId: true } })
    if (!lead) return
    const note = v.first ? 'A deschis pagina de previzualizare' : `A revenit pe pagina de previzualizare (vizita ${v.count})`
    await db.activity.create({ data: { businessLineId: lead.businessLineId, userId: 'system', userName: 'System', action: 'note', entityType: 'lead', entityId: lead.id, entityName: lead.companyName, leadId: lead.id, details: { note } as Prisma.InputJsonValue } })
    if (notify) {
      const where = [lead.city, lead.county].filter(Boolean).join(', ')
      await sendIntraconstructTelegram(`${v.first ? '👀' : '🔁'} <b>${esc(lead.companyName)}</b>\n${esc(note)}${where ? `\n${esc(where)}` : ''}${lead.phone ? ` · ${esc(lead.phone)}` : ''}\n<i>Acum e un moment bun să suni.</i>`, { button: { text: 'Deschide în CRM', url: leadUrl(lead.id) } })
    }
  } catch (e) { console.error('[preview-views] announce', e instanceof Error ? e.message : e) }
}

/** Telegram message when the firm answers the preview (accept / changes / decline). */
export async function announceAnswer(leadId: string, companyName: string, action: 'accept' | 'changes' | 'decline', detail?: string) {
  const head = { accept: '✅ A acceptat pagina', changes: '✏️ Cere modificări', decline: '⛔ A refuzat' }[action]
  await sendIntraconstructTelegram(`${head}: <b>${esc(companyName)}</b>${detail ? `\n${esc(detail.slice(0, 300))}` : ''}`, { button: { text: 'Deschide în CRM', url: leadUrl(leadId) } })
}

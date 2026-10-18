/** Delivery tracking of the SMS sent from the call modal: the provider's status is fetched on demand and kept on the Communication row. */
import { db, Prisma } from '@repo/db'

export type DeliveryState = 'delivered' | 'failed' | 'pending'
export const classify = (status: string | null | undefined): DeliveryState => {
  const s = String(status ?? '').toLowerCase()
  if (s === 'delivered') return 'delivered'
  if (/fail|undeliver|reject|expire|error/.test(s)) return 'failed'
  return 'pending'
}

export interface DeliveryDeps { report: (messageId: string) => Promise<{ status: string; sentAt?: string; deliveredAt?: string }> }
const REPORT_WINDOW_MS = 7 * 86_400_000

export async function refreshDeliveries(leadId: string, o: { deps?: DeliveryDeps; now?: Date } = {}) {
  const now = o.now ?? new Date()
  const report = o.deps?.report ?? (async (id: string) => { const { getDeliveryReport } = await import('@/lib/integrations/smso'); return getDeliveryReport(id) })
  const rows = await db.communication.findMany({ where: { leadId, channel: 'sms', direction: 'outbound' }, orderBy: { createdAt: 'desc' }, take: 10, select: { id: true, createdAt: true, subject: true, externalId: true, metadata: true } })
  const out: { id: string; at: string; subject: string | null; state: DeliveryState | 'unknown'; status: string | null; deliveredAt: string | null }[] = []
  for (const r of rows) {
    const meta = { ...((r.metadata ?? {}) as Record<string, unknown>) }
    let status = (meta.deliveryStatus as string | undefined) ?? null
    let deliveredAt = (meta.deliveredAt as string | undefined) ?? null
    const settled = classify(status) !== 'pending'
    if (r.externalId && !settled && now.getTime() - r.createdAt.getTime() < REPORT_WINDOW_MS) {
      try {
        const rep = await report(r.externalId)
        status = rep.status; deliveredAt = rep.deliveredAt ?? null
        await db.communication.update({ where: { id: r.id }, data: { metadata: { ...meta, deliveryStatus: status, deliveredAt, deliveryCheckedAt: now.toISOString() } as Prisma.InputJsonValue } })
      } catch (e) { console.error('[sms] delivery status', e instanceof Error ? e.message : e) }
    }
    out.push({ id: r.id, at: r.createdAt.toISOString(), subject: r.subject, state: r.externalId ? (status ? classify(status) : 'pending') : 'unknown', status, deliveredAt })
  }
  return out
}

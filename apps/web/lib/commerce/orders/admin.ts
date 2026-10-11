/**
 * Admin side of storefront orders: list/detail, status changes, partner jobs and the settlement with partner garages.
 *
 * Money rules: the customer pays eCaroseria everything (parts + services, VAT included); each service job freezes `saleRon`
 * (charged) and `settlementRon` (owed to the partner) at order time. A job is owed once it is `done`; `settled` means we paid it.
 */
import { db, Prisma } from '@repo/db'
import { z } from 'zod'
import { PartnerError, partnerBusinessLineId } from '../partners/service'

export { ORDER_STATUSES, type OrderStatus } from './constants'
import { ORDER_STATUSES, type OrderStatus } from './constants'
const STATUS_KEYS = ORDER_STATUSES.map((s) => s.key) as [OrderStatus, ...OrderStatus[]]

export const JOB_STATUS = ['pending', 'scheduled', 'done', 'settled', 'cancelled'] as const
export type JobStatus = (typeof JOB_STATUS)[number]
const ACTIONS = ['schedule', 'done', 'settle', 'cancel', 'reopen'] as const

const bl = () => partnerBusinessLineId()
const num = (v: unknown) => (v == null ? 0 : Number(v))

// ─── orders ───

export async function listOrders(f: { status?: string; q?: string; service?: boolean }) {
  const businessLineId = await bl()
  const where: Prisma.CommerceOrderWhereInput = { businessLineId }
  if (f.status && (STATUS_KEYS as string[]).includes(f.status)) where.status = f.status
  if (f.service) where.items = { some: { supplierCode: { startsWith: 'SRV:' } } }
  if (f.q) {
    const q = f.q.slice(0, 100)
    where.OR = [
      { number: { contains: q, mode: 'insensitive' } },
      { customer: { path: ['name'], string_contains: q, mode: 'insensitive' } },
      { customer: { path: ['phone'], string_contains: q.replace(/[^\d+]/g, '') || '§' } },
      { customer: { path: ['email'], string_contains: q, mode: 'insensitive' } },
    ]
  }
  const rows = await db.commerceOrder.findMany({
    where, orderBy: { createdAt: 'desc' }, take: 200,
    select: {
      id: true, number: true, status: true, total: true, createdAt: true, customer: true, paymentStatus: true,
      items: { select: { supplierCode: true } }, _count: { select: { items: true } },
    },
  })
  const counts = await db.commerceOrder.groupBy({ by: ['status'], where: { businessLineId }, _count: true })
  const jobs = await db.commerceServiceJob.findMany({ where: { orderId: { in: rows.map((r) => r.id) } }, select: { orderId: true, status: true, partnerId: true } })
  const partners = await db.commerceServicePartner.findMany({ where: { id: { in: [...new Set(jobs.map((j) => j.partnerId))] } }, select: { id: true, name: true } })
  const pname = new Map(partners.map((p) => [p.id, p.name]))
  return {
    counts: Object.fromEntries(counts.map((c) => [c.status, c._count])),
    orders: rows.map((r) => {
      const c = r.customer as { name?: string; phone?: string }
      const js = jobs.filter((j) => j.orderId === r.id)
      return {
        id: r.id, number: r.number, status: r.status, total: num(r.total), createdAt: r.createdAt, customerName: c.name ?? '', customerPhone: c.phone ?? '',
        hasService: js.length > 0, partnerName: js[0] ? pname.get(js[0].partnerId) ?? null : null, jobStatuses: js.map((j) => j.status),
      }
    }),
  }
}

export async function getOrder(id: string) {
  const businessLineId = await bl()
  const o = await db.commerceOrder.findFirst({
    where: { id, businessLineId },
    include: { items: { orderBy: { supplierCode: 'asc' } }, events: { orderBy: { createdAt: 'desc' }, take: 100 } },
  })
  if (!o) throw new PartnerError('Not found', 404)
  const jobs = await db.commerceServiceJob.findMany({ where: { orderId: id }, orderBy: { createdAt: 'asc' } })
  const partner = jobs[0] ? await db.commerceServicePartner.findUnique({ where: { id: jobs[0].partnerId }, select: { id: true, name: true, address: true, city: true, county: true, phone: true, email: true, contactPerson: true } }) : null
  const lead = await db.lead.findFirst({ where: { externalSource: 'storefront-ecaroseria', externalId: o.number }, select: { id: true } })
  const customer = o.customer as { name: string; phone: string; email: string }
  const productItems = o.items.filter((i) => !i.supplierCode.startsWith('SRV:'))
  return {
    order: {
      id: o.id, number: o.number, status: o.status, paymentMethod: o.paymentMethod, paymentStatus: o.paymentStatus, subtotal: num(o.subtotal), vatTotal: num(o.vatTotal), total: num(o.total),
      customer, shippingAddress: o.shippingAddress, billingAddress: o.billingAddress, notes: o.notes, createdAt: o.createdAt, leadId: lead?.id ?? null,
    },
    items: o.items.map((i) => ({ id: i.id, supplierCode: i.supplierCode, name: i.name, qty: i.qty, unitPriceRon: num(i.unitPriceRon), totalRon: num(i.totalRon), kind: i.supplierCode.startsWith('SRV:') ? 'service' : 'product' })),
    jobs: jobs.map((j) => ({ ...j, saleRon: num(j.saleRon), settlementRon: num(j.settlementRon) })),
    partner,
    events: o.events.map((e) => ({ id: e.id, type: e.type, message: e.message, createdAt: e.createdAt })),
    partnerMessage: partner ? partnerMessage(customer, partner, jobs, productItems.map((i) => ({ name: i.name, sku: i.supplierCode })), o.number) : null,
  }
}

/** Plain text the operator copies to the partner (phone/WhatsApp/e-mail): what part arrives, what to do, paint code, who the customer is. */
export function partnerMessage(
  customer: { name: string; phone: string },
  partner: { name: string },
  jobs: Array<{ service: string; forProductName: string | null; paintCode: string | null; vin: string | null; settlementRon: unknown }>,
  products: Array<{ name: string; sku: string }>, number: string,
): string {
  const label: Record<string, string> = { mount: 'Montaj', paint: 'Vopsire la culoarea mașinii', paint_mount: 'Vopsire + montaj' }
  return [
    `Bună ziua, ${partner.name}!`, `Comanda eCaroseria ${number}: avem o lucrare pentru dvs.`, '',
    ...jobs.map((j, i) => `${i + 1}. ${label[j.service] ?? j.service} — ${j.forProductName ?? ''}${j.paintCode ? ` · cod vopsea ${j.paintCode}` : ''}${j.vin ? ` · VIN ${j.vin}` : ''} · tarif ${num(j.settlementRon).toFixed(2)} RON`),
    '', 'Piesele vin la dvs. direct de la noi:', ...products.map((p) => `- ${p.name} (cod ${p.sku})`),
    '', `Client: ${customer.name}, ${customer.phone}. Vă rugăm să stabiliți programarea cu clientul și să ne anunțați când lucrarea este gata.`,
  ].join('\n')
}

const StatusBody = z.object({ status: z.enum(STATUS_KEYS).optional(), note: z.string().trim().min(1).max(1000).optional(), partnerNotified: z.boolean().optional() })

export async function updateOrder(id: string, input: unknown, by: string) {
  const body = StatusBody.parse(input)
  const businessLineId = await bl()
  const o = await db.commerceOrder.findFirst({ where: { id, businessLineId }, select: { id: true, number: true, status: true } })
  if (!o) throw new PartnerError('Not found', 404)
  await db.$transaction(async (tx) => {
    if (body.status && body.status !== o.status) {
      await tx.commerceOrder.update({ where: { id }, data: { status: body.status } })
      const label = ORDER_STATUSES.find((s) => s.key === body.status)!.label
      await tx.commerceOrderEvent.create({ data: { orderId: id, type: 'status_changed', message: `Stare: ${label}`, data: { from: o.status, to: body.status, by } } })
      const leadStatus = ORDER_STATUSES.find((s) => s.key === body.status)!.lead
      if (leadStatus) await tx.lead.updateMany({ where: { externalSource: 'storefront-ecaroseria', externalId: o.number }, data: { status: leadStatus } })
      if (body.status === 'cancelled') {
        await tx.commerceServiceJob.updateMany({ where: { orderId: id, status: { in: ['pending', 'scheduled'] } }, data: { status: 'cancelled' } })
      }
    }
    if (body.note) await tx.commerceOrderEvent.create({ data: { orderId: id, type: 'note', message: body.note, data: { by } } })
    if (body.partnerNotified) await tx.commerceOrderEvent.create({ data: { orderId: id, type: 'partner_notified', message: 'Service-ul partener a fost notificat', data: { by } } })
  })
}

// ─── jobs ───

const JobBody = z.object({
  action: z.enum(ACTIONS),
  scheduledAt: z.string().datetime().optional(),
  notes: z.string().trim().max(500).optional(),
})

const FROM: Record<(typeof ACTIONS)[number], JobStatus[]> = {
  schedule: ['pending', 'scheduled'], done: ['pending', 'scheduled'], settle: ['done'], cancel: ['pending', 'scheduled', 'done'], reopen: ['done', 'cancelled'],
}
const TO: Record<(typeof ACTIONS)[number], JobStatus> = { schedule: 'scheduled', done: 'done', settle: 'settled', cancel: 'cancelled', reopen: 'scheduled' }

export async function updateJob(orderId: string, jobId: string, input: unknown, by: string) {
  const body = JobBody.parse(input)
  const job = await db.commerceServiceJob.findFirst({ where: { id: jobId, orderId } })
  if (!job) throw new PartnerError('Not found', 404)
  if (!FROM[body.action].includes(job.status as JobStatus)) throw new PartnerError(`Acțiunea nu este permisă pentru o lucrare „${job.status}”`, 409)
  if (body.action === 'settle') throw new PartnerError('Decontarea se face din pagina de decontări (cu o referință de plată)', 400)
  const now = new Date()
  const data: Prisma.CommerceServiceJobUpdateInput = { status: TO[body.action] }
  if (body.action === 'schedule') data.scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : now
  if (body.action === 'done') data.doneAt = now
  if (body.action === 'reopen') { data.doneAt = null; data.settledAt = null }
  if (body.notes) data.notes = body.notes
  const msg: Record<string, string> = { schedule: 'Lucrare programată', done: 'Lucrare finalizată la service', cancel: 'Lucrare anulată', reopen: 'Lucrare redeschisă' }
  await db.$transaction([
    db.commerceServiceJob.update({ where: { id: jobId }, data }),
    db.commerceOrderEvent.create({ data: { orderId, type: `job_${TO[body.action]}`, message: `${msg[body.action]} (${job.service})`, data: { jobId, by } } }),
  ])
}

// ─── settlements ───

export async function settlementReport(f: { partnerId?: string; from?: string; to?: string }) {
  const businessLineId = await bl()
  const partners = await db.commerceServicePartner.findMany({ where: { businessLineId, ...(f.partnerId ? { id: f.partnerId } : {}) }, select: { id: true, name: true, city: true } })
  const range: Prisma.CommerceServiceJobWhereInput = {}
  if (f.from || f.to) range.createdAt = { ...(f.from ? { gte: new Date(f.from) } : {}), ...(f.to ? { lte: new Date(f.to) } : {}) }
  const jobs = await db.commerceServiceJob.findMany({
    where: { partnerId: { in: partners.map((p) => p.id) }, ...range }, orderBy: { createdAt: 'desc' }, take: 1000,
  })
  const orders = await db.commerceOrder.findMany({ where: { id: { in: [...new Set(jobs.map((j) => j.orderId))] } }, select: { id: true, number: true } })
  const onum = new Map(orders.map((o) => [o.id, o.number]))
  const by = partners.map((p) => {
    const mine = jobs.filter((j) => j.partnerId === p.id)
    const sum = (st: JobStatus[], k: 'settlementRon' | 'saleRon') => mine.filter((j) => st.includes(j.status as JobStatus)).reduce((a, j) => a + num(j[k]), 0)
    return {
      partner: p, jobs: mine.map((j) => ({ id: j.id, orderId: j.orderId, orderNumber: onum.get(j.orderId) ?? '', service: j.service, status: j.status, forProductName: j.forProductName, saleRon: num(j.saleRon), settlementRon: num(j.settlementRon), doneAt: j.doneAt, settledAt: j.settledAt, settlementRef: j.settlementRef, createdAt: j.createdAt })),
      owedRon: round2(sum(['done'], 'settlementRon')), // finished, not yet paid to the partner
      settledRon: round2(sum(['settled'], 'settlementRon')),
      inProgressRon: round2(sum(['pending', 'scheduled'], 'settlementRon')),
      invoicedToCustomersRon: round2(sum(['pending', 'scheduled', 'done', 'settled'], 'saleRon')),
      marginRon: round2(sum(['done', 'settled'], 'saleRon') - sum(['done', 'settled'], 'settlementRon')),
    }
  }).filter((x) => x.jobs.length > 0)
  return { partners: by, totals: { owedRon: round2(by.reduce((a, x) => a + x.owedRon, 0)), settledRon: round2(by.reduce((a, x) => a + x.settledRon, 0)) } }
}

const round2 = (n: number) => Math.round(n * 100) / 100

const SettleBody = z.object({ partnerId: z.string().min(8).max(40), jobIds: z.array(z.string().min(8).max(40)).min(1).max(500), ref: z.string().trim().min(2).max(100) })

/** Marks finished jobs as paid to the partner. Only `done` jobs of that partner move; anything else in the list is refused as a whole. */
export async function settleJobs(input: unknown, by: string) {
  const { partnerId, jobIds, ref } = SettleBody.parse(input)
  const jobs = await db.commerceServiceJob.findMany({ where: { id: { in: jobIds } } })
  const bad = jobs.length !== jobIds.length || jobs.some((j) => j.partnerId !== partnerId || j.status !== 'done')
  if (bad) throw new PartnerError('Doar lucrările finalizate ale aceluiași partener pot fi decontate', 409)
  const now = new Date()
  await db.$transaction([
    db.commerceServiceJob.updateMany({ where: { id: { in: jobIds }, status: 'done' }, data: { status: 'settled', settledAt: now, settlementRef: ref } }),
    ...jobs.map((j) => db.commerceOrderEvent.create({ data: { orderId: j.orderId, type: 'job_settled', message: `Lucrare decontată (${ref})`, data: { jobId: j.id, by } } })),
  ])
  return { settled: jobs.length, totalRon: round2(jobs.reduce((a, j) => a + num(j.settlementRon), 0)) }
}

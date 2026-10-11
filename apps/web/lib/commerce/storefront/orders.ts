/**
 * Storefront orders: validation + persistence (CommerceOrder snapshot + CRM Lead).
 * Prices always come from the catalog (CommerceListing.priceRon, VAT included); the client only sends slug + quantity.
 */
import { createHash } from 'crypto'
import { isIP } from 'net'
import { db, Prisma } from '@repo/db'
import type { StorefrontContext } from './auth'
import { availabilityFor, publicCodeFromSlug, skuFromSlug } from './queries'

export const ORDER_STATUS = 'pending_confirmation'
export const LEAD_SOURCE = 'storefront-ecaroseria'
const SLUG_RE = /^[a-z0-9-]{1,140}$/
const MAX_ORDERS_PER_HOUR = 5
const WINDOW_MS = 60 * 60_000
const MAX_QUEUED = 30

/** Message is shown to the customer as-is: Romanian, no internal details. */
export class OrderInputError extends Error {
  constructor(message: string, public status: 400 | 422 = 422) { super(message) }
}
export class OrderRateLimitError extends Error {
  constructor(public retryAfterSec: number) { super('rate limited') }
}
export class OrderBusyError extends Error {}

// ─── Input validation ───

export const SERVICE_TYPES = ['mount', 'paint', 'paint_mount'] as const
export type ServiceType = (typeof SERVICE_TYPES)[number]
export const SERVICE_LABEL: Record<ServiceType, string> = { mount: 'Montaj la service', paint: 'Vopsire la culoarea mașinii', paint_mount: 'Vopsire + montaj la service' }

/** A partner service attached to one cart line. The price is NEVER read from here: it comes from the partner's rate in the ERP. */
export interface OrderServiceInput { partnerId: string; type: ServiceType; paintCode: string | null; vin: string | null }

export interface ParsedOrder {
  customer: { name: string; phone: string; email: string }
  shipping: { county: string; city: string; address: string; postalCode: string | null }
  notes: string | null
  items: Array<{ slug: string; quantity: number; service?: OrderServiceInput }>
}

function parseService(v: unknown, line: number): OrderServiceInput {
  if (!isObj(v)) throw new OrderInputError(`Serviciul de pe linia ${line} nu este valid.`)
  const partnerId = typeof v.partnerId === 'string' ? v.partnerId : ''
  if (!/^[A-Za-z0-9_-]{8,40}$/.test(partnerId)) throw new OrderInputError(`Service-ul ales pentru linia ${line} nu este valid.`)
  if (typeof v.type !== 'string' || !(SERVICE_TYPES as readonly string[]).includes(v.type)) throw new OrderInputError(`Tipul serviciului de pe linia ${line} nu este valid.`)
  const type = v.type as ServiceType
  let paintCode: string | null = null
  if (v.paintCode != null && v.paintCode !== '') {
    paintCode = cleanText(v.paintCode)
    if (!/^[A-Za-z0-9][A-Za-z0-9 ./_-]{1,39}$/.test(paintCode)) throw new OrderInputError('Codul de vopsea nu este valid (litere, cifre, spații, maximum 40 de caractere).')
  }
  if (type !== 'mount' && !paintCode) throw new OrderInputError('Pentru vopsire trebuie să introduci codul de vopsea al mașinii.')
  let vin: string | null = null
  if (v.vin != null && v.vin !== '') {
    vin = cleanText(v.vin).toUpperCase()
    if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) throw new OrderInputError('Seria de șasiu (VIN) trebuie să aibă 17 caractere.')
  }
  return { partnerId, type, paintCode: type === 'mount' ? null : paintCode, vin }
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

/** Plain text only: strips control chars and anything tag-like, collapses whitespace. */
function cleanText(v: unknown): string {
  if (typeof v !== 'string') return ''
  return v.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/<[^>]*>/g, ' ').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim()
}

function text(v: unknown, label: string, min: number, max: number): string {
  if (v == null || v === '') throw new OrderInputError(`Câmpul „${label}” este obligatoriu.`)
  if (typeof v !== 'string') throw new OrderInputError(`Câmpul „${label}” este invalid.`)
  const s = cleanText(v)
  if (s.length < min) throw new OrderInputError(`Câmpul „${label}” este prea scurt.`)
  if (s.length > max) throw new OrderInputError(`Câmpul „${label}” este prea lung (maximum ${max} de caractere).`)
  return s
}

export function normalizePhone(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  let s = raw.replace(/[\s().\-]/g, '')
  if (s.startsWith('+40')) s = '0' + s.slice(3)
  else if (s.startsWith('0040')) s = '0' + s.slice(4)
  return /^0\d{9}$/.test(s) ? s : null
}

export function parseOrderInput(body: unknown): ParsedOrder {
  if (!isObj(body)) throw new OrderInputError('Cererea nu este validă.', 400)
  const c = body.customer, s = body.shipping
  if (!isObj(c)) throw new OrderInputError('Datele clientului lipsesc.')
  if (!isObj(s)) throw new OrderInputError('Adresa de livrare lipsește.')

  const name = text(c.name, 'Nume', 2, 100)
  const phone = normalizePhone(c.phone)
  if (!phone) throw new OrderInputError('Numărul de telefon nu este valid. Introdu un număr de 10 cifre, de exemplu 0712345678.')
  const emailRaw = text(c.email, 'E-mail', 5, 254).toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(emailRaw)) throw new OrderInputError('Adresa de e-mail nu este validă.')

  const county = text(s.county, 'Județ', 2, 60)
  const city = text(s.city, 'Localitate', 2, 80)
  const address = text(s.address, 'Adresă', 3, 200)
  let postalCode: string | null = null
  if (s.postalCode != null && s.postalCode !== '') {
    postalCode = cleanText(s.postalCode)
    if (!/^\d{6}$/.test(postalCode)) throw new OrderInputError('Codul poștal trebuie să aibă 6 cifre.')
  }

  if (body.paymentMethod !== 'cod') throw new OrderInputError('Momentan este disponibilă doar plata ramburs, la livrare.')

  let notes: string | null = null
  if (body.notes != null && body.notes !== '') {
    if (typeof body.notes !== 'string') throw new OrderInputError('Câmpul „Observații” este invalid.')
    if (body.notes.length > 500) throw new OrderInputError('Observațiile pot avea maximum 500 de caractere.')
    notes = cleanText(body.notes) || null
  }

  if (!Array.isArray(body.items) || body.items.length < 1) throw new OrderInputError('Coșul este gol.')
  if (body.items.length > 50) throw new OrderInputError('Poți comanda maximum 50 de produse diferite într-o comandă.')
  const merged = new Map<string, number>()
  const withService: ParsedOrder['items'] = []
  body.items.forEach((it, i) => {
    if (!isObj(it) || typeof it.slug !== 'string' || !SLUG_RE.test(it.slug)) throw new OrderInputError(`Produsul de pe linia ${i + 1} nu este valid.`)
    const q = it.quantity
    if (typeof q !== 'number' || !Number.isInteger(q) || q < 1 || q > 99) throw new OrderInputError(`Cantitatea produsului de pe linia ${i + 1} trebuie să fie un număr întreg între 1 și 99.`)
    if (it.service != null) {
      // A service is done on one specific part: its own line, quantity 1 (two parts = two lines).
      if (q !== 1) throw new OrderInputError(`Serviciul se comandă pentru câte o piesă: linia ${i + 1} trebuie să aibă cantitatea 1.`)
      withService.push({ slug: it.slug, quantity: 1, service: parseService(it.service, i + 1) })
      return
    }
    const total = (merged.get(it.slug) ?? 0) + q
    if (total > 99) throw new OrderInputError('Cantitatea maximă pentru un produs este 99.')
    merged.set(it.slug, total)
  })
  return {
    customer: { name, phone, email: emailRaw },
    shipping: { county, city, address, postalCode },
    notes,
    items: [...[...merged].map(([slug, quantity]) => ({ slug, quantity })), ...withService],
  }
}

export function parseIdempotencyKey(h: string | null): string | null {
  if (h == null) return null
  const k = h.trim()
  if (!/^[A-Za-z0-9._:-]{8,128}$/.test(k)) throw new OrderInputError('Antetul Idempotency-Key nu este valid.', 400)
  return k
}

/** Leftmost X-Forwarded-For entry = the real client when the (authenticated) storefront BFF sets it. */
export function clientIp(req: Request): string | null {
  const first = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const ip = first || req.headers.get('x-real-ip')?.trim() || ''
  return isIP(ip) ? ip : null
}

// ─── Serialization of order creation (in-process queue so waiting requests don't hold DB connections) ───
let tail: Promise<unknown> = Promise.resolve()
let queued = 0
function serialized<T>(fn: () => Promise<T>): Promise<T> {
  if (queued >= MAX_QUEUED) return Promise.reject(new OrderBusyError())
  queued++
  const run = tail.then(fn, fn)
  tail = run.catch(() => undefined).finally(() => { queued-- })
  return run
}

// ─── Creation ───

export interface OrderTotals { totalRon: number; productsTotalRon: number; servicesTotalRon: number }

export interface CreatedOrder {
  id: string
  number: string
  replay: boolean
  totals: OrderTotals
  /** Present only for newly created orders (used for notifications). */
  summary?: OrderSummary
}
export interface OrderSummary {
  number: string
  customer: ParsedOrder['customer']
  shipping: ParsedOrder['shipping']
  notes: string | null
  items: Array<{ name: string; sku: string; quantity: number; unitPriceRon: number; totalRon: number }>
  totalRon: number
  bulky: boolean
  leadId: string
  businessLineId: string
  /** Partner service(s) ordered: the part is delivered to the partner, not to the customer. */
  service?: { partnerName: string; address: string; city: string; county: string | null; lines: Array<{ label: string; forProduct: string; priceRon: number; paintCode: string | null }> }
}

const money = (cents: number) => (cents / 100).toFixed(2)
const ron = (cents: number) => new Intl.NumberFormat('ro-RO', { style: 'currency', currency: 'RON' }).format(cents / 100)

let seqReady = false

export function createStorefrontOrder(
  ctx: StorefrontContext,
  input: ParsedOrder,
  meta: { idempotencyKey: string | null; ip: string | null; userAgent: string | null },
): Promise<CreatedOrder> {
  return serialized(async () => {
    const bodyHash = createHash('sha256').update(JSON.stringify(input)).digest('hex')
    const idemKey = meta.idempotencyKey ? `${ctx.businessLineId}:${meta.idempotencyKey}` : null

    return db.$transaction(async (tx) => {
      // Cross-process guard (the in-process queue already serializes this instance)
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('storefront-orders'))`

      // 1. Idempotent replay — checked before rate limits so a retry never gets a 429
      if (idemKey) {
        const existing = await tx.commerceOrder.findUnique({
          where: { idempotencyKey: idemKey },
          select: { id: true, number: true, total: true, items: { select: { totalRon: true, supplierCode: true } }, events: { where: { type: 'created' }, select: { data: true }, take: 1 } },
        })
        if (existing) {
          const prevHash = (existing.events[0]?.data as { bodyHash?: string } | null)?.bodyHash
          if (prevHash && prevHash !== bodyHash) throw new OrderInputError('Această cheie de idempotență a fost folosită pentru o altă comandă.')
          const services = existing.items.filter((x) => x.supplierCode.startsWith('SRV:')).reduce((a, x) => a + Number(x.totalRon), 0)
          return { id: existing.id, number: existing.number, replay: true, totals: { totalRon: Number(existing.total), productsTotalRon: Number(existing.total) - services, servicesTotalRon: services } }
        }
      }

      // 2. Anti-abuse: max 5 orders / hour per e-mail-or-phone and per IP
      const since = new Date(Date.now() - WINDOW_MS)
      const byContact = await tx.$queryRaw<Array<{ createdAt: Date }>>`
        SELECT "createdAt" FROM "CommerceOrder"
        WHERE "businessLineId" = ${ctx.businessLineId} AND "createdAt" > ${since}
          AND (customer->>'email' = ${input.customer.email} OR customer->>'phone' = ${input.customer.phone})
        ORDER BY "createdAt" DESC LIMIT ${MAX_ORDERS_PER_HOUR}`
      const byIp = meta.ip ? await tx.$queryRaw<Array<{ createdAt: Date }>>`
        SELECT o."createdAt" FROM "CommerceOrderEvent" e JOIN "CommerceOrder" o ON o.id = e."orderId"
        WHERE e.type = 'created' AND e.data->>'ip' = ${meta.ip}
          AND o."businessLineId" = ${ctx.businessLineId} AND o."createdAt" > ${since}
        ORDER BY o."createdAt" DESC LIMIT ${MAX_ORDERS_PER_HOUR}` : []
      let retryAfter = 0
      for (const rows of [byContact, byIp]) {
        if (rows.length >= MAX_ORDERS_PER_HOUR) retryAfter = Math.max(retryAfter, Math.ceil((rows[MAX_ORDERS_PER_HOUR - 1]!.createdAt.getTime() + WINDOW_MS - Date.now()) / 1000))
      }
      if (retryAfter > 0) throw new OrderRateLimitError(Math.max(1, retryAfter))

      // 3. Current catalog prices (VAT included) — snapshot
      const listings = await tx.commerceListing.findMany({
        where: { businessLineId: ctx.businessLineId, slug: { in: input.items.map((i) => i.slug) }, isActive: true, priceRon: { not: null }, product: { isActive: true } },
        select: {
          id: true, slug: true, priceRon: true, productId: true,
          product: { select: { supplierCode: true, publicCode: true, nameRo: true, bulkyClass: true, stock: { select: { rawFlag: true } } } },
        },
      })
      const bySlug = new Map(listings.map((l) => [l.slug, l]))
      // A cart may still hold a legacy slug: resolve those by the SKU at the end (same rule as GET /products/{slug})
      const unresolved = input.items.map((i) => i.slug).filter((sl) => !bySlug.has(sl))
      const bySku = new Map<string, (typeof listings)[number]>()
      const skus = [...new Set(unresolved.map(skuFromSlug).filter((x): x is string => !!x))]
      const codes = [...new Set(unresolved.map(publicCodeFromSlug).filter((x): x is string => !!x))]
      if (skus.length || codes.length) {
        const alt = await tx.commerceListing.findMany({
          where: { businessLineId: ctx.businessLineId, product: { OR: [{ supplierCode: { in: skus } }, { publicCode: { in: codes } }] }, isActive: true, priceRon: { not: null } },
          select: { id: true, slug: true, priceRon: true, productId: true, product: { select: { supplierCode: true, publicCode: true, nameRo: true, bulkyClass: true, isActive: true, stock: { select: { rawFlag: true } } } } },
        })
        for (const l of alt) if (l.product.isActive) { bySku.set(l.product.supplierCode, l as (typeof listings)[number]); if (l.product.publicCode) bySku.set(l.product.publicCode, l as (typeof listings)[number]) }
      }
      const lines = input.items.map((it, i) => {
        const l = bySlug.get(it.slug) ?? bySku.get(skuFromSlug(it.slug) ?? publicCodeFromSlug(it.slug) ?? '')
        if (!l || l.priceRon == null) throw new OrderInputError(`Produsul de pe linia ${i + 1} nu mai este disponibil. Te rugăm să actualizezi coșul.`)
        const unit = Math.round(Number(l.priceRon) * 100)
        return {
          l, quantity: it.quantity, unit, line: unit * it.quantity,
          name: (l.product.nameRo ?? l.product.supplierCode).slice(0, 300),
          bulky: l.product.bulkyClass === 'large' || l.product.bulkyClass === 'xlarge',
          availability: availabilityFor(l.product.stock, ctx.stockFlagMeaning),
        }
      })
      const oos = lines.findIndex((x) => x.availability === 'out_of_stock')
      if (oos >= 0) throw new OrderInputError(`Produsul de pe linia ${oos + 1} este momentan indisponibil. Te rugăm să îl scoți din coș sau să ceri o ofertă.`)

      // 3b. Partner services: one partner per order, prices from the partner's rate (VAT included), cost frozen for the settlement
      const svcIdx = input.items.map((it, i) => ({ it, i })).filter((x) => x.it.service)
      let svc: {
        partner: { id: string; name: string; address: string; city: string; county: string | null; phone: string | null }
        lines: Array<{ i: number; type: ServiceType; label: string; saleCents: number; settlementRon: number; paintCode: string | null; vin: string | null; productName: string; slug: string; bulkyClass: string; leadTimeDays: number | null }>
      } | null = null
      if (svcIdx.length) {
        const ids = new Set(svcIdx.map((x) => x.it.service!.partnerId))
        if (ids.size > 1) throw new OrderInputError('Serviciile dintr-o comandă trebuie făcute la același service partener.')
        const partner = await tx.commerceServicePartner.findFirst({ where: { id: [...ids][0]!, businessLineId: ctx.businessLineId, status: 'active' } })
        if (!partner || !partner.address || !partner.city) throw new OrderInputError('Service-ul ales nu mai este disponibil. Te rugăm să alegi altul.')
        const rates = await tx.commerceServicePartnerRate.findMany({ where: { partnerId: partner.id, isActive: true, salePriceRon: { not: null } } })
        svc = {
          partner: { id: partner.id, name: partner.name, address: partner.address, city: partner.city, county: partner.county, phone: partner.phone },
          lines: svcIdx.map(({ it, i }) => {
            const sv = it.service!, line = lines[i]!
            const bulkyClass = line.l.product.bulkyClass ?? 'standard'
            const rate = rates.find((r) => r.service === sv.type && r.bulkyClass === bulkyClass) ?? rates.find((r) => r.service === sv.type && r.bulkyClass == null)
            if (!rate) throw new OrderInputError(`Serviciul ales nu este disponibil pentru produsul de pe linia ${i + 1}. Te rugăm să alegi alt serviciu sau alt service.`)
            return {
              i, type: sv.type, label: SERVICE_LABEL[sv.type], saleCents: Math.round(Number(rate.salePriceRon) * 100), settlementRon: Number(rate.settlementRon),
              paintCode: sv.paintCode, vin: sv.vin, productName: line.name, slug: line.l.slug, bulkyClass, leadTimeDays: rate.leadTimeDays,
            }
          }),
        }
      }
      const productsCents = lines.reduce((a, x) => a + x.line, 0)
      const servicesCents = svc ? svc.lines.reduce((a, x) => a + x.saleCents, 0) : 0
      const totalCents = productsCents + servicesCents
      const bulky = lines.some((x) => x.bulky)
      const channel = await tx.commerceChannel.findUnique({ where: { id: ctx.channelId }, select: { vatRate: true } })
      const vatRate = Number(channel?.vatRate ?? 21)
      const vatCents = Math.round(totalCents - (totalCents * 100) / (100 + vatRate))

      // 4. Sequential, unique number
      if (!seqReady) { await tx.$executeRawUnsafe('CREATE SEQUENCE IF NOT EXISTS commerce_order_number_seq'); seqReady = true }
      const seq = await tx.$queryRaw<Array<{ n: bigint }>>`SELECT nextval('commerce_order_number_seq') AS n`
      const number = `EC-${String(seq[0]!.n).padStart(6, '0')}`

      // 5. Existing customer (by e-mail or phone)? — linked on the order, never duplicated
      const phone9 = input.customer.phone.slice(-9)
      const [client] = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM "Client"
        WHERE "businessLineId" = ${ctx.businessLineId} AND "deletedAt" IS NULL
          AND (lower(email) = ${input.customer.email} OR (phone IS NOT NULL AND right(regexp_replace(phone, '\D', '', 'g'), 9) = ${phone9}))
        ORDER BY "createdAt" LIMIT 1`

      const order = await tx.commerceOrder.create({
        data: {
          number, businessLineId: ctx.businessLineId, clientId: client?.id ?? null,
          status: ORDER_STATUS, paymentMethod: 'cod', paymentStatus: 'pending', currency: 'RON',
          subtotal: money(totalCents), shippingTotal: '0', vatTotal: money(vatCents), total: money(totalCents),
          customer: input.customer,
          // With a service the part is delivered to the partner garage; the customer's own address stays as billing/contact address.
          shippingAddress: svc
            ? { deliverTo: 'partner', partnerId: svc.partner.id, partnerName: svc.partner.name, address: svc.partner.address, city: svc.partner.city, county: svc.partner.county ?? '', postalCode: null }
            : input.shipping,
          billingAddress: svc ? input.shipping : undefined,
          notes: input.notes,
          idempotencyKey: idemKey,
          items: {
            create: lines.map((x) => ({
              productId: x.l.productId, listingId: x.l.id, supplierCode: x.l.product.supplierCode, name: x.name,
              qty: x.quantity, unitPriceRon: money(x.unit), totalRon: money(x.line),
              options: { slug: x.l.slug, availability: x.availability, bulky: x.bulky },
            })),
          },
          events: {
            create: [{
              type: 'created', message: 'Comandă primită din storefront (ramburs, de confirmat telefonic)',
              data: { ip: meta.ip, userAgent: meta.userAgent?.slice(0, 200) ?? null, bodyHash, bulky, shipping: 'confirmat la comandă', service: svc ? { partnerId: svc.partner.id, lines: svc.lines.length } : null },
            }],
          },
        },
        select: { id: true },
      })

      if (svc) {
        for (const sl of svc.lines) {
          const item = await tx.commerceOrderItem.create({
            data: {
              orderId: order.id, productId: null, listingId: null, supplierCode: `SRV:${sl.type}`, name: `${sl.label} — ${svc.partner.name}`.slice(0, 300),
              qty: 1, unitPriceRon: money(sl.saleCents), totalRon: money(sl.saleCents), costPrice: sl.settlementRon.toFixed(2),
              options: { kind: 'service', partnerId: svc.partner.id, partnerName: svc.partner.name, service: sl.type, forSlug: sl.slug, forProduct: sl.productName, bulkyClass: sl.bulkyClass, paintCode: sl.paintCode, vin: sl.vin, leadTimeDays: sl.leadTimeDays },
            },
            select: { id: true },
          })
          await tx.commerceServiceJob.create({
            data: {
              orderId: order.id, orderItemId: item.id, partnerId: svc.partner.id, service: sl.type, saleRon: money(sl.saleCents), settlementRon: sl.settlementRon.toFixed(2),
              forProductName: sl.productName.slice(0, 300), paintCode: sl.paintCode, vin: sl.vin,
            },
          })
        }
        await tx.commerceOrderEvent.create({ data: { orderId: order.id, type: 'service_ordered', message: `Serviciu la ${svc.partner.name} (${svc.lines.map((x) => x.label).join(', ')}) — piesa se livrează la service`, data: { partnerId: svc.partner.id } } })
      }

      // 6. CRM lead (status "nou", source storefront-ecaroseria) with the order snapshot
      const bl = await tx.businessLine.findUnique({ where: { id: ctx.businessLineId }, select: { config: true } })
      const defaultAssignee = (bl?.config as { defaultAssignee?: unknown } | null)?.defaultAssignee
      const itemsSnap = lines.map((x) => ({
        slug: x.l.slug, sku: x.l.product.supplierCode, name: x.name, quantity: x.quantity,
        unitPriceRon: x.unit / 100, totalRon: x.line / 100, availability: x.availability,
      }))
      const sh = input.shipping
      const notes = [
        `Comandă ${number} — ramburs, de confirmat telefonic (transport și stoc se confirmă la telefon)`,
        'Produse:',
        ...lines.map((x, i) => `${i + 1}. ${x.name} (SKU ${x.l.product.supplierCode}) × ${x.quantity} — ${ron(x.unit)}/buc = ${ron(x.line)}`),
        `Total produse (TVA inclus): ${ron(productsCents)}${bulky ? ' — produse voluminoase' : ''}`,
        ...(svc ? [
          'Servicii la service partener:',
          ...svc.lines.map((x) => `• ${x.label} pentru „${x.productName}” — ${ron(x.saleCents)}${x.paintCode ? ` · cod vopsea ${x.paintCode}` : ''}${x.vin ? ` · VIN ${x.vin}` : ''}`),
          `Service: ${svc.partner.name}, ${svc.partner.address}, ${svc.partner.city}${svc.partner.phone ? ` · ${svc.partner.phone}` : ''} — piesa se livrează la service`,
          `Total comandă (produse + servicii, TVA inclus): ${ron(totalCents)}`,
          `Adresa clientului (contact/facturare): ${sh.address}, ${sh.city}, ${sh.county}`,
        ] : [`Livrare: ${sh.address}, ${sh.city}, ${sh.county}${sh.postalCode ? `, ${sh.postalCode}` : ''}`]),
        ...(input.notes ? [`Observații client: ${input.notes}`] : []),
      ].join('\n')
      const lead = await tx.lead.create({
        data: {
          businessLineId: ctx.businessLineId, entityType: 'customers',
          companyName: input.customer.name, contactPerson: input.customer.name,
          email: input.customer.email, phone: input.customer.phone,
          status: 'nou', source: LEAD_SOURCE, sourceDomain: 'ecaroseria.ro',
          value: totalCents / 100, notes,
          city: sh.city, county: sh.county, address: sh.address,
          assignedTo: typeof defaultAssignee === 'string' && defaultAssignee ? defaultAssignee : null,
          externalId: number, externalSource: LEAD_SOURCE,
          customFields: {
            order: {
              id: order.id, number, status: ORDER_STATUS, paymentMethod: 'cod', productsTotalRon: productsCents / 100, servicesTotalRon: servicesCents / 100, totalRon: totalCents / 100,
              shippingNote: 'confirmat la comandă', bulky, items: itemsSnap,
              services: svc ? { partnerId: svc.partner.id, partnerName: svc.partner.name, lines: svc.lines.map((x) => ({ service: x.type, forSlug: x.slug, priceRon: x.saleCents / 100, paintCode: x.paintCode, vin: x.vin })) } : null,
            },
            existingClientId: client?.id ?? null,
          } as Prisma.InputJsonValue,
        },
        select: { id: true },
      })
      await tx.commerceOrderEvent.create({ data: { orderId: order.id, type: 'lead_created', message: 'Lead creat în CRM', data: { leadId: lead.id } } })

      return {
        id: order.id, number, replay: false,
        totals: { totalRon: totalCents / 100, productsTotalRon: productsCents / 100, servicesTotalRon: servicesCents / 100 },
        summary: {
          number, customer: input.customer, shipping: input.shipping, notes: input.notes, bulky, leadId: lead.id, businessLineId: ctx.businessLineId,
          items: lines.map((x) => ({ name: x.name, sku: x.l.product.supplierCode, quantity: x.quantity, unitPriceRon: x.unit / 100, totalRon: x.line / 100 })),
          totalRon: totalCents / 100,
          service: svc ? {
            partnerName: svc.partner.name, address: svc.partner.address, city: svc.partner.city, county: svc.partner.county,
            lines: svc.lines.map((x) => ({ label: x.label, forProduct: x.productName, priceRon: x.saleCents / 100, paintCode: x.paintCode })),
          } : undefined,
        },
      }
    }, { maxWait: 10_000, timeout: 20_000 })
  })
}

/**
 * Storefront orders: validation + persistence (CommerceOrder snapshot + CRM Lead).
 * Prices always come from the catalog (CommerceListing.priceRon, VAT included); the client only sends slug + quantity.
 */
import { createHash } from 'crypto'
import { isIP } from 'net'
import { db, Prisma } from '@repo/db'
import type { StorefrontContext } from './auth'
import { availabilityFor } from './queries'

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

export interface ParsedOrder {
  customer: { name: string; phone: string; email: string }
  shipping: { county: string; city: string; address: string; postalCode: string | null }
  notes: string | null
  items: Array<{ slug: string; quantity: number }>
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
  body.items.forEach((it, i) => {
    if (!isObj(it) || typeof it.slug !== 'string' || !SLUG_RE.test(it.slug)) throw new OrderInputError(`Produsul de pe linia ${i + 1} nu este valid.`)
    const q = it.quantity
    if (typeof q !== 'number' || !Number.isInteger(q) || q < 1 || q > 99) throw new OrderInputError(`Cantitatea produsului de pe linia ${i + 1} trebuie să fie un număr întreg între 1 și 99.`)
    const total = (merged.get(it.slug) ?? 0) + q
    if (total > 99) throw new OrderInputError('Cantitatea maximă pentru un produs este 99.')
    merged.set(it.slug, total)
  })
  return {
    customer: { name, phone, email: emailRaw },
    shipping: { county, city, address, postalCode },
    notes,
    items: [...merged].map(([slug, quantity]) => ({ slug, quantity })),
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

export interface CreatedOrder {
  id: string
  number: string
  replay: boolean
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
          select: { id: true, number: true, events: { where: { type: 'created' }, select: { data: true }, take: 1 } },
        })
        if (existing) {
          const prevHash = (existing.events[0]?.data as { bodyHash?: string } | null)?.bodyHash
          if (prevHash && prevHash !== bodyHash) throw new OrderInputError('Această cheie de idempotență a fost folosită pentru o altă comandă.')
          return { id: existing.id, number: existing.number, replay: true }
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
          product: { select: { supplierCode: true, nameRo: true, bulkyClass: true, stock: { select: { rawFlag: true } } } },
        },
      })
      const bySlug = new Map(listings.map((l) => [l.slug, l]))
      const lines = input.items.map((it, i) => {
        const l = bySlug.get(it.slug)
        if (!l || l.priceRon == null) throw new OrderInputError(`Produsul de pe linia ${i + 1} nu mai este disponibil. Te rugăm să actualizezi coșul.`)
        const unit = Math.round(Number(l.priceRon) * 100)
        return {
          l, quantity: it.quantity, unit, line: unit * it.quantity,
          name: (l.product.nameRo ?? l.product.supplierCode).slice(0, 300),
          bulky: l.product.bulkyClass === 'large' || l.product.bulkyClass === 'xlarge',
          availability: availabilityFor(l.product.stock, ctx.stockFlagMeaning),
        }
      })
      const totalCents = lines.reduce((a, x) => a + x.line, 0)
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
          customer: input.customer, shippingAddress: input.shipping, notes: input.notes,
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
              data: { ip: meta.ip, userAgent: meta.userAgent?.slice(0, 200) ?? null, bodyHash, bulky, shipping: 'confirmat la comandă' },
            }],
          },
        },
        select: { id: true },
      })

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
        `Total produse (TVA inclus): ${ron(totalCents)}${bulky ? ' — produse voluminoase' : ''}`,
        `Livrare: ${sh.address}, ${sh.city}, ${sh.county}${sh.postalCode ? `, ${sh.postalCode}` : ''}`,
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
              id: order.id, number, status: ORDER_STATUS, paymentMethod: 'cod', productsTotalRon: totalCents / 100,
              shippingNote: 'confirmat la comandă', bulky, items: itemsSnap,
            },
            existingClientId: client?.id ?? null,
          } as Prisma.InputJsonValue,
        },
        select: { id: true },
      })
      await tx.commerceOrderEvent.create({ data: { orderId: order.id, type: 'lead_created', message: 'Lead creat în CRM', data: { leadId: lead.id } } })

      return {
        id: order.id, number, replay: false,
        summary: {
          number, customer: input.customer, shipping: input.shipping, notes: input.notes, bulky, leadId: lead.id, businessLineId: ctx.businessLineId,
          items: lines.map((x) => ({ name: x.name, sku: x.l.product.supplierCode, quantity: x.quantity, unitPriceRon: x.unit / 100, totalRon: x.line / 100 })),
          totalRon: totalCents / 100,
        },
      }
    }, { maxWait: 10_000, timeout: 20_000 })
  })
}

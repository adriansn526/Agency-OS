import { NextResponse } from 'next/server'
import { storefrontHandler } from '@/lib/commerce/storefront/auth'
import {
  clientIp, createStorefrontOrder, OrderBusyError, OrderInputError, OrderRateLimitError, parseIdempotencyKey, parseOrderInput,
} from '@/lib/commerce/storefront/orders'
import { notifyNewOrder } from '@/lib/commerce/storefront/order-notify'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_BODY = 64 * 1024
const H = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
const fail = (error: string, status: number, extra?: Record<string, string>) => NextResponse.json({ error }, { status, headers: { ...H, ...extra } })

/**
 * POST /api/storefront/orders   (Authorization: Bearer <storefront key>, optional Idempotency-Key)
 * Body: { customer:{name,phone,email}, shipping:{county,city,address,postalCode?}, paymentMethod:'cod', notes?, items:[{slug,quantity}] }
 * 201 { id, number } · 400 malformed · 422 validation (message is customer-facing, Romanian) · 429 + Retry-After (max 5 orders/hour
 * per e-mail, phone or IP — IP = leftmost X-Forwarded-For) · 503 + Retry-After on internal errors. Prices are never read from the body.
 */
export const POST = storefrontHandler(async (req, ctx) => {
  try {
    const raw = await req.text()
    if (raw.length > MAX_BODY) throw new OrderInputError('Cererea este prea mare.', 400)
    let body: unknown
    try { body = JSON.parse(raw) } catch { throw new OrderInputError('Cererea nu este un JSON valid.', 400) }
    const input = parseOrderInput(body)
    const idempotencyKey = parseIdempotencyKey(req.headers.get('idempotency-key'))

    const order = await createStorefrontOrder(ctx, input, { idempotencyKey, ip: clientIp(req), userAgent: req.headers.get('user-agent') })
    if (order.summary) void notifyNewOrder(order.summary)
    return NextResponse.json({ id: order.id, number: order.number }, { status: 201, headers: H })
  } catch (e) {
    if (e instanceof OrderInputError) return fail(e.message, e.status)
    if (e instanceof OrderRateLimitError) return fail('Ai trimis prea multe comenzi într-un interval scurt. Te rugăm să încerci din nou mai târziu.', 429, { 'Retry-After': String(e.retryAfterSec) })
    if (e instanceof OrderBusyError) return fail('Sistemul este momentan suprasolicitat. Te rugăm să încerci din nou în câteva secunde.', 503, { 'Retry-After': '5' })
    console.error('[storefront/orders]', e)
    return fail('Momentan nu putem înregistra comanda. Te rugăm să încerci din nou în câteva minute.', 503, { 'Retry-After': '30' })
  }
})

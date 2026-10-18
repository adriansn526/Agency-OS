import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { db } from '@repo/db'
import { websiteHandler } from '@/lib/website/storefront/auth'
import { AdminError } from '@/lib/website/admin/errors'
import { createRequest } from '@/lib/website/requests/service'
import { defaultNotifier, siteUrlOf } from '@/lib/website/partner/notify'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/storefront/website/requests (ws_ key, server-to-server)
 * { type:'direct'|'general', companySlug? (direct), category, county, city?, description, budgetRon?, urgency?, name, email, phone, consent:true, sourcePage?, ip? }
 * → 201 { id, firms } · 422 validation · 429 too many requests from the same contact. A general request nobody can serve is stored as "unrouted" (firms: 0).
 */
export const POST = websiteHandler(async (req, ctx) => {
  const body = await req.json().catch(() => null)
  try {
    const [line, channel] = await Promise.all([db.businessLine.findUnique({ where: { id: ctx.businessLineId }, select: { slug: true } }), db.websiteChannel.findUnique({ where: { businessLineId: ctx.businessLineId }, select: { siteUrl: true } })])
    const r = await createRequest(ctx.businessLineId, body, { notifier: defaultNotifier(line?.slug), siteUrl: siteUrlOf(channel?.siteUrl) })
    return NextResponse.json(r, { status: 201, headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    if (e instanceof ZodError) return NextResponse.json({ error: e.issues[0]?.message ?? 'invalid', issues: e.issues.map((i) => ({ path: i.path.join('.'), message: i.message })) }, { status: 422 })
    if (e instanceof AdminError) return NextResponse.json({ error: e.message }, { status: e.status })
    throw e
  }
})

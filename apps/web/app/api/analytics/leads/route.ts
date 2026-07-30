/**
 * Lead Analytics API
 * Aggregates form submission data with breakdowns
 *
 * GET /api/analytics/leads
 *   ?clientId=xxx     Filter by client
 *   ?domain=xxx       Filter by source domain
 *   ?from=2026-01-01  Start date
 *   ?to=2026-06-30    End date
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@repo/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const clientId = searchParams.get('clientId')
  const domain = searchParams.get('domain')
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  // Build where clause
  const where: Record<string, any> = {
    deletedAt: null,
    sourceDomain: { not: null }, // Only form leads (have a source domain)
  }
  if (clientId) {
    // Find leads associated with this client's business line
    const client = await db.client.findUnique({
      where: { id: clientId },
      select: { businessLineId: true, websites: true, website: true },
    })
    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

    // Match leads by sourceDomain matching client's websites
    const domains = [...(client.websites || [])]
    if (client.website) domains.push(client.website.replace(/^https?:\/\//, '').replace(/\/$/, ''))
    if (domains.length > 0) {
      where.sourceDomain = { in: domains }
    }
  }
  if (domain) {
    where.sourceDomain = domain
  }
  if (from || to) {
    where.createdAt = {}
    if (from) where.createdAt.gte = new Date(from)
    if (to) where.createdAt.lte = new Date(to + 'T23:59:59Z')
  }

  try {
    // All matching leads
    const leads = await db.lead.findMany({
      where,
      select: {
        id: true,
        sourceDomain: true,
        sourcePage: true,
        sourceService: true,
        utmSource: true,
        utmMedium: true,
        utmCampaign: true,
        convertedToId: true,
        createdAt: true,
        companyName: true,
        email: true,
        phone: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    const total = leads.length
    const converted = leads.filter(l => l.convertedToId).length

    // ── Breakdown by page ──
    const pageMap = new Map<string, { count: number; converted: number }>()
    for (const l of leads) {
      const page = l.sourcePage || '/'
      const entry = pageMap.get(page) || { count: 0, converted: 0 }
      entry.count++
      if (l.convertedToId) entry.converted++
      pageMap.set(page, entry)
    }
    const byPage = [...pageMap.entries()]
      .map(([page, v]) => ({ page, count: v.count, converted: v.converted, conversionRate: v.count > 0 ? Math.round((v.converted / v.count) * 100) : 0 }))
      .sort((a, b) => b.count - a.count)

    // ── Breakdown by service ──
    const serviceMap = new Map<string, { count: number; converted: number }>()
    for (const l of leads) {
      const svc = l.sourceService || 'Nespecificat'
      const entry = serviceMap.get(svc) || { count: 0, converted: 0 }
      entry.count++
      if (l.convertedToId) entry.converted++
      serviceMap.set(svc, entry)
    }
    const byService = [...serviceMap.entries()]
      .map(([service, v]) => ({ service, count: v.count, converted: v.converted }))
      .sort((a, b) => b.count - a.count)

    // ── Breakdown by source domain ──
    const domainMap = new Map<string, { count: number; converted: number }>()
    for (const l of leads) {
      const d = l.sourceDomain || 'unknown'
      const entry = domainMap.get(d) || { count: 0, converted: 0 }
      entry.count++
      if (l.convertedToId) entry.converted++
      domainMap.set(d, entry)
    }
    const byDomain = [...domainMap.entries()]
      .map(([sourceDomain, v]) => ({ domain: sourceDomain, count: v.count, converted: v.converted }))
      .sort((a, b) => b.count - a.count)

    // ── Breakdown by UTM source ──
    const utmMap = new Map<string, { count: number; converted: number }>()
    for (const l of leads) {
      const src = l.utmSource || 'direct'
      const entry = utmMap.get(src) || { count: 0, converted: 0 }
      entry.count++
      if (l.convertedToId) entry.converted++
      utmMap.set(src, entry)
    }
    const byUtmSource = [...utmMap.entries()]
      .map(([source, v]) => ({ source, count: v.count, converted: v.converted }))
      .sort((a, b) => b.count - a.count)

    // ── Breakdown by UTM campaign ──
    const campaignMap = new Map<string, { count: number }>()
    for (const l of leads) {
      if (l.utmCampaign) {
        const entry = campaignMap.get(l.utmCampaign) || { count: 0 }
        entry.count++
        campaignMap.set(l.utmCampaign, entry)
      }
    }
    const byCampaign = [...campaignMap.entries()]
      .map(([campaign, v]) => ({ campaign, count: v.count }))
      .sort((a, b) => b.count - a.count)

    // ── Timeline (last 30 days) ──
    const timeline: Record<string, number> = {}
    for (const l of leads) {
      const day = l.createdAt.toISOString().split('T')[0] ?? ''
      if (day) timeline[day] = (timeline[day] || 0) + 1
    }
    const timelineArr = Object.entries(timeline)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // ── Recent leads ──
    const recent = leads.slice(0, 10).map(l => ({
      id: l.id,
      name: l.companyName,
      email: l.email,
      phone: l.phone,
      domain: l.sourceDomain,
      page: l.sourcePage,
      service: l.sourceService,
      utmSource: l.utmSource,
      createdAt: l.createdAt,
    }))

    return NextResponse.json({
      total,
      converted,
      conversionRate: total > 0 ? Math.round((converted / total) * 100) : 0,
      byPage,
      byService,
      byDomain,
      byUtmSource,
      byCampaign,
      timeline: timelineArr,
      recent,
    })
  } catch (err: any) {
    console.error('[Lead Analytics] Failed:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

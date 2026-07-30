import { NextRequest, NextResponse } from 'next/server'
import { db } from '@repo/db'
import { aggregateDomainReport } from '@/lib/reports/aggregator'

/**
 * GET /api/reports/live
 * 
 * Returns live aggregated data for the admin dashboard.
 * Required: clientId, domain
 * Optional: from, to (date range, defaults to last 30 days)
 * 
 * This endpoint is authenticated (admin only) and returns all data
 * including cost data, search terms, etc.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')
    const domain = searchParams.get('domain')
    const dateFrom = searchParams.get('from') || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
    const dateTo = searchParams.get('to') || new Date().toISOString().slice(0, 10)

    if (!clientId || !domain) {
      return NextResponse.json(
        { error: 'clientId și domain sunt obligatorii' },
        { status: 400 }
      )
    }

    // Verify client exists
    const client = await db.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        companyName: true,
        googleAdsCustomerId: true,
        gscSiteUrl: true,
        domainConfigs: {
          where: { domain, isActive: true },
          take: 1,
        },
      },
    })

    if (!client) {
      return NextResponse.json({ error: 'Client negăsit' }, { status: 404 })
    }

    const domainConfigId = client.domainConfigs[0]?.id || null

    // Aggregate all data
    const data = await aggregateDomainReport(
      clientId,
      domain,
      dateFrom,
      dateTo,
      domainConfigId
    )

    // Check if a public report already exists for this client+domain
    const existingReport = await db.clientReport.findFirst({
      where: { clientId, domain, status: 'active' },
      select: {
        id: true,
        token: true,
        title: true,
        sentAt: true,
        viewCount: true,
        viewedAt: true,
        widgets: true,
        showCostData: true,
        _count: { select: { snapshots: true } },
      },
    })

    return NextResponse.json({
      data,
      meta: {
        clientId,
        clientName: client.companyName,
        domain,
        dateRange: { from: dateFrom, to: dateTo },
        domainConfigId,
        existingReport: existingReport ? {
          id: existingReport.id,
          token: existingReport.token,
          title: existingReport.title,
          publicUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://admin.asns.ro'}/report/view/${existingReport.token}`,
          sentAt: existingReport.sentAt,
          viewCount: existingReport.viewCount,
          viewedAt: existingReport.viewedAt,
          widgets: existingReport.widgets,
          showCostData: existingReport.showCostData,
          snapshotCount: existingReport._count.snapshots,
        } : null,
      },
    })
  } catch (error: any) {
    console.error('[API] GET /api/reports/live error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

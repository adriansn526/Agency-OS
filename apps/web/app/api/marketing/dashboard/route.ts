import { NextRequest, NextResponse } from 'next/server'
import { db } from '@repo/db'

// ─── GET /api/marketing/dashboard ───
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const businessLine = searchParams.get('businessLine')

    if (!businessLine) {
      return NextResponse.json({ error: 'businessLine required' }, { status: 400 })
    }

    const bl = await db.businessLine.findUnique({ where: { slug: businessLine } })
    if (!bl) return NextResponse.json({ error: 'Business line not found' }, { status: 404 })

    const blId = bl.id

    // Parallel queries for dashboard KPIs
    const [
      totalContacts,
      optedOutContacts,
      totalSegments,
      totalTemplates,
      campaigns,
      activeCampaigns,
      recentCampaignLeads,
    ] = await Promise.all([
      // Total leads (not opted out, not deleted)
      db.lead.count({
        where: { businessLineId: blId, optOut: false, deletedAt: null },
      }),
      // Opted out leads
      db.lead.count({
        where: { businessLineId: blId, optOut: true },
      }),
      // Segments count
      db.marketingSegment.count({
        where: { businessLineId: blId },
      }),
      // Templates count
      db.marketingTemplate.count({
        where: { businessLineId: blId },
      }),
      // All campaigns with stats
      db.marketingCampaign.findMany({
        where: { businessLineId: blId },
        select: {
          id: true, name: true, channel: true, status: true,
          totalLeads: true, totalSent: true, totalOpened: true, totalConverted: true,
          createdAt: true, sentAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      // Active campaigns count
      db.marketingCampaign.count({
        where: { businessLineId: blId, status: { in: ['running', 'scheduled'] } },
      }),
      // Recent campaign lead events (pipeline)
      db.campaignLead.findMany({
        where: {
          campaign: { businessLineId: blId },
          status: { in: ['opened', 'interested', 'converted'] },
        },
        include: {
          lead: { select: { id: true, companyName: true, contactPerson: true } },
          campaign: { select: { name: true, channel: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ])

    // Calculate aggregate metrics
    const totalSent = campaigns.reduce((sum, c) => sum + c.totalSent, 0)
    const totalOpened = campaigns.reduce((sum, c) => sum + c.totalOpened, 0)
    const totalConverted = campaigns.reduce((sum, c) => sum + c.totalConverted, 0)
    const openRate = totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(1) : '0'
    const conversionRate = totalOpened > 0 ? ((totalConverted / totalOpened) * 100).toFixed(1) : '0'

    // Pipeline stats
    const pipelineStats = await db.campaignLead.groupBy({
      by: ['status'],
      where: { campaign: { businessLineId: blId } },
      _count: { id: true },
    })

    return NextResponse.json({
      data: {
        kpis: {
          totalContacts,
          optedOutContacts,
          totalSegments,
          totalTemplates,
          activeCampaigns,
          totalCampaigns: campaigns.length,
          totalSent,
          totalOpened,
          totalConverted,
          openRate: parseFloat(openRate),
          conversionRate: parseFloat(conversionRate),
        },
        recentCampaigns: campaigns,
        pipelineStats: pipelineStats.map(s => ({
          status: s.status,
          count: s._count.id,
        })),
        recentActivity: recentCampaignLeads,
      },
    })
  } catch (error) {
    console.error('[API] GET /api/marketing/dashboard error:', error)
    return NextResponse.json({ error: 'Failed to fetch dashboard' }, { status: 500 })
  }
}

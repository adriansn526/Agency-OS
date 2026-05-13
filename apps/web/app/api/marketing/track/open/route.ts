import { NextRequest, NextResponse } from 'next/server'
import { db } from '@repo/db'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

// ─── OPTIONS preflight ───
export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS_HEADERS })
}

// ─── GET /api/marketing/track/open?code=xxx ───
// Public endpoint — no auth required
// Called by BL websites when lead opens LP
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')

    if (!code) {
      return NextResponse.json({ error: 'code parameter required' }, { status: 400, headers: CORS_HEADERS })
    }

    const campaignLead = await db.campaignLead.findUnique({
      where: { uniqueCode: code },
      include: {
        lead: {
          select: {
            companyName: true, contactPerson: true, city: true, county: true,
          },
        },
        campaign: {
          include: {
            businessLine: { select: { slug: true, name: true, config: true } },
            template: { select: { body: true, subject: true } },
          },
        },
      },
    })

    if (!campaignLead) {
      return NextResponse.json({ error: 'Invalid tracking code' }, { status: 404, headers: CORS_HEADERS })
    }

    // Update tracking
    await db.campaignLead.update({
      where: { uniqueCode: code },
      data: {
        lpOpenedAt: campaignLead.lpOpenedAt || new Date(),
        lpOpenCount: { increment: 1 },
        status: campaignLead.status === 'sent' || campaignLead.status === 'delivered'
          ? 'opened'
          : campaignLead.status,
      },
    })

    // Update campaign-level stats
    if (campaignLead.status === 'sent' || campaignLead.status === 'delivered') {
      await db.marketingCampaign.update({
        where: { id: campaignLead.campaignId },
        data: { totalOpened: { increment: 1 } },
      }).catch(() => {})
    }

    // Return lead & BL data for LP rendering
    return NextResponse.json({
      lead: campaignLead.lead,
      businessLine: campaignLead.campaign.businessLine,
      campaignName: campaignLead.campaign.name,
    }, { headers: CORS_HEADERS })
  } catch (error) {
    console.error('[API] GET /api/marketing/track/open error:', error)
    return NextResponse.json({ error: 'Tracking error' }, { status: 500, headers: CORS_HEADERS })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@repo/db'

// ─── GET /api/marketing/campaigns ───
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const businessLine = searchParams.get('businessLine')
    const status = searchParams.get('status')

    if (!businessLine) {
      return NextResponse.json({ error: 'businessLine required' }, { status: 400 })
    }

    const where: any = {}
    if (businessLine !== 'all') {
      const bl = await db.businessLine.findUnique({ where: { slug: businessLine } })
      if (!bl) return NextResponse.json({ error: 'Business line not found' }, { status: 404 })
      where.businessLineId = bl.id
    }
    if (status) where.status = status

    const campaigns = await db.marketingCampaign.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        segment: { select: { id: true, name: true } },
        template: { select: { id: true, name: true, channel: true } },
        _count: { select: { campaignLeads: true } },
      },
    })

    return NextResponse.json({ data: campaigns })
  } catch (error) {
    console.error('[API] GET /api/marketing/campaigns error:', error)
    return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 })
  }
}

// ─── POST /api/marketing/campaigns ───
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { businessLineSlug, name, channel, campaignType, segmentId, templateId, scheduledAt, status } = body

    if (!businessLineSlug || !name || !channel || !templateId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const bl = await db.businessLine.findUnique({ where: { slug: businessLineSlug } })
    if (!bl) return NextResponse.json({ error: 'Business line not found' }, { status: 404 })

    const campaign = await db.marketingCampaign.create({
      data: {
        businessLineId: bl.id,
        name,
        channel,
        campaignType: campaignType || 'outbound',
        segmentId: segmentId || null,
        templateId,
        status: status || 'draft',
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      },
      include: {
        segment: { select: { id: true, name: true } },
        template: { select: { id: true, name: true, channel: true } },
      },
    })

    return NextResponse.json({ data: campaign }, { status: 201 })
  } catch (error) {
    console.error('[API] POST /api/marketing/campaigns error:', error)
    return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 })
  }
}

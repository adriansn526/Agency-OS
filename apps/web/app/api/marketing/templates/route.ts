import { NextRequest, NextResponse } from 'next/server'
import { db } from '@repo/db'

// ─── GET /api/marketing/templates ───
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const businessLine = searchParams.get('businessLine')
    const channel = searchParams.get('channel')

    if (!businessLine) {
      return NextResponse.json({ error: 'businessLine required' }, { status: 400 })
    }

    const where: any = {}
    if (businessLine !== 'all') {
      const bl = await db.businessLine.findUnique({ where: { slug: businessLine } })
      if (!bl) return NextResponse.json({ error: 'Business line not found' }, { status: 404 })
      where.businessLineId = bl.id
    }
    if (channel) where.channel = channel

    const templates = await db.marketingTemplate.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { campaigns: true } },
      },
    })

    return NextResponse.json({ data: templates })
  } catch (error) {
    console.error('[API] GET /api/marketing/templates error:', error)
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 })
  }
}

// ─── POST /api/marketing/templates ───
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { businessLineSlug, name, channel, subject, body: templateBody, mediaUrl, mediaType } = body

    if (!businessLineSlug || !name || !channel || !templateBody) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const bl = await db.businessLine.findUnique({ where: { slug: businessLineSlug } })
    if (!bl) return NextResponse.json({ error: 'Business line not found' }, { status: 404 })

    // Auto-detect variables from {{variable_name}} pattern
    const variableMatches = templateBody.match(/\{\{(\w+)\}\}/g) || []
    const variables = [...new Set(variableMatches.map((v: string) => v.replace(/\{\{|\}\}/g, '')))]

    const template = await db.marketingTemplate.create({
      data: {
        businessLineId: bl.id,
        name,
        channel,
        subject: subject || null,
        body: templateBody,
        mediaUrl: mediaUrl || null,
        mediaType: mediaType || null,
        variables,
      },
    })

    return NextResponse.json({ data: template }, { status: 201 })
  } catch (error) {
    console.error('[API] POST /api/marketing/templates error:', error)
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { db, logActivity } from '@repo/db'

// ─── GET /api/communications ───
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')
    const channel = searchParams.get('channel')
    const businessLineId = searchParams.get('businessLineId')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const where: any = {}
    if (clientId) where.clientId = clientId
    if (channel) where.channel = channel
    if (businessLineId) where.businessLineId = businessLineId
    if (search) {
      where.OR = [
        { subject: { contains: search, mode: 'insensitive' } },
        { body: { contains: search, mode: 'insensitive' } },
        { toAddr: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [communications, total] = await Promise.all([
      db.communication.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          client: { select: { id: true, companyName: true, contactPerson: true } },
          businessLine: { select: { id: true, slug: true, name: true } },
        },
      }),
      db.communication.count({ where }),
    ])

    // Stats
    const stats = await db.communication.groupBy({
      by: ['channel'],
      _count: { id: true },
    })

    return NextResponse.json({
      data: communications,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      stats: stats.reduce((acc: Record<string, number>, s: any) => {
        acc[s.channel] = s._count.id
        return acc
      }, {}),
    })
  } catch (error) {
    console.error('[API] GET /api/communications error:', error)
    return NextResponse.json({ error: 'Failed to fetch communications' }, { status: 500 })
  }
}

// ─── POST /api/communications ───
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const communication = await db.communication.create({
      data: {
        businessLineId: body.businessLineId || null,
        clientId: body.clientId || null,
        channel: body.channel,
        direction: body.direction || 'outbound',
        subject: body.subject,
        body: body.body || '',
        fromAddr: body.fromAddr || body.from || null,
        toAddr: body.toAddr || body.to || null,
        emailStatus: body.emailStatus || null,
        phone: body.phone || null,
        callResult: body.callResult || null,
        duration: body.duration || null,
        meetingType: body.meetingType || null,
        meetingUrl: body.meetingUrl || null,
        participants: body.participants || [],
        userId: body.userId || null,
        userName: body.userName || 'System',
        tags: body.tags || [],
        attachments: body.attachments || [],
        metadata: body.metadata || null,
      },
      include: {
        client: { select: { id: true, companyName: true } },
        businessLine: { select: { id: true, slug: true, name: true } },
      },
    })

    // Log activity
    if (body.clientId) {
      await logActivity({
        businessLineId: body.businessLineId || '',
        userId: body.userId || 'system',
        userName: body.userName || 'System',
        action: body.channel === 'call' ? 'call_logged' : body.channel === 'email' ? 'email_sent' : 'communication_logged',
        entityType: 'communication',
        entityId: communication.id,
        entityName: body.subject,
        details: { channel: body.channel, direction: body.direction },
        clientId: body.clientId,
      })
    }

    return NextResponse.json({ data: communication }, { status: 201 })
  } catch (error) {
    console.error('[API] POST /api/communications error:', error)
    return NextResponse.json({ error: 'Failed to create communication' }, { status: 500 })
  }
}

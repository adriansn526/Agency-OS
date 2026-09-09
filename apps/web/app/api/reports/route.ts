import { NextRequest, NextResponse } from 'next/server'
import { db } from '@repo/db'
import { getDefaultWidgetConfigs } from '@/lib/report-widget-catalog'

// Default widgets from the centralized catalog
const DEFAULT_WIDGETS = getDefaultWidgetConfigs()

// ─── GET /api/reports ───
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')
    const businessLine = searchParams.get('businessLine')
    const status = searchParams.get('status') || 'active'

    const where: Record<string, unknown> = {}
    if (clientId) where.clientId = clientId
    if (status !== 'all') where.status = status
    if (businessLine) {
      const bl = await db.businessLine.findFirst({ where: { slug: businessLine } })
      if (bl) where.businessLineId = bl.id
    }

    const reports = await db.clientReport.findMany({
      where,
      include: {
        client: { select: { id: true, companyName: true, contactPerson: true, email: true } },
        businessLine: { select: { id: true, slug: true, name: true, color: true } },
        _count: { select: { snapshots: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      data: reports.map(r => ({
        id: r.id,
        token: r.token,
        title: r.title,
        domain: r.domain,
        status: r.status,
        viewCount: r.viewCount,
        sentAt: r.sentAt,
        viewedAt: r.viewedAt,
        createdAt: r.createdAt,
        client: r.client,
        businessLine: r.businessLine,
        widgets: r.widgets,
        snapshotCount: r._count.snapshots,
        publicUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://admin.asns.ro'}/report/view/${r.token}`,
      })),
    })
  } catch (error: any) {
    console.error('[API] GET /api/reports error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// ─── POST /api/reports ───
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { clientId, title, widgets, notes, domain } = body

    if (!clientId) return NextResponse.json({ error: 'clientId este obligatoriu' }, { status: 400 })

    const client = await db.client.findUnique({
      where: { id: clientId },
      select: { id: true, companyName: true, businessLineId: true },
    })
    if (!client) return NextResponse.json({ error: 'Client negăsit' }, { status: 404 })

    // Check if client+domain combo already has an active report
    const existingWhere: Record<string, unknown> = { clientId, status: 'active' }
    if (domain) existingWhere.domain = domain
    else existingWhere.domain = null
    const existing = await db.clientReport.findFirst({ where: existingWhere })
    if (existing) {
      const domainLabel = domain ? ` pentru domeniul "${domain}"` : ''
      return NextResponse.json({
        error: `Clientul "${client.companyName}"${domainLabel} are deja un raport activ. Arhivează-l mai întâi sau actualizează-l.`,
        existingReportId: existing.id,
        existingToken: existing.token,
      }, { status: 409 })
    }

    const report = await db.clientReport.create({
      data: {
        businessLineId: client.businessLineId,
        clientId: client.id,
        domain: domain || null,
        title: title || (domain ? `Raport Performanță — ${domain}` : 'Raport Performanță'),
        widgets: widgets || DEFAULT_WIDGETS,
        notes: notes || null,
      },
    })

    const publicUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://admin.asns.ro'}/report/view/${report.token}`

    return NextResponse.json({
      data: {
        id: report.id,
        token: report.token,
        title: report.title,
        publicUrl,
        client: client.companyName,
      },
      message: `Raport creat cu succes pentru ${client.companyName}.`,
    }, { status: 201 })
  } catch (error: any) {
    console.error('[API] POST /api/reports error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@repo/db'

// ─── GET /api/reports/public/[token] ───
// Public route — no auth required. Returns report metadata + snapshots.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    const report = await db.clientReport.findUnique({
      where: { token },
      include: {
        client: {
          select: {
            id: true,
            companyName: true,
            contactPerson: true,
            googleAdsCustomerId: true,
            gscSiteUrl: true,
            website: true,
          },
        },
        businessLine: {
          select: { id: true, slug: true, name: true, color: true },
        },
        snapshots: {
          orderBy: { dateFrom: 'desc' },
          take: 12,
          select: {
            id: true,
            dateFrom: true,
            dateTo: true,
            content: true,
            highlights: true,
            createdAt: true,
          },
        },
      },
    })

    if (!report || report.status !== 'active') {
      return NextResponse.json(
        { error: 'Raportul nu a fost găsit sau nu mai este disponibil.' },
        { status: 404 }
      )
    }

    // Track views
    const updateData: Record<string, unknown> = {
      viewCount: { increment: 1 },
    }
    if (!report.viewedAt) {
      updateData.viewedAt = new Date()
    }
    await db.clientReport.update({
      where: { id: report.id },
      data: updateData as any,
    })

    return NextResponse.json({
      data: {
        id: report.id,
        title: report.title,
        notes: report.notes,
        widgets: report.widgets,
        createdAt: report.createdAt,
        client: {
          name: report.client.companyName,
          contact: report.client.contactPerson,
          website: report.client.website,
          hasGoogleAds: !!report.client.googleAdsCustomerId,
          hasGSC: !!report.client.gscSiteUrl,
        },
        businessLine: report.businessLine,
        snapshots: report.snapshots,
      },
    })
  } catch (error: any) {
    console.error('[API] GET /api/reports/public/[token] error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

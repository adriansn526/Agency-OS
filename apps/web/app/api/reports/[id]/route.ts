import { NextRequest, NextResponse } from 'next/server'
import { db } from '@repo/db'

// ─── GET /api/reports/[id] ───
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const report = await db.clientReport.findUnique({
      where: { id },
      include: {
        client: { select: { id: true, companyName: true, contactPerson: true, email: true, googleAdsCustomerId: true, gscSiteUrl: true } },
        businessLine: { select: { id: true, slug: true, name: true, color: true, icon: true } },
        snapshots: { orderBy: { dateFrom: 'desc' }, take: 12 },
      },
    })

    if (!report) return NextResponse.json({ error: 'Raport negăsit' }, { status: 404 })

    return NextResponse.json({
      data: {
        ...report,
        publicUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://admin.asns.ro'}/report/view/${report.token}`,
      },
    })
  } catch (error: any) {
    console.error('[API] GET /api/reports/[id] error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// ─── PATCH /api/reports/[id] ───
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { title, widgets, notes, status } = body

    const updateData: Record<string, unknown> = {}
    if (title !== undefined) updateData.title = title
    if (widgets !== undefined) updateData.widgets = widgets
    if (notes !== undefined) updateData.notes = notes
    if (status !== undefined) updateData.status = status

    const report = await db.clientReport.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ data: report })
  } catch (error: any) {
    console.error('[API] PATCH /api/reports/[id] error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// ─── DELETE /api/reports/[id] ───
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.clientReport.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[API] DELETE /api/reports/[id] error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

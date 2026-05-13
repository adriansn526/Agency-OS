import { NextRequest, NextResponse } from 'next/server'
import { db } from '@repo/db'

// ─── GET /api/projects/[id] ───
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const project = await db.project.findUnique({
      where: { id },
      include: {
        businessLine: { select: { slug: true, name: true, icon: true, color: true } },
        client: { select: { id: true, companyName: true, contactPerson: true, email: true, googleAdsCustomerId: true, ga4PropertyId: true, gscSiteUrl: true } },
        activities: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    })
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    return NextResponse.json({ data: project })
  } catch (error) {
    console.error('[API] GET /api/projects/[id] error:', error)
    return NextResponse.json({ error: 'Failed to fetch project' }, { status: 500 })
  }
}

// ─── PATCH /api/projects/[id] ───
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const existing = await db.project.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    const project = await db.project.update({ where: { id }, data: body })
    return NextResponse.json({ data: project })
  } catch (error) {
    console.error('[API] PATCH /api/projects/[id] error:', error)
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 })
  }
}

// ─── DELETE /api/projects/[id] ───
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.project.update({ where: { id }, data: { status: 'suspendat' } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API] DELETE /api/projects/[id] error:', error)
    return NextResponse.json({ error: 'Failed to archive project' }, { status: 500 })
  }
}

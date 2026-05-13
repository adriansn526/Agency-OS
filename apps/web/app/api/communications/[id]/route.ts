import { NextRequest, NextResponse } from 'next/server'
import { db } from '@repo/db'

// ─── GET /api/communications/[id] ───
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const communication = await db.communication.findUnique({
      where: { id },
      include: {
        client: { select: { id: true, companyName: true, contactPerson: true } },
        businessLine: { select: { id: true, slug: true, name: true } },
      },
    })
    if (!communication) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json({ data: communication })
  } catch (error) {
    console.error('[API] GET /api/communications/[id] error:', error)
    return NextResponse.json({ error: 'Failed to fetch communication' }, { status: 500 })
  }
}

// ─── PATCH /api/communications/[id] ───
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const updateData: any = {}

    if (body.emailStatus !== undefined) updateData.emailStatus = body.emailStatus
    if (body.callResult !== undefined) updateData.callResult = body.callResult
    if (body.duration !== undefined) updateData.duration = body.duration
    if (body.subject !== undefined) updateData.subject = body.subject
    if (body.body !== undefined) updateData.body = body.body
    if (body.tags !== undefined) updateData.tags = body.tags

    const updated = await db.communication.update({
      where: { id },
      data: updateData,
      include: {
        client: { select: { id: true, companyName: true } },
        businessLine: { select: { id: true, slug: true, name: true } },
      },
    })
    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error('[API] PATCH /api/communications/[id] error:', error)
    return NextResponse.json({ error: 'Failed to update communication' }, { status: 500 })
  }
}

// ─── DELETE /api/communications/[id] ───
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.communication.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API] DELETE /api/communications/[id] error:', error)
    return NextResponse.json({ error: 'Failed to delete communication' }, { status: 500 })
  }
}

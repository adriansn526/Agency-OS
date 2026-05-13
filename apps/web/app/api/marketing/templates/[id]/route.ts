import { NextRequest, NextResponse } from 'next/server'
import { db } from '@repo/db'

// ─── GET /api/marketing/templates/[id] ───
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const template = await db.marketingTemplate.findUnique({
      where: { id },
      include: {
        businessLine: { select: { slug: true, name: true } },
        _count: { select: { campaigns: true } },
      },
    })
    if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    return NextResponse.json({ data: template })
  } catch (error) {
    console.error('[API] GET /api/marketing/templates/[id] error:', error)
    return NextResponse.json({ error: 'Failed to fetch template' }, { status: 500 })
  }
}

// ─── PATCH /api/marketing/templates/[id] ───
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, channel, subject, body: templateBody, mediaUrl, mediaType } = body

    const updateData: any = {}
    if (name) updateData.name = name
    if (channel) updateData.channel = channel
    if (subject !== undefined) updateData.subject = subject
    if (mediaUrl !== undefined) updateData.mediaUrl = mediaUrl
    if (mediaType !== undefined) updateData.mediaType = mediaType
    if (templateBody) {
      updateData.body = templateBody
      // Re-detect variables
      const variableMatches = templateBody.match(/\{\{(\w+)\}\}/g) || []
      updateData.variables = [...new Set(variableMatches.map((v: string) => v.replace(/\{\{|\}\}/g, '')))]
    }

    const template = await db.marketingTemplate.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ data: template })
  } catch (error) {
    console.error('[API] PATCH /api/marketing/templates/[id] error:', error)
    return NextResponse.json({ error: 'Failed to update template' }, { status: 500 })
  }
}

// ─── DELETE /api/marketing/templates/[id] ───
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.marketingTemplate.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API] DELETE /api/marketing/templates/[id] error:', error)
    return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 })
  }
}

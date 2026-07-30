import { NextRequest, NextResponse } from 'next/server'
import { db } from '@repo/db'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { postId, meta } = body

    if (!postId || !meta) {
      return NextResponse.json({ error: 'postId and meta are required' }, { status: 400 })
    }

    const project = await db.project.findUnique({ where: { id } })
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    const metadata = (project.metadata as any) || {}
    const wpSeoCache = metadata.wpSeoCache || {}
    const actualPostId = postId.toString()

    wpSeoCache[actualPostId] = {
      ...(wpSeoCache[actualPostId] || {}),
      ...meta
    }

    await db.project.update({
      where: { id },
      data: {
        metadata: {
          ...metadata,
          wpSeoCache
        }
      }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[API] PATCH /api/projects/[id]/wp-posts/cache error:', error)
    return NextResponse.json({ error: 'Failed to update local WP cache', details: error.message }, { status: 500 })
  }
}

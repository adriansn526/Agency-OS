import { NextRequest, NextResponse } from 'next/server'
import { db } from '@repo/db'

export async function POST(request: NextRequest) {
  try {
    const { ids } = await request.json()

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Missing or invalid ids array' }, { status: 400 })
    }

    // Delete related activities first if there's no cascade
    await db.activity.deleteMany({
      where: { leadId: { in: ids } }
    })

    const result = await db.lead.deleteMany({
      where: {
        id: {
          in: ids
        }
      }
    })

    return NextResponse.json({ success: true, count: result.count }, { status: 200 })
  } catch (error) {
    console.error('[API] POST /api/leads/bulk-delete error:', error)
    return NextResponse.json({ error: 'Failed to delete leads' }, { status: 500 })
  }
}

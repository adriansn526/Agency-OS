import { NextRequest, NextResponse } from 'next/server'
import { db } from '@repo/db'

// GET /api/leads/saved-views?businessLineId=...
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const businessLineId = searchParams.get('businessLineId')

    if (!businessLineId) {
      return NextResponse.json({ error: 'Missing businessLineId' }, { status: 400 })
    }

    const views = await db.savedView.findMany({
      where: {
        businessLineId,
        entityType: 'lead'
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(views)
  } catch (error) {
    console.error('Error fetching saved views:', error)
    return NextResponse.json({ error: 'Failed to fetch saved views' }, { status: 500 })
  }
}

// POST /api/leads/saved-views
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { businessLineId, name, icon, color, filters, userId } = body

    if (!businessLineId || !name || !filters) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const view = await db.savedView.create({
      data: {
        businessLineId,
        name,
        icon,
        color,
        filters,
        userId, // optional
        entityType: 'lead'
      }
    })

    return NextResponse.json(view, { status: 201 })
  } catch (error) {
    console.error('Error saving view:', error)
    return NextResponse.json({ error: 'Failed to save view' }, { status: 500 })
  }
}

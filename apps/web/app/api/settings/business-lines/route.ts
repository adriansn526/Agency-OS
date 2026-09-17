import { NextResponse } from 'next/server'
import { db, businessLineConfigSchema } from '@repo/db'

// ─── GET /api/settings/business-lines ───
// Returns all active business lines
export async function GET() {
  try {
    const businessLines = await db.businessLine.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ data: businessLines })
  } catch (error) {
    console.error('[API] GET /api/settings/business-lines error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch business lines' },
      { status: 500 }
    )
  }
}

// ─── POST /api/settings/business-lines ───
export async function POST(req: Request) {
  try {
    const body = await req.json()
    
    // Validate config payload
    const parsedConfig = businessLineConfigSchema.parse(body.config || {
      entityTypes: [], projectTemplates: [], offerTemplates: [], metrics: []
    })

    const slug = body.name.toLowerCase().replace(/[^a-z0-9]/g, '-')

    const newBL = await db.businessLine.create({
      data: {
        name: body.name,
        slug,
        icon: body.icon || '🏢',
        color: body.color || '#2563eb',
        isActive: true,
        config: parsedConfig,
      }
    })

    return NextResponse.json({ data: newBL })
  } catch (error: any) {
    console.error('[API] POST /api/settings/business-lines error:', error)
    return NextResponse.json(
      { error: 'Failed to create business line', details: error?.issues || error.message },
      { status: 400 }
    )
  }
}

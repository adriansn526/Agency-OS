import { NextResponse } from 'next/server'
import { db } from '@repo/db'
import { headers } from 'next/headers'

// POST /api/offers/public/[token]/events — Ingest tracking events
export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const body = await req.json()
    const events: Array<{ type: string; metadata?: Record<string, any> }> = body.events || [body]

    const delivery = await db.offerDelivery.findUnique({
      where: { token },
      select: { id: true, trackingEnabled: true },
    })

    if (!delivery) {
      return NextResponse.json({ error: 'Delivery not found' }, { status: 404 })
    }

    if (!delivery.trackingEnabled) {
      return NextResponse.json({ ok: true, tracked: false })
    }

    // Extract request info
    const headersList = await headers()
    const ua = headersList.get('user-agent') || ''
    const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() || headersList.get('x-real-ip') || 'unknown'
    const device = /mobile|android|iphone|ipad/i.test(ua) ? 'mobile' : /tablet/i.test(ua) ? 'tablet' : 'desktop'

    // Batch create events
    const validTypes = ['opened', 'section_viewed', 'time_on_section', 'scroll_depth', 'pdf_downloaded', 'revisited']
    const validEvents = events.filter(e => validTypes.includes(e.type))

    if (validEvents.length > 0) {
      await db.offerEvent.createMany({
        data: validEvents.map(e => ({
          deliveryId: delivery.id,
          type: e.type,
          metadata: e.metadata || {},
          ip,
          userAgent: ua.slice(0, 500),
          device,
        })),
      })
    }

    return NextResponse.json({ ok: true, tracked: validEvents.length })
  } catch (error) {
    console.error('[API] POST /api/offers/public/[token]/events error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

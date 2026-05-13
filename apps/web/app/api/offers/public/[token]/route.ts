import { NextResponse } from 'next/server'
import { db } from '@repo/db'
import { headers } from 'next/headers'

// GET /api/offers/public/[token] — Public: returnează oferta pentru pagina publică
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    // Try finding by delivery token first
    let delivery = await db.offerDelivery.findUnique({
      where: { token },
      include: {
        offer: {
          select: {
            id: true,
            number: true,
            entityName: true,
            entityType: true,
            templateName: true,
            value: true,
            currency: true,
            validUntil: true,
            blocks: true,
            customFields: true,
            status: true,
            businessLineId: true,
          },
        },
      },
    })

    // Fallback: token might be an offer ID (preview mode from editor)
    if (!delivery) {
      const offer = await db.offer.findUnique({
        where: { id: token },
        select: {
          id: true,
          number: true,
          entityName: true,
          entityType: true,
          templateName: true,
          value: true,
          currency: true,
          validUntil: true,
          blocks: true,
          customFields: true,
          status: true,
          businessLineId: true,
        },
      })
      if (offer) {
        // Return offer directly in preview mode (no delivery tracking)
        return NextResponse.json({
          offer,
          delivery: { id: 'preview', token, trackingEnabled: false, clientResponse: null, totalViews: 0 },
        })
      }
      return NextResponse.json({ error: 'Offer not found' }, { status: 404 })
    }

    if (!delivery.offer) {
      return NextResponse.json({ error: 'Offer not found' }, { status: 404 })
    }

    // Detect device
    const headersList = await headers()
    const ua = headersList.get('user-agent') || ''
    const device = /mobile|android|iphone|ipad/i.test(ua) ? 'mobile' : /tablet/i.test(ua) ? 'tablet' : 'desktop'

    // Update view count & timestamps
    const isFirstView = !delivery.firstOpenedAt
    await db.offerDelivery.update({
      where: { id: delivery.id },
      data: {
        totalViews: { increment: 1 },
        lastOpenedAt: new Date(),
        ...(isFirstView ? { firstOpenedAt: new Date() } : {}),
      },
    })

    // Auto-update offer status: trimisa → vizualizata
    if (delivery.offer.status === 'trimisa' && isFirstView) {
      await db.offer.update({
        where: { id: delivery.offer.id },
        data: {
          status: 'vizualizata',
          viewedAt: new Date(),
        },
      })
    }

    // Log opened event if tracking enabled
    if (delivery.trackingEnabled) {
      const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() || headersList.get('x-real-ip') || 'unknown'
      await db.offerEvent.create({
        data: {
          deliveryId: delivery.id,
          type: isFirstView ? 'opened' : 'revisited',
          metadata: { sessionNumber: delivery.totalViews + 1 },
          ip,
          userAgent: ua.slice(0, 500),
          device,
        },
      })
    }

    return NextResponse.json({
      offer: delivery.offer,
      delivery: {
        id: delivery.id,
        token: delivery.token,
        trackingEnabled: delivery.trackingEnabled,
        clientResponse: delivery.clientResponse,
        totalViews: delivery.totalViews + 1,
      },
    })
  } catch (error) {
    console.error('[API] GET /api/offers/public/[token] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { db } from '@repo/db'
import { logActivity } from '@repo/db'

// POST /api/offers/public/[token]/respond — Client accepts/rejects/asks question/schedules demo
export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const body = await req.json()
    const { action, message, demoDate } = body as {
      action: 'accept' | 'reject' | 'question' | 'schedule_demo'
      message?: string
      demoDate?: string // ISO datetime for demo scheduling
    }

    if (!['accept', 'reject', 'question', 'schedule_demo'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const delivery = await db.offerDelivery.findUnique({
      where: { token },
      include: { offer: true },
    })

    if (!delivery) {
      return NextResponse.json({ error: 'Delivery not found' }, { status: 404 })
    }

    // Update delivery
    const clientResponse = action === 'accept' || action === 'schedule_demo'
      ? 'accepted'
      : action === 'reject' ? 'rejected' : delivery.clientResponse
    await db.offerDelivery.update({
      where: { id: delivery.id },
      data: {
        clientResponse,
        clientResponseAt: action !== 'question' ? new Date() : undefined,
        clientMessage: message || undefined,
      },
    })

    // Log event
    await db.offerEvent.create({
      data: {
        deliveryId: delivery.id,
        type: action === 'accept' || action === 'schedule_demo'
          ? 'accepted'
          : action === 'reject' ? 'rejected' : 'question_asked',
        metadata: action === 'schedule_demo'
          ? { demoDate, message: message || undefined }
          : message ? { message } : {},
      },
    })

    // Action-specific logic
    if (action === 'accept') {
      await db.offer.update({
        where: { id: delivery.offerId },
        data: {
          status: 'acceptata',
          acceptedAt: new Date(),
        },
      })

      await logActivity({
        userId: 'client',
        userName: delivery.sentTo || 'Client',
        action: 'status_changed',
        entityType: 'offer',
        entityId: delivery.offerId,
        entityName: delivery.offer.number,
        details: {
          oldStatus: delivery.offer.status,
          newStatus: 'acceptata',
          source: 'client_response',
          respondedVia: 'public_page',
        },
        offerId: delivery.offerId,
      })
    } else if (action === 'schedule_demo') {
      // Update offer status & store demo datetime in customFields
      const existingCustom = (delivery.offer.customFields as Record<string, any>) || {}
      await db.offer.update({
        where: { id: delivery.offerId },
        data: {
          status: 'demo_programat',
          acceptedAt: new Date(),
          customFields: {
            ...existingCustom,
            demo_scheduled_at: demoDate,
            demo_scheduled_by: delivery.sentTo,
          },
        },
      })

      // Log on offer
      await logActivity({
        userId: 'client',
        userName: delivery.sentTo || 'Client',
        action: 'status_changed',
        entityType: 'offer',
        entityId: delivery.offerId,
        entityName: delivery.offer.number,
        details: {
          oldStatus: delivery.offer.status,
          newStatus: 'demo_programat',
          demoDate,
          source: 'client_response',
          respondedVia: 'public_page',
        },
        offerId: delivery.offerId,
      })

      // Try to find associated lead by matching entity name
      const lead = await db.lead.findFirst({
        where: {
          OR: [
            { email: delivery.sentTo || '' },
            { companyName: delivery.offer.entityName },
          ],
        },
      })

      if (lead) {
        await logActivity({
          userId: 'client',
          userName: delivery.sentTo || 'Client',
          action: 'demo_scheduled',
          entityType: 'lead',
          entityId: lead.id,
          entityName: lead.companyName || lead.contactPerson,
          details: {
            demoDate,
            offerNumber: delivery.offer.number,
            scheduledBy: delivery.sentTo,
            source: 'public_page',
          },
          offerId: delivery.offerId,
          leadId: lead.id,
        })
      }
    } else if (action === 'reject') {
      await db.offer.update({
        where: { id: delivery.offerId },
        data: { status: 'respinsa' },
      })

      await logActivity({
        userId: 'client',
        userName: delivery.sentTo || 'Client',
        action: 'status_changed',
        entityType: 'offer',
        entityId: delivery.offerId,
        entityName: delivery.offer.number,
        details: {
          oldStatus: delivery.offer.status,
          newStatus: 'respinsa',
          source: 'client_response',
          reason: message,
        },
        offerId: delivery.offerId,
      })
    } else if (action === 'question') {
      await logActivity({
        userId: 'client',
        userName: delivery.sentTo || 'Client',
        action: 'note_added',
        entityType: 'offer',
        entityId: delivery.offerId,
        entityName: delivery.offer.number,
        details: {
          type: 'client_question',
          message,
          source: 'public_page',
        },
        offerId: delivery.offerId,
      })
    }

    return NextResponse.json({
      ok: true,
      action,
      newStatus: action === 'accept' ? 'acceptata'
        : action === 'schedule_demo' ? 'demo_programat'
        : action === 'reject' ? 'respinsa'
        : delivery.offer.status,
    })
  } catch (error) {
    console.error('[API] POST /api/offers/public/[token]/respond error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


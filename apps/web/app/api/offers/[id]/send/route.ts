import { NextResponse } from 'next/server'
import { db } from '@repo/db'
import { logActivity } from '@repo/db'
import { randomUUID } from 'crypto'
import { sendOfferEmail } from '@/lib/email'

// POST /api/offers/[id]/send — Trimite oferta (generează token, creează delivery, schimbă status)
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const {
      email,
      subject,
      message,
      attachPdf = true,
      enableTracking = true,
      sentBy = 'system',
    } = body as {
      email: string
      subject?: string
      message?: string
      attachPdf?: boolean
      enableTracking?: boolean
      sentBy?: string
    }

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Verify offer exists
    const offer = await db.offer.findUnique({
      where: { id },
      include: {
        client: { select: { companyName: true, contactPerson: true } },
        businessLine: { select: { slug: true, name: true } },
      },
    })
    if (!offer) {
      return NextResponse.json({ error: 'Offer not found' }, { status: 404 })
    }

    // Generate unique token: UUID + short hash
    const token = `${randomUUID().split('-')[0]}-${Date.now().toString(36)}`

    // Create delivery record
    const delivery = await db.offerDelivery.create({
      data: {
        offerId: id,
        token,
        sentTo: email,
        sentBy,
        emailSubject: subject || `Ofertă ${offer.number} — ${offer.templateName}`,
        emailMessage: message,
        pdfAttached: attachPdf,
        trackingEnabled: enableTracking,
      },
    })

    // Update offer status to 'trimisa' (only from draft)
    const isFirstSend = !offer.sentAt
    if (offer.status === 'draft' || !offer.sentAt) {
      await db.offer.update({
        where: { id },
        data: {
          status: offer.status === 'draft' ? 'trimisa' : offer.status,
          ...(isFirstSend ? { sentAt: new Date() } : {}),
        },
      })
    }

    // Log activity
    await logActivity({
      userId: sentBy || 'system',
      userName: sentBy || 'System',
      action: 'status_changed',
      entityType: 'offer',
      entityId: id,
      entityName: offer.number,
      details: {
        oldStatus: offer.status,
        newStatus: 'trimisa',
        sentTo: email,
        token,
        deliveryId: delivery.id,
      },
      offerId: id,
    })

    // Construct public URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3100'
    const publicUrl = `${baseUrl}/offer/view/${token}`

    // Send email via AWS SES
    let emailSent = false
    let emailError: string | undefined
    try {
      const emailSubject = subject || `Ofertă ${offer.number} — ${offer.templateName}`
      await sendOfferEmail({
        to: email,
        subject: emailSubject,
        offerNumber: offer.number,
        templateName: offer.templateName,
        clientName: offer.client?.companyName || offer.client?.contactPerson || '',
        totalValue: Number(offer.value) || 0,
        currency: offer.currency || 'EUR',
        publicUrl,
        message: message || undefined,
        businessLine: offer.businessLine?.slug || undefined,
      })
      emailSent = true
      console.log(`[SES] Email sent to ${email} for offer ${offer.number}`)
    } catch (err: any) {
      emailError = err.message || 'Failed to send email'
      console.error(`[SES] Failed to send email to ${email}:`, err)
    }

    return NextResponse.json({
      delivery: {
        id: delivery.id,
        token: delivery.token,
        sentTo: email,
        sentAt: delivery.sentAt,
      },
      publicUrl,
      emailSent,
      emailError,
    })
  } catch (error) {
    console.error('[API] POST /api/offers/[id]/send error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

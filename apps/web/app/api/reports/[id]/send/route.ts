import { NextRequest, NextResponse } from 'next/server'
import { db } from '@repo/db'
import { sendReportEmailWithAttachments, EmailAttachment } from '@/lib/email'

// ─── POST /api/reports/[id]/send ───
// Sends report email to client with public link, optional CC, message, and PDF attachments
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Parse as FormData (supports file uploads) or JSON
    const contentType = request.headers.get('content-type') || ''
    let to: string = ''
    let cc: string[] = []
    let message: string = ''
    const attachments: EmailAttachment[] = []

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      to = formData.get('to') as string || ''
      message = formData.get('message') as string || ''
      
      // Parse CC (comma-separated string)
      const ccRaw = formData.get('cc') as string || ''
      cc = ccRaw.split(',').map(e => e.trim()).filter(e => e.length > 0 && e.includes('@'))

      // Parse file attachments
      const files = formData.getAll('attachments') as File[]
      for (const file of files) {
        if (file && file.size > 0) {
          const buffer = Buffer.from(await file.arrayBuffer())
          attachments.push({
            filename: file.name,
            content: buffer,
            contentType: file.type || 'application/pdf',
          })
        }
      }
    } else {
      const body = await request.json()
      to = body.to || ''
      cc = body.cc || []
      message = body.message || ''
    }

    const report = await db.clientReport.findUnique({
      where: { id },
      include: {
        client: { select: { companyName: true, contactPerson: true, email: true } },
        businessLine: { select: { slug: true, name: true } },
        snapshots: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    })

    if (!report) return NextResponse.json({ error: 'Raport negăsit' }, { status: 404 })

    const recipientEmail = to || report.client.email
    if (!recipientEmail) {
      return NextResponse.json({ error: 'Lipsește adresa de email' }, { status: 400 })
    }

    const publicUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://admin.asns.ro'}/report/view/${report.token}`

    // Get highlights from latest snapshot
    const highlights: string[] = []
    if (report.snapshots[0]?.highlights && Array.isArray(report.snapshots[0].highlights)) {
      for (const h of report.snapshots[0].highlights as Array<{ label: string; value: string }>) {
        highlights.push(`${h.label}: ${h.value}`)
      }
    }

    const result = await sendReportEmailWithAttachments({
      to: recipientEmail,
      cc: cc.length > 0 ? cc : undefined,
      subject: `${report.title} — ${report.client.companyName}`,
      reportTitle: report.title,
      clientName: report.client.contactPerson || report.client.companyName,
      reportUrl: publicUrl,
      dateRange: 'Ultimele 30 zile',
      highlights: highlights.length > 0 ? highlights : ['Raport complet disponibil'],
      message: message || report.notes || undefined,
      businessLine: report.businessLine.slug,
      attachments: attachments.length > 0 ? attachments : undefined,
    })

    // Update sentAt
    await db.clientReport.update({
      where: { id },
      data: { sentAt: new Date() },
    })

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      sentTo: recipientEmail,
      ccTo: cc,
      attachmentCount: attachments.length,
    })
  } catch (error: any) {
    console.error('[API] POST /api/reports/[id]/send error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@repo/db'
import { sendReportEmailWithAttachments, EmailAttachment } from '@/lib/email'
import { buildReportEmailContent, formatPeriod } from '@/lib/reports/report-email'

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
    let dateFromParam = ''
    let dateToParam = ''
    const attachments: EmailAttachment[] = []

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      to = formData.get('to') as string || ''
      message = formData.get('message') as string || ''
      dateFromParam = (formData.get('dateFrom') as string) || ''
      dateToParam = (formData.get('dateTo') as string) || ''

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
      dateFromParam = body.dateFrom || ''
      dateToParam = body.dateTo || ''
    }

    const report = await db.clientReport.findUnique({
      where: { id },
      include: {
        client: { select: { id: true, companyName: true, contactPerson: true, email: true } },
        businessLine: { select: { slug: true, name: true } },
        snapshots: { orderBy: { dateFrom: 'desc' }, take: 1 },
      },
    })

    if (!report) return NextResponse.json({ error: 'Raport negăsit' }, { status: 404 })

    const recipientEmail = to || report.client.email
    if (!recipientEmail) {
      return NextResponse.json({ error: 'Lipsește adresa de email' }, { status: 400 })
    }

    // Period: explicit > latest AI snapshot > last 30 days
    const latestSnapshot = report.snapshots[0]
    const dateFrom = dateFromParam
      || latestSnapshot?.dateFrom.toISOString().slice(0, 10)
      || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
    const dateTo = dateToParam
      || latestSnapshot?.dateTo.toISOString().slice(0, 10)
      || new Date().toISOString().slice(0, 10)

    const publicUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://admin.asns.ro'}/report/view/${report.token}?from=${dateFrom}&to=${dateTo}`

    const content = report.domain
      ? await buildReportEmailContent({
          clientId: report.client.id,
          domain: report.domain,
          from: dateFrom,
          to: dateTo,
          showCostData: report.showCostData,
        })
      : undefined

    const targetName = report.domain ? report.domain : report.client.companyName
    let finalSubject = report.title
    if (!finalSubject.toLowerCase().includes(targetName.toLowerCase())) {
      finalSubject = `${finalSubject} | ${targetName}`
    }

    const result = await sendReportEmailWithAttachments({
      to: recipientEmail,
      cc: cc.length > 0 ? cc : undefined,
      subject: finalSubject,
      reportTitle: report.title,
      clientName: report.client.contactPerson || report.client.companyName,
      reportUrl: publicUrl,
      dateRange: formatPeriod(dateFrom, dateTo),
      content,
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

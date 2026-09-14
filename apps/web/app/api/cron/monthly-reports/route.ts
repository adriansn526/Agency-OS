import { NextRequest, NextResponse } from "next/server"
import { db } from "@repo/db"
import { sendReportEmailWithAttachments } from "@/lib/email"

export const maxDuration = 60 // Vercel maximum duration

export async function GET(req: NextRequest) {
  // 1. Cron Security Check
  const authHeader = req.headers.get("authorization")
  if (
    process.env.NODE_ENV !== "development" &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}` &&
    req.nextUrl.searchParams.get("force") !== "true"
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // 2. Fetch scheduled reports for today
    const today = new Date()
    const currentDay = today.getDate()
    const currentHour = today.getHours()
    
    const reports = await db.clientReport.findMany({
      where: {
        scheduleEnabled: true,
        scheduleDay: currentDay,
        scheduleHour: currentHour,
        status: "active"
      },
      include: {
        client: { select: { companyName: true, contactPerson: true, email: true } },
        businessLine: { select: { slug: true, name: true } },
      }
    })

    const results = []

    // 3. Calculate full previous month date range
    // E.g., if today is Sept 5, we want Aug 1 to Aug 31
    const firstDayPrevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    const lastDayPrevMonth = new Date(today.getFullYear(), today.getMonth(), 0) // 0 gets last day of previous month
    
    // Format as YYYY-MM-DD (local time assumed to match UTC for simplicity, or just use string formatting)
    const yyyy = firstDayPrevMonth.getFullYear()
    const mm = String(firstDayPrevMonth.getMonth() + 1).padStart(2, '0')
    const startStr = `${yyyy}-${mm}-01`
    
    const lastDay = lastDayPrevMonth.getDate()
    const endStr = `${yyyy}-${mm}-${String(lastDay).padStart(2, '0')}`

    const monthNames = ["Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie", "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie"]
    const monthName = monthNames[firstDayPrevMonth.getMonth()]
    const dateRangeLabel = `Luna ${monthName} ${yyyy} (completă)`

    for (const report of reports) {
      // Build email data
      let recipientEmail = report.scheduleEmails || report.client.email
      if (!recipientEmail) {
        results.push({ reportId: report.id, status: "Failed: No email found" })
        continue
      }
      
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://admin.asns.ro'
      // Append the date range query string to the public url
      const publicUrl = `${baseUrl}/report/view/${report.token}?from=${startStr}&to=${endStr}`

      const emailsList = recipientEmail.split(',').map((e: string) => e.trim()).filter((e: string) => e.length > 0)
      const mainEmail = emailsList[0]!
      const cc = emailsList.length > 1 ? emailsList.slice(1) : undefined

      try {
        await sendReportEmailWithAttachments({
          to: mainEmail,
          cc: cc,
          subject: `${report.title} [${monthName} ${yyyy}] — ${report.client.companyName}`,
          reportTitle: report.title,
          clientName: report.client.contactPerson || report.client.companyName,
          reportUrl: publicUrl,
          dateRange: dateRangeLabel,
          highlights: [], // Omit highlights for cron for now, or just fallback to empty
          message: report.scheduleMessage || report.notes || "Găsiți mai jos raportul detaliat cu performanțele lunii trecute.",
          businessLine: report.businessLine.slug,
          attachments: undefined, // No PDFs
        })

        // Update sentAt
        await db.clientReport.update({
          where: { id: report.id },
          data: { sentAt: new Date() },
        })

        results.push({ reportId: report.id, status: "Success", sentTo: mainEmail })
      } catch (err: any) {
        console.error(`[Cron] Failed to send report ${report.id}:`, err)
        results.push({ reportId: report.id, status: `Error: ${err.message}` })
      }
    }

    return NextResponse.json({ success: true, processed: reports.length, results })
  } catch (error: any) {
    console.error("[Monthly Report Cron] Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

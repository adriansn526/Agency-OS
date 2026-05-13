import { NextRequest, NextResponse } from 'next/server'
import { db } from '@repo/db'

// ─── GET /api/finance/revenue-history ───
// Trend venituri ultimele 12 luni, agregate din facturi
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const businessLine = searchParams.get('businessLine')

    // Resolve optional BL filter
    let blFilter: string | undefined
    if (businessLine) {
      const bl = await db.businessLine.findUnique({ where: { slug: businessLine } })
      if (bl) {
        blFilter = bl.id
      } else {
        return NextResponse.json({ data: { months: [] } })
      }
    }

    // Calculate date range: last 12 months
    const now = new Date()
    const months: { month: string; start: Date; end: Date }[] = []

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const start = new Date(d.getFullYear(), d.getMonth(), 1)
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
      const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      months.push({ month: monthStr, start, end })
    }

    // Get all business lines for per-BL breakdowns
    const allBusinessLines = await db.businessLine.findMany({
      select: { id: true, slug: true },
    })
    const blMap = new Map(allBusinessLines.map((bl) => [bl.id, bl.slug]))

    // Fetch all invoices in the 12-month window
    const firstMonth = months[0]!
    const lastMonth = months[months.length - 1]!
    const dateRange = {
      gte: firstMonth.start,
      lte: lastMonth.end,
    }

    const invoiceWhere = {
      issuedAt: dateRange,
      status: { not: 'anulata' },
      ...(blFilter ? { businessLineId: blFilter } : {}),
    }

    const invoices = await db.invoice.findMany({
      where: invoiceWhere,
      select: {
        businessLineId: true,
        direction: true,
        amount: true,
        issuedAt: true,
      },
    })

    // Aggregate per month
    const result = months.map(({ month, start, end }) => {
      const monthInvoices = invoices.filter((inv) => inv.issuedAt >= start && inv.issuedAt <= end)

      let income = 0
      let expense = 0
      const byBL: Record<string, { income: number; expense: number }> = {}

      for (const inv of monthInvoices) {
        const slug = blMap.get(inv.businessLineId) || 'unknown'

        if (!byBL[slug]) byBL[slug] = { income: 0, expense: 0 }

        if (inv.direction === 'emisa') {
          income += inv.amount
          byBL[slug].income += inv.amount
        } else {
          expense += inv.amount
          byBL[slug].expense += inv.amount
        }
      }

      return {
        month,
        income: Math.round(income * 100) / 100,
        expense: Math.round(expense * 100) / 100,
        profit: Math.round((income - expense) * 100) / 100,
        byBusinessLine: byBL,
      }
    })

    return NextResponse.json({
      data: { months: result },
    })
  } catch (error) {
    console.error('[API] GET /api/finance/revenue-history error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch revenue history' },
      { status: 500 }
    )
  }
}

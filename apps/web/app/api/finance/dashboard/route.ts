import { NextRequest, NextResponse } from 'next/server'
import { db } from '@repo/db'

// ─── GET /api/finance/dashboard ───
// KPI-uri agregate: MRR, venituri, cheltuieli, profit, restanțe, per business line
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const businessLine = searchParams.get('businessLine')

    // ── Step 1: Auto-detect overdue invoices ──
    // Update invoices that are past due date and still unpaid
    await db.invoice.updateMany({
      where: {
        status: { in: ['emisa', 'trimisa'] },
        dueDate: { lt: new Date() },
        paidAt: null,
      },
      data: { status: 'restanta' },
    })

    // ── Step 2: Resolve businessLine filter ──
    let blFilter: string | undefined
    if (businessLine) {
      const bl = await db.businessLine.findUnique({ where: { slug: businessLine } })
      if (bl) {
        blFilter = bl.id
      } else {
        return NextResponse.json({
          data: {
            totalMRR: 0,
            totalRevenue: 0,
            totalExpenses: 0,
            netProfit: 0,
            profitMargin: 0,
            overdueAmount: 0,
            overdueCount: 0,
            byBusinessLine: {},
          },
        })
      }
    }

    // ── Step 3: Get all business lines ──
    const allBusinessLines = await db.businessLine.findMany({
      select: { id: true, slug: true, name: true },
    })
    const blMap = new Map(allBusinessLines.map((bl) => [bl.id, bl]))

    // ── Step 4: Calculate MRR from active retainers ──
    const retainerWhere = { status: 'activ', ...(blFilter ? { businessLineId: blFilter } : {}) }
    const activeRetainers = await db.retainer.findMany({
      where: retainerWhere,
      select: { businessLineId: true, amount: true, billingCycle: true },
    })

    // Group MRR per business line
    const mrrByBL: Record<string, number> = {}
    let totalMRR = 0
    for (const ret of activeRetainers) {
      const monthlyAmount = ret.billingCycle === 'trimestrial' ? ret.amount / 3 : ret.amount
      totalMRR += monthlyAmount
      mrrByBL[ret.businessLineId] = (mrrByBL[ret.businessLineId] || 0) + monthlyAmount
    }

    // ── Step 5: Current month revenue & expenses ──
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

    const invoiceWhere = {
      issuedAt: { gte: startOfMonth, lte: endOfMonth },
      status: { not: 'anulata' },
      ...(blFilter ? { businessLineId: blFilter } : {}),
    }

    const currentMonthInvoices = await db.invoice.findMany({
      where: invoiceWhere,
      select: { businessLineId: true, direction: true, amount: true },
    })

    // Group revenue/expenses per BL
    const revenueByBL: Record<string, number> = {}
    const expensesByBL: Record<string, number> = {}
    let totalRevenue = 0
    let totalExpenses = 0

    for (const inv of currentMonthInvoices) {
      if (inv.direction === 'emisa') {
        totalRevenue += inv.amount
        revenueByBL[inv.businessLineId] = (revenueByBL[inv.businessLineId] || 0) + inv.amount
      } else {
        totalExpenses += inv.amount
        expensesByBL[inv.businessLineId] = (expensesByBL[inv.businessLineId] || 0) + inv.amount
      }
    }

    // ── Step 6: Overdue invoices ──
    const overdueWhere = {
      status: 'restanta',
      ...(blFilter ? { businessLineId: blFilter } : {}),
    }

    const overdueInvoices = await db.invoice.findMany({
      where: overdueWhere,
      select: { businessLineId: true, amount: true },
    })

    let overdueAmount = 0
    const overdueCount = overdueInvoices.length
    for (const inv of overdueInvoices) {
      overdueAmount += inv.amount
    }

    // ── Step 7: Clients count + retainers count per BL ──
    const clientsByBL: Record<string, number> = {}
    const retainersByBL: Record<string, number> = {}

    if (blFilter) {
      clientsByBL[blFilter] = await db.client.count({ where: { businessLineId: blFilter, status: 'activ' } })
      retainersByBL[blFilter] = activeRetainers.filter((r) => r.businessLineId === blFilter).length
    } else {
      for (const bl of allBusinessLines) {
        clientsByBL[bl.id] = await db.client.count({ where: { businessLineId: bl.id, status: 'activ' } })
        retainersByBL[bl.id] = activeRetainers.filter((r) => r.businessLineId === bl.id).length
      }
    }

    // ── Step 8: Build byBusinessLine response ──
    const byBusinessLine: Record<string, {
      mrr: number
      revenue: number
      expenses: number
      profit: number
      clientsCount: number
      retainersCount: number
    }> = {}

    const relevantBLs = blFilter
      ? allBusinessLines.filter((bl) => bl.id === blFilter)
      : allBusinessLines

    for (const bl of relevantBLs) {
      const blRevenue = revenueByBL[bl.id] || 0
      const blExpenses = expensesByBL[bl.id] || 0
      byBusinessLine[bl.slug] = {
        mrr: mrrByBL[bl.id] || 0,
        revenue: blRevenue,
        expenses: blExpenses,
        profit: blRevenue - blExpenses,
        clientsCount: clientsByBL[bl.id] || 0,
        retainersCount: retainersByBL[bl.id] || 0,
      }
    }

    const netProfit = totalRevenue - totalExpenses
    const profitMargin = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 10000) / 100 : 0

    return NextResponse.json({
      data: {
        totalMRR: Math.round(totalMRR * 100) / 100,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalExpenses: Math.round(totalExpenses * 100) / 100,
        netProfit: Math.round(netProfit * 100) / 100,
        profitMargin,
        overdueAmount: Math.round(overdueAmount * 100) / 100,
        overdueCount,
        byBusinessLine,
      },
    })
  } catch (error) {
    console.error('[API] GET /api/finance/dashboard error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@repo/db'

// ─── GET /api/finance/overdue ───
// Facturi restante cu total și detalii
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const businessLine = searchParams.get('businessLine')

    // ── Step 1: Auto-detect overdue invoices ──
    await db.invoice.updateMany({
      where: {
        status: { in: ['emisa', 'trimisa'] },
        dueDate: { lt: new Date() },
        paidAt: null,
      },
      data: { status: 'restanta' },
    })

    // ── Step 2: Build where clause ──
    const where: Record<string, unknown> = { status: 'restanta' }

    if (businessLine) {
      const bl = await db.businessLine.findUnique({ where: { slug: businessLine } })
      if (bl) {
        where.businessLineId = bl.id
      } else {
        return NextResponse.json({
          data: {
            totalAmount: 0,
            count: 0,
            invoices: [],
          },
        })
      }
    }

    // ── Step 3: Fetch overdue invoices ──
    const overdueInvoices = await db.invoice.findMany({
      where,
      orderBy: { dueDate: 'asc' },
      include: {
        client: { select: { id: true, companyName: true, email: true } },
        businessLine: { select: { id: true, slug: true, name: true } },
      },
    })

    let totalAmount = 0
    const invoices = overdueInvoices.map((inv) => {
      totalAmount += inv.amount

      // Calculate days overdue
      const daysOverdue = Math.floor(
        (new Date().getTime() - inv.dueDate.getTime()) / (1000 * 60 * 60 * 24)
      )

      return {
        id: inv.id,
        number: inv.number,
        businessLine: inv.businessLine.slug,
        businessLineName: inv.businessLine.name,
        clientId: inv.clientId,
        clientName: inv.client.companyName,
        clientEmail: inv.client.email,
        amount: inv.amount,
        currency: inv.currency,
        issuedAt: inv.issuedAt.toISOString(),
        dueDate: inv.dueDate.toISOString(),
        daysOverdue,
      }
    })

    return NextResponse.json({
      data: {
        totalAmount: Math.round(totalAmount * 100) / 100,
        count: invoices.length,
        invoices,
      },
    })
  } catch (error) {
    console.error('[API] GET /api/finance/overdue error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch overdue invoices' },
      { status: 500 }
    )
  }
}

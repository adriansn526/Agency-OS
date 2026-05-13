import { NextRequest, NextResponse } from 'next/server'
import { db } from '@repo/db'

// ─── GET /api/finance/mrr ───
// MRR (Monthly Recurring Revenue) per business line
// MRR = suma retainerelor active cu billingCycle='lunar'
//      + (retainerele trimestriale / 3)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const businessLine = searchParams.get('businessLine')

    // Build filter
    const where: Record<string, unknown> = { status: 'activ' }

    if (businessLine) {
      const bl = await db.businessLine.findUnique({ where: { slug: businessLine } })
      if (bl) {
        where.businessLineId = bl.id
      } else {
        return NextResponse.json({ data: { total: 0, byBusinessLine: {} } })
      }
    }

    // Get all active retainers
    const retainers = await db.retainer.findMany({
      where,
      select: {
        businessLineId: true,
        amount: true,
        billingCycle: true,
        serviceName: true,
        client: { select: { companyName: true } },
      },
    })

    // Resolve business lines
    const allBusinessLines = await db.businessLine.findMany({
      select: { id: true, slug: true, name: true },
    })
    const blMap = new Map(allBusinessLines.map((bl) => [bl.id, bl]))

    // Calculate MRR per BL
    const mrrByBL: Record<string, {
      mrr: number
      retainersCount: number
      retainers: { serviceName: string; clientName: string; monthlyAmount: number; billingCycle: string }[]
    }> = {}

    let totalMRR = 0

    for (const ret of retainers) {
      const monthlyAmount = ret.billingCycle === 'trimestrial' ? ret.amount / 3 : ret.amount
      totalMRR += monthlyAmount

      const bl = blMap.get(ret.businessLineId)
      const slug = bl?.slug || ret.businessLineId

      if (!mrrByBL[slug]) {
        mrrByBL[slug] = { mrr: 0, retainersCount: 0, retainers: [] }
      }

      mrrByBL[slug].mrr += monthlyAmount
      mrrByBL[slug].retainersCount += 1
      mrrByBL[slug].retainers.push({
        serviceName: ret.serviceName,
        clientName: ret.client.companyName,
        monthlyAmount: Math.round(monthlyAmount * 100) / 100,
        billingCycle: ret.billingCycle,
      })
    }

    // Round amounts
    for (const key of Object.keys(mrrByBL)) {
      const entry = mrrByBL[key]
      if (entry) {
        entry.mrr = Math.round(entry.mrr * 100) / 100
      }
    }

    return NextResponse.json({
      data: {
        total: Math.round(totalMRR * 100) / 100,
        byBusinessLine: mrrByBL,
      },
    })
  } catch (error) {
    console.error('[API] GET /api/finance/mrr error:', error)
    return NextResponse.json(
      { error: 'Failed to calculate MRR' },
      { status: 500 }
    )
  }
}

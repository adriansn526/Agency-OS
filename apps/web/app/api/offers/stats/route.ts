import { NextRequest, NextResponse } from 'next/server'
import { db } from '@repo/db'

// Active statuses for pipeline KPIs
const ACTIVE_STATUSES = ['draft', 'trimisa', 'vizualizata']
const ALL_STATUSES = ['draft', 'trimisa', 'vizualizata', 'acceptata', 'respinsa', 'expirata', 'contract_generat']

// ─── GET /api/offers/stats ───
// KPI-uri dashboard: totalActive, totalValue, conversionRate, avgTimeToClose, byStatus, byBusinessLine
export async function GET(_request: NextRequest) {
  try {
    // Fetch all offers (we need them for detailed stats)
    const allOffers = await db.offer.findMany({
      select: {
        id: true,
        businessLineId: true,
        status: true,
        value: true,
        currency: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    // Fetch business lines for labels
    const businessLines = await db.businessLine.findMany({
      select: { id: true, slug: true, name: true },
    })
    const blMap = new Map(businessLines.map((bl) => [bl.id, bl]))

    // ── Total active (draft + trimisa + vizualizata) ──
    const activeOffers = allOffers.filter((o) => ACTIVE_STATUSES.includes(o.status))
    const totalActive = activeOffers.length
    const totalValue = activeOffers.reduce((sum, o) => sum + o.value, 0)

    // ── Conversion rate = acceptate / (acceptate + respinse) * 100 ──
    const acceptedCount = allOffers.filter((o) => o.status === 'acceptata' || o.status === 'contract_generat').length
    const rejectedCount = allOffers.filter((o) => o.status === 'respinsa').length
    const conversionRate = (acceptedCount + rejectedCount) > 0
      ? Math.round((acceptedCount / (acceptedCount + rejectedCount)) * 10000) / 100
      : 0

    // ── Avg time to close (days from created to accepted) ──
    const closedOffers = allOffers.filter((o) => o.status === 'acceptata' || o.status === 'contract_generat')
    const avgTimeToClose = closedOffers.length > 0
      ? Math.round(
          closedOffers.reduce((sum, o) => {
            const diffMs = o.updatedAt.getTime() - o.createdAt.getTime()
            return sum + diffMs / (1000 * 60 * 60 * 24)
          }, 0) / closedOffers.length
        )
      : 0

    // ── By status ──
    const byStatus: Record<string, { count: number; value: number }> = {}
    for (const status of ALL_STATUSES) {
      const filtered = allOffers.filter((o) => o.status === status)
      byStatus[status] = {
        count: filtered.length,
        value: filtered.reduce((sum, o) => sum + o.value, 0),
      }
    }

    // ── By business line ──
    const byBusinessLine: Record<string, { count: number; value: number; conversionRate: number }> = {}
    for (const bl of businessLines) {
      const blOffers = allOffers.filter((o) => o.businessLineId === bl.id)
      const blAccepted = blOffers.filter((o) => o.status === 'acceptata' || o.status === 'contract_generat').length
      const blRejected = blOffers.filter((o) => o.status === 'respinsa').length
      const blConvRate = (blAccepted + blRejected) > 0
        ? Math.round((blAccepted / (blAccepted + blRejected)) * 10000) / 100
        : 0

      byBusinessLine[bl.slug] = {
        count: blOffers.length,
        value: blOffers.reduce((sum, o) => sum + o.value, 0),
        conversionRate: blConvRate,
      }
    }

    return NextResponse.json({
      totalActive,
      totalValue,
      conversionRate,
      avgTimeToClose,
      byStatus,
      byBusinessLine,
    })
  } catch (error) {
    console.error('[API] GET /api/offers/stats error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch offer stats' },
      { status: 500 }
    )
  }
}

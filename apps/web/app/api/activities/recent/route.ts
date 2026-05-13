import { NextRequest, NextResponse } from 'next/server'
import { db } from '@repo/db'

// ─── GET /api/activities/recent ───
// Ultimele 20 activități (pentru dashboard)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const businessLine = searchParams.get('businessLine')
    const limitParam = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))

    // Build where clause
    const where: Record<string, unknown> = {}

    if (businessLine) {
      const bl = await db.businessLine.findUnique({ where: { slug: businessLine } })
      if (bl) {
        where.businessLineId = bl.id
      }
    }

    const activities = await db.activity.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limitParam,
    })

    // Resolve businessLine names
    const blIds = [...new Set(activities
      .map((a) => a.businessLineId)
      .filter(Boolean) as string[])]
    const businessLines = blIds.length > 0
      ? await db.businessLine.findMany({
          where: { id: { in: blIds } },
          select: { id: true, slug: true, name: true },
        })
      : []
    const blMap = new Map(businessLines.map((bl) => [bl.id, bl]))

    const data = activities.map((activity) => {
      const bl = activity.businessLineId ? blMap.get(activity.businessLineId) : null
      return {
        id: activity.id,
        businessLine: bl?.slug ?? null,
        businessLineName: bl?.name ?? null,
        userId: activity.userId,
        userName: activity.userName,
        action: activity.action,
        entityType: activity.entityType,
        entityId: activity.entityId,
        entityName: activity.entityName,
        details: activity.details,
        createdAt: activity.createdAt.toISOString(),
        clientId: activity.clientId,
        leadId: activity.leadId,
        projectId: activity.projectId,
        offerId: activity.offerId,
        contractId: activity.contractId,
      }
    })

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[API] GET /api/activities/recent error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recent activities' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@repo/db'
import type { Prisma } from '@repo/db'

// ─── GET /api/activities ───
// Lista activități paginată cu filtre multiple
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl

    // Parse query parameters
    const businessLine = searchParams.get('businessLine')
    const entityType = searchParams.get('entityType')
    const action = searchParams.get('action')
    const userId = searchParams.get('userId')
    const entityId = searchParams.get('entityId')
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))

    // Build where clause
    const where: Prisma.ActivityWhereInput = {}

    // Filter by businessLine slug → resolve to businessLineId
    if (businessLine) {
      const bl = await db.businessLine.findUnique({ where: { slug: businessLine } })
      if (bl) {
        where.businessLineId = bl.id
      } else {
        // If BL not found, return empty
        return NextResponse.json({
          data: [],
          pagination: { page, limit, total: 0, totalPages: 0 },
        })
      }
    }

    if (entityType) where.entityType = entityType
    if (action) where.action = action
    if (userId) where.userId = userId
    if (entityId) where.entityId = entityId

    // Date range filter
    if (from || to) {
      where.createdAt = {}
      if (from) where.createdAt.gte = new Date(from)
      if (to) where.createdAt.lte = new Date(to + 'T23:59:59.999Z')
    }

    // Execute count + query in parallel
    const [total, activities] = await Promise.all([
      db.activity.count({ where }),
      db.activity.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ])

    // Resolve businessLine names for the response
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

    // Format response
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
        // Relation IDs
        clientId: activity.clientId,
        leadId: activity.leadId,
        projectId: activity.projectId,
        offerId: activity.offerId,
        contractId: activity.contractId,
      }
    })

    return NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('[API] GET /api/activities error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch activities' },
      { status: 500 }
    )
  }
}

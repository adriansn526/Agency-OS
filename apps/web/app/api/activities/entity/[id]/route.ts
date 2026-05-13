import { NextRequest, NextResponse } from 'next/server'
import { db } from '@repo/db'
import type { Prisma } from '@repo/db'

// ─── GET /api/activities/entity/[id] ───
// Toate activitățile asociate unei entități specifice
// Query params: ?entityType=client (opțional, pentru context)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = request.nextUrl
    const entityType = searchParams.get('entityType')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)))

    // Build OR conditions to find all related activities
    // For a client, we want:
    //   - activities where entityId = id
    //   - activities where clientId = id (from projects, offers, contracts)
    const orConditions: Prisma.ActivityWhereInput[] = [
      { entityId: id },
    ]

    // Add relation-based lookups depending on entity type
    if (entityType === 'client' || !entityType) {
      orConditions.push({ clientId: id })
    }
    if (entityType === 'lead' || !entityType) {
      orConditions.push({ leadId: id })
    }
    if (entityType === 'project' || !entityType) {
      orConditions.push({ projectId: id })
    }
    if (entityType === 'offer' || !entityType) {
      orConditions.push({ offerId: id })
    }
    if (entityType === 'contract' || !entityType) {
      orConditions.push({ contractId: id })
    }

    const where: Prisma.ActivityWhereInput = {
      OR: orConditions,
    }

    const [total, activities] = await Promise.all([
      db.activity.count({ where }),
      db.activity.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ])

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
    console.error('[API] GET /api/activities/entity/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch entity activities' },
      { status: 500 }
    )
  }
}

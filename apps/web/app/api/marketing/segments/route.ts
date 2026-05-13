import { NextRequest, NextResponse } from 'next/server'
import { db } from '@repo/db'

// ─── GET /api/marketing/segments ───
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const businessLine = searchParams.get('businessLine')

    if (!businessLine) {
      return NextResponse.json({ error: 'businessLine required' }, { status: 400 })
    }

    let blId: string | undefined
    if (businessLine !== 'all') {
      const bl = await db.businessLine.findUnique({ where: { slug: businessLine } })
      if (!bl) return NextResponse.json({ error: 'Business line not found' }, { status: 404 })
      blId = bl.id
    }

    const segments = await db.marketingSegment.findMany({
      where: blId ? { businessLineId: blId } : {},
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { campaigns: true } },
      },
    })

    // Recalculate contact count for each segment
    const segmentsWithCounts = await Promise.all(
      segments.map(async (seg) => {
        const filters = seg.filters as any[]
        const totalCount = await countLeadsForFilters(seg.businessLineId, filters)
        const excluded = Array.isArray((seg as any).excludedLeadIds) ? ((seg as any).excludedLeadIds as string[]).length : 0
        return { ...seg, contactCount: Math.max(0, totalCount - excluded) }
      })
    )

    return NextResponse.json({ data: segmentsWithCounts })
  } catch (error) {
    console.error('[API] GET /api/marketing/segments error:', error)
    return NextResponse.json({ error: 'Failed to fetch segments' }, { status: 500 })
  }
}

// ─── POST /api/marketing/segments ───
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { businessLineSlug, name, description, filters, excludedLeadIds } = body

    if (!businessLineSlug || !name || !filters) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const bl = await db.businessLine.findUnique({ where: { slug: businessLineSlug } })
    if (!bl) return NextResponse.json({ error: 'Business line not found' }, { status: 404 })

    const totalCount = await countLeadsForFilters(bl.id, filters)
    const excluded = Array.isArray(excludedLeadIds) ? excludedLeadIds : []
    const contactCount = Math.max(0, totalCount - excluded.length)

    const segment = await db.marketingSegment.create({
      data: {
        businessLineId: bl.id,
        name,
        description,
        filters,
        excludedLeadIds: excluded.length > 0 ? excluded : undefined,
        contactCount,
      } as any,
    })

    return NextResponse.json({ data: segment }, { status: 201 })
  } catch (error) {
    console.error('[API] POST /api/marketing/segments error:', error)
    return NextResponse.json({ error: 'Failed to create segment' }, { status: 500 })
  }
}

// ─── Helper: Count leads matching filters ───
const DIRECT_FIELDS = new Set([
  'companyName', 'contactPerson', 'email', 'phone', 'city', 'status',
  'source', 'priority', 'cui', 'county', 'industry', 'caenCode',
  'revenue', 'employees', 'companyStatus', 'foundedYear', 'website',
  'activityDomain', 'services',
  'lastCampaignAt', 'campaignCount',
])

const NUMBER_FIELDS = new Set([
  'revenue', 'employees', 'foundedYear', 'campaignCount',
])

const DATE_FIELDS = new Set(['lastCampaignAt'])

function buildFilterCondition(filter: { field: string; operator: string; value: any }): Record<string, any> | null {
  const { field, operator, value } = filter

  if (field.startsWith('cf.')) {
    const cfKey = field.slice(3)
    return buildCustomFieldCondition(cfKey, operator, value)
  }

  if (!DIRECT_FIELDS.has(field)) return null
  const isNum = NUMBER_FIELDS.has(field)
  const isDate = DATE_FIELDS.has(field)

  // Date fields: value = number of days ago
  if (isDate) {
    switch (operator) {
      case 'not_exists':
        return { [field]: null }
      case 'exists':
        return { [field]: { not: null } }
      case 'gt': {
        const d = new Date(); d.setDate(d.getDate() - Number(value))
        return { [field]: { lt: d } }
      }
      case 'lt': {
        const d = new Date(); d.setDate(d.getDate() - Number(value))
        return { [field]: { gt: d } }
      }
      default:
        return null
    }
  }

  switch (operator) {
    case 'equals':
      return { [field]: isNum ? Number(value) : { equals: value, mode: 'insensitive' } }
    case 'not_equals':
      return { [field]: isNum ? { not: Number(value) } : { not: { equals: value, mode: 'insensitive' } } }
    case 'contains':
      return { [field]: { contains: String(value), mode: 'insensitive' } }
    case 'not_contains':
      return { NOT: { [field]: { contains: String(value), mode: 'insensitive' } } }
    case 'starts_with':
      return { [field]: { startsWith: String(value), mode: 'insensitive' } }
    case 'gt':
      return { [field]: { gt: isNum ? Number(value) : value } }
    case 'gte':
      return { [field]: { gte: isNum ? Number(value) : value } }
    case 'lt':
      return { [field]: { lt: isNum ? Number(value) : value } }
    case 'lte':
      return { [field]: { lte: isNum ? Number(value) : value } }
    case 'exists':
      return { [field]: { not: null } }
    case 'not_exists':
      return { [field]: null }
    case 'in':
      return { [field]: { in: Array.isArray(value) ? value : [value] } }
    default:
      return null
  }
}

/**
 * Build Prisma filter for customFields JSON path
 * Uses Prisma's JSON path filtering
 */
function buildCustomFieldCondition(key: string, operator: string, value: any): Record<string, any> | null {
  const path = ['customFields', key]
  switch (operator) {
    case 'equals':
      return { customFields: { path: [key], equals: isNaN(Number(value)) ? value : Number(value) } }
    case 'not_equals':
      return { NOT: { customFields: { path: [key], equals: isNaN(Number(value)) ? value : Number(value) } } }
    case 'lt':
      return { customFields: { path: [key], lt: Number(value) } }
    case 'lte':
      return { customFields: { path: [key], lte: Number(value) } }
    case 'gt':
      return { customFields: { path: [key], gt: Number(value) } }
    case 'gte':
      return { customFields: { path: [key], gte: Number(value) } }
    case 'contains':
      return { customFields: { path: [key], string_contains: String(value) } }
    default:
      return null
  }
}

async function countLeadsForFilters(businessLineId: string, filters: any[]): Promise<number> {
  const andConditions: Record<string, any>[] = [
    { businessLineId },
    { optOut: false },
    { deletedAt: null },
  ]

  if (Array.isArray(filters)) {
    for (const f of filters) {
      if (f.field && f.operator) {
        const condition = buildFilterCondition(f)
        if (condition) andConditions.push(condition)
      }
    }
  }

  return db.lead.count({ where: { AND: andConditions } as any })
}

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@repo/db'

// ─── GET /api/marketing/segments/[id] ───
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const segment = await db.marketingSegment.findUnique({
      where: { id },
      include: {
        businessLine: { select: { slug: true, name: true } },
        campaigns: { select: { id: true, name: true, status: true, channel: true } },
      },
    })

    if (!segment) return NextResponse.json({ error: 'Segment not found' }, { status: 404 })
    return NextResponse.json({ data: segment })
  } catch (error) {
    console.error('[API] GET /api/marketing/segments/[id] error:', error)
    return NextResponse.json({ error: 'Failed to fetch segment' }, { status: 500 })
  }
}

// ─── PATCH /api/marketing/segments/[id] ───
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, description, filters, excludedLeadIds } = body

    // Build update data
    const updateData: any = {}
    if (name) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (filters) updateData.filters = filters
    if (excludedLeadIds !== undefined) updateData.excludedLeadIds = Array.isArray(excludedLeadIds) ? excludedLeadIds : []

    // Recalculate contactCount if filters or excludes changed
    if (filters || excludedLeadIds !== undefined) {
      const existing = await db.marketingSegment.findUnique({ where: { id }, select: { businessLineId: true } })
      if (existing) {
        const activeFilters = filters || (await db.marketingSegment.findUnique({ where: { id }, select: { filters: true } }))?.filters
        const totalCount = await countLeadsForFilters(existing.businessLineId, activeFilters as any[] || [])
        const excluded = Array.isArray(excludedLeadIds) ? excludedLeadIds : []
        updateData.contactCount = Math.max(0, totalCount - excluded.length)
      }
    }

    const segment = await db.marketingSegment.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ data: segment })
  } catch (error) {
    console.error('[API] PATCH /api/marketing/segments/[id] error:', error)
    return NextResponse.json({ error: 'Failed to update segment' }, { status: 500 })
  }
}

// ─── Helper: count leads for filters ───
async function countLeadsForFilters(businessLineId: string, filters: any[]): Promise<number> {
  const andConditions: Record<string, any>[] = [
    { businessLineId },
    { optOut: false },
    { deletedAt: null },
    { phone: { not: null } },
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

const DIRECT_FIELDS = new Set([
  'companyName', 'contactPerson', 'email', 'phone', 'city', 'status',
  'source', 'priority', 'cui', 'county', 'industry', 'caenCode',
  'revenue', 'employees', 'companyStatus', 'foundedYear', 'website',
  'activityDomain', 'services',
])

const NUMBER_FIELDS = new Set([
  'revenue', 'employees', 'foundedYear',
])

function buildFilterCondition(filter: { field: string; operator: string; value: any }): Record<string, any> | null {
  const { field, operator, value } = filter
  if (field.startsWith('cf.')) {
    const cfKey = field.slice(3)
    switch (operator) {
      case 'equals':
        return { customFields: { path: [cfKey], equals: isNaN(Number(value)) ? value : Number(value) } }
      case 'not_equals':
        return { NOT: { customFields: { path: [cfKey], equals: isNaN(Number(value)) ? value : Number(value) } } }
      case 'lt':
        return { customFields: { path: [cfKey], lt: Number(value) } }
      case 'lte':
        return { customFields: { path: [cfKey], lte: Number(value) } }
      case 'gt':
        return { customFields: { path: [cfKey], gt: Number(value) } }
      case 'gte':
        return { customFields: { path: [cfKey], gte: Number(value) } }
      case 'contains':
        return { customFields: { path: [cfKey], string_contains: String(value) } }
      default:
        return null
    }
  }
  if (!DIRECT_FIELDS.has(field)) return null
  const isNum = NUMBER_FIELDS.has(field)
  switch (operator) {
    case 'equals':
      return { [field]: isNum ? Number(value) : { equals: value, mode: 'insensitive' } }
    case 'not_equals':
      return { [field]: isNum ? { not: Number(value) } : { not: { equals: value, mode: 'insensitive' } } }
    case 'contains':
      return { [field]: { contains: String(value), mode: 'insensitive' } }
    case 'gt':
      return { [field]: { gt: isNum ? Number(value) : value } }
    case 'lt':
      return { [field]: { lt: isNum ? Number(value) : value } }
    default:
      return null
  }
}

// ─── DELETE /api/marketing/segments/[id] ───
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.marketingSegment.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API] DELETE /api/marketing/segments/[id] error:', error)
    return NextResponse.json({ error: 'Failed to delete segment' }, { status: 500 })
  }
}

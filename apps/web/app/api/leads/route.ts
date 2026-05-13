import { NextRequest, NextResponse } from 'next/server'
import { db } from '@repo/db'

/* ── Direct model fields that can be filtered ── */
const DIRECT_FIELDS = new Set([
  'companyName', 'contactPerson', 'email', 'phone', 'city', 'status',
  'source', 'priority', 'probability', 'estimatedValue',
  'phone2', 'phone3', 'email2', 'contactRole',
  'cui', 'county', 'industry', 'caenCode', 'caenDescription',
  'revenue', 'employees', 'companyStatus', 'foundedYear', 'website',
  'activityDomain', 'services',
])

const NUMBER_FIELDS = new Set([
  'probability', 'estimatedValue', 'revenue', 'employees', 'foundedYear',
])

/* ── Build a Prisma "where" clause from a single filter condition ── */
function buildFilterCondition(filter: { field: string; operator: string; value: any }): Record<string, any> | null {
  const { field, operator, value } = filter

  // Custom fields (stored in JSON)
  if (field.startsWith('cf.')) {
    const jsonKey = field.replace('cf.', '')
    // Prisma JSON filtering with path
    switch (operator) {
      case 'exists':
        return { customFields: { path: [jsonKey], not: null as any } } // Prisma doesn't support this well, skip
      case 'not_exists':
        return null // Can't easily query JSON null in Prisma
      default:
        return null // JSON filtering is limited — handled client-side
    }
  }

  // Direct field filtering
  if (!DIRECT_FIELDS.has(field)) return null

  const isNum = NUMBER_FIELDS.has(field)

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
    case 'not_in':
      return { [field]: { notIn: Array.isArray(value) ? value : [value] } }
    default:
      return null
  }
}

// ─── GET /api/leads ───
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const businessLine = searchParams.get('businessLine')
    const entityType = searchParams.get('entityType')
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const filtersParam = searchParams.get('filters')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const sort = searchParams.get('sort') || 'createdAt'
    const order = searchParams.get('order') || 'desc'

    const andConditions: Record<string, any>[] = []

    if (businessLine) {
      const bl = await db.businessLine.findUnique({ where: { slug: businessLine } })
      if (bl) andConditions.push({ businessLineId: bl.id })
    }
    if (entityType) andConditions.push({ entityType })
    if (status) andConditions.push({ status })
    if (search) {
      andConditions.push({
        OR: [
          { companyName: { contains: search, mode: 'insensitive' } },
          { contactPerson: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      })
    }

    // Parse advanced filters
    if (filtersParam) {
      try {
        const filters = JSON.parse(filtersParam)
        if (Array.isArray(filters)) {
          for (const f of filters) {
            if (f.field && f.operator) {
              const condition = buildFilterCondition(f)
              if (condition) andConditions.push(condition)
            }
          }
        }
      } catch {
        // Invalid JSON — ignore
      }
    }

    const where = andConditions.length > 0 ? { AND: andConditions } : {}

    const [data, total] = await Promise.all([
      db.lead.findMany({
        where: where as any,
        include: {
          businessLine: { select: { slug: true, name: true, icon: true, color: true } },
          convertedTo: { select: { id: true, companyName: true } },
        },
        orderBy: { [sort]: order },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.lead.count({ where: where as any }),
    ])

    return NextResponse.json({
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error('[API] GET /api/leads error:', error)
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 })
  }
}

// ─── POST /api/leads ───
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { businessLineSlug, entityType, companyName, contactPerson, email, status, ...rest } = body

    if (!businessLineSlug || !companyName || !contactPerson || !email || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const bl = await db.businessLine.findUnique({ where: { slug: businessLineSlug } })
    if (!bl) return NextResponse.json({ error: 'Business line not found' }, { status: 404 })

    const lead = await db.lead.create({
      data: {
        businessLineId: bl.id,
        entityType: entityType || 'clients',
        companyName, contactPerson, email, status,
        ...rest,
      },
      include: { businessLine: { select: { slug: true, name: true } } },
    })

    db.activity.create({
      data: {
        businessLineId: bl.id,
        userId: 'system', userName: 'System',
        action: 'created',
        entityType: 'lead', entityId: lead.id, entityName: companyName,
        leadId: lead.id,
      },
    }).catch(console.error)

    return NextResponse.json({ data: lead }, { status: 201 })
  } catch (error) {
    console.error('[API] POST /api/leads error:', error)
    return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 })
  }
}

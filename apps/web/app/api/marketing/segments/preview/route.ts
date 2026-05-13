import { NextRequest, NextResponse } from 'next/server'
import { db } from '@repo/db'

// ─── POST /api/marketing/segments/preview ───
// Returns the count of leads matching the given filters
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { businessLineSlug, filters } = body

    if (!businessLineSlug || !filters) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    let blId: string | undefined
    if (businessLineSlug !== 'all') {
      const bl = await db.businessLine.findUnique({ where: { slug: businessLineSlug } })
      if (!bl) return NextResponse.json({ error: 'Business line not found' }, { status: 404 })
      blId = bl.id
    }

    const andConditions: Record<string, any>[] = [
      { optOut: false },
      { deletedAt: null },
      { phone: { not: null } },
    ]
    if (blId) andConditions.push({ businessLineId: blId })

    if (Array.isArray(filters)) {
      for (const f of filters) {
        if (f.field && f.operator) {
          const condition = buildFilterCondition(f)
          if (condition) andConditions.push(condition)
        }
      }
    }

    const where = { AND: andConditions } as any

    const [count, leads] = await Promise.all([
      db.lead.count({ where }),
      db.lead.findMany({
        where,
        select: {
          id: true,
          companyName: true,
          contactPerson: true,
          phone: true,
          email: true,
          city: true,
          address: true,
          cui: true,
          customFields: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ])

    // Extract useful custom fields for display
    const previewLeads = leads.map((l: any) => {
      const cf = (l.customFields as any) || {}
      return {
        id: l.id,
        companyName: l.companyName,
        contactPerson: l.contactPerson,
        phone: l.phone,
        email: l.email,
        city: l.city,
        address: l.address,
        cui: l.cui,
        boltRating: cf.bolt_rating ?? null,
        boltReviews: cf.bolt_reviews ?? null,
        boltUrl: cf.bolt_url ?? null,
        platformDependency: cf.platform_dependency ?? null,
        digitalPresence: cf.digital_presence ?? null,
        lastCampaignAt: l.lastCampaignAt ?? null,
        campaignCount: l.campaignCount ?? 0,
      }
    })

    return NextResponse.json({ count, leads: previewLeads })
  } catch (error) {
    console.error('[API] POST /api/marketing/segments/preview error:', error)
    return NextResponse.json({ error: 'Failed to preview segment' }, { status: 500 })
  }
}

// ─── Filter builder (shared logic) ───

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

const DATE_FIELDS = new Set([
  'lastCampaignAt',
])

function buildFilterCondition(filter: { field: string; operator: string; value: any }): Record<string, any> | null {
  const { field, operator, value } = filter

  if (field.startsWith('cf.')) {
    const cfKey = field.slice(3)
    return buildCustomFieldCondition(cfKey, operator, value)
  }

  if (!DIRECT_FIELDS.has(field)) return null
  const isNum = NUMBER_FIELDS.has(field)
  const isDate = DATE_FIELDS.has(field)

  // Special date handling: value is number of days (e.g. "30" = 30 days ago)
  if (isDate) {
    switch (operator) {
      case 'not_exists':
        return { [field]: null } // Never contacted
      case 'exists':
        return { [field]: { not: null } } // Has been contacted
      case 'gt': {
        // "Ultima campanie > X zile" = contacted more than X days ago
        const date = new Date()
        date.setDate(date.getDate() - Number(value))
        return { [field]: { lt: date } }
      }
      case 'lt': {
        // "Ultima campanie < X zile" = contacted less than X days ago
        const date = new Date()
        date.setDate(date.getDate() - Number(value))
        return { [field]: { gt: date } }
      }
      case 'equals':
        return { [field]: { equals: Number(value) === 0 ? null : new Date(value) } }
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
    default:
      return null
  }
}

function buildCustomFieldCondition(key: string, operator: string, value: any): Record<string, any> | null {
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

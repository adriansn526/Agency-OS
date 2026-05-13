import { NextRequest, NextResponse } from 'next/server'
import { db, logActivity } from '@repo/db'
import type { Prisma } from '@repo/db'
import { readSettings, writeSettings } from '../settings/_store'

// ─── GET /api/contracts ───
// Lista contracte paginată cu filtre: businessLine, status, clientId, offerId
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl

    const businessLine = searchParams.get('businessLine')
    const status = searchParams.get('status')
    const clientId = searchParams.get('clientId')
    const offerId = searchParams.get('offerId')
    const search = searchParams.get('search')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))

    // Build where clause
    const where: Prisma.ContractWhereInput = {}

    // Filter by businessLine slug → resolve to businessLineId
    if (businessLine) {
      const bl = await db.businessLine.findUnique({ where: { slug: businessLine } })
      if (bl) {
        where.businessLineId = bl.id
      } else {
        return NextResponse.json({
          data: [],
          pagination: { page, limit, total: 0, totalPages: 0 },
        })
      }
    }

    if (status) where.status = status
    if (clientId) where.clientId = clientId
    if (offerId) where.offerId = offerId
    if (search) {
      where.OR = [
        { number: { contains: search, mode: 'insensitive' } },
        { client: { companyName: { contains: search, mode: 'insensitive' } } },
      ]
    }

    // Execute count + query in parallel
    const [total, contracts] = await Promise.all([
      db.contract.count({ where }),
      db.contract.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          client: { select: { id: true, companyName: true } },
          businessLine: { select: { id: true, slug: true, name: true } },
          offer: { select: { id: true, number: true } },
        },
      }),
    ])

    const data = contracts.map((c) => ({
      id: c.id,
      number: c.number,
      businessLine: c.businessLine.slug,
      businessLineName: c.businessLine.name,
      offerId: c.offerId,
      offerNumber: c.offer?.number ?? null,
      clientId: c.clientId,
      clientName: c.client.companyName,
      templateId: c.templateId,
      status: c.status,
      value: c.value,
      currency: c.currency,
      duration: c.duration,
      startDate: c.startDate.toISOString(),
      endDate: c.endDate.toISOString(),
      signedAt: c.signedAt?.toISOString() ?? null,
      createdBy: c.createdBy,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }))

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
    console.error('[API] GET /api/contracts error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch contracts' },
      { status: 500 }
    )
  }
}

// ─── POST /api/contracts ───
// Creare/salvare contract din frontend generator
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      offerId,
      businessLine,
      businessLineId: rawBLId,
      clientId,
      templateId,
      companyDetails,
      clientDetails,
      number,
      value,
      currency = 'EUR',
      duration,
      startDate,
      endDate,
      sections,
      sectionOverrides,
      anexa2,
      status = 'draft',
      createdBy = 'system',
    } = body

    // Validate required fields
    if (!clientId || !templateId || !value || !duration || !startDate || !endDate || !sections) {
      return NextResponse.json(
        { error: 'Missing required fields: clientId, templateId, value, duration, startDate, endDate, sections' },
        { status: 400 }
      )
    }

    // Resolve businessLineId: accept either slug or direct id
    let businessLineId = rawBLId
    if (!businessLineId && businessLine) {
      const bl = await db.businessLine.findUnique({ where: { slug: businessLine } })
      if (!bl) {
        return NextResponse.json(
          { error: `Business line "${businessLine}" not found` },
          { status: 404 }
        )
      }
      businessLineId = bl.id
    }

    if (!businessLineId) {
      return NextResponse.json(
        { error: 'businessLine or businessLineId is required' },
        { status: 400 }
      )
    }

    // Validate client exists
    const client = await db.client.findUnique({
      where: { id: clientId },
      select: { id: true, companyName: true },
    })
    if (!client) {
      return NextResponse.json(
        { error: `Client "${clientId}" not found` },
        { status: 404 }
      )
    }

    // Generate contract number if not provided
    let contractNumber = number
    if (!contractNumber) {
      // Read settings for BL-specific numbering
      const settings = readSettings()
      const blRecord = await db.businessLine.findUnique({ where: { id: businessLineId }, select: { slug: true } })
      const blSlug = blRecord?.slug || 'agency'
      const numbering = settings.contracts.numbering[blSlug]

      if (numbering) {
        contractNumber = `${numbering.prefix}-${numbering.year}-${String(numbering.nextNumber).padStart(3, '0')}`
        // Increment for next time
        numbering.nextNumber += 1
        writeSettings(settings)
      } else {
        // Fallback numbering
        const year = new Date().getFullYear()
        const last = await db.contract.findFirst({
          where: { number: { startsWith: `ASNS-${year}` } },
          orderBy: { number: 'desc' },
        })
        const seq = last ? parseInt(last.number.split('-')[2]!) + 1 : 1
        contractNumber = `ASNS-${year}-${String(seq).padStart(3, '0')}`
      }
    }

    // Ensure contract number is unique — if collision, auto-increment suffix
    let attempts = 0
    while (attempts < 20) {
      const existing = await db.contract.findUnique({ where: { number: contractNumber } })
      if (!existing) break
      attempts++
      // Extract numeric suffix and increment
      const parts = contractNumber.split('-')
      const lastPart = parts[parts.length - 1]!
      const num = parseInt(lastPart) + 1
      parts[parts.length - 1] = String(num).padStart(lastPart.length, '0')
      contractNumber = parts.join('-')
    }

    // Merge sectionOverrides into sections
    let resolvedSections = sections
    if (sectionOverrides && typeof sectionOverrides === 'object') {
      resolvedSections = sections.map((s: { id: string; content: string }) => {
        if (sectionOverrides[s.id]) {
          return { ...s, content: sectionOverrides[s.id] }
        }
        return s
      })
    }

    // Create contract
    const contract = await db.contract.create({
      data: {
        number: contractNumber,
        businessLineId,
        offerId: offerId || null,
        clientId,
        templateId,
        sections: resolvedSections as Prisma.InputJsonValue,
        anexa2: (anexa2 as Prisma.InputJsonValue) ?? undefined,
        companyDetails: (companyDetails as Prisma.InputJsonValue) ?? {},
        clientDetails: (clientDetails as Prisma.InputJsonValue) ?? {},
        status,
        value,
        currency,
        duration,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        createdBy,
      },
      include: {
        client: { select: { id: true, companyName: true } },
        businessLine: { select: { id: true, slug: true, name: true } },
        offer: { select: { id: true, number: true } },
      },
    })

    // Mark offer as 'contract_generat' if linked
    if (offerId) {
      try {
        await db.offer.update({
          where: { id: offerId },
          data: { status: 'contract_generat' },
        })
      } catch {
        // Offer might not exist or status might not be updatable — non-critical
        console.warn(`[API] Could not update offer ${offerId} status`)
      }
    }

    // Log activity
    await logActivity({
      businessLineId,
      userId: createdBy,
      userName: createdBy === 'system' ? 'System' : createdBy,
      action: 'created',
      entityType: 'contract',
      entityId: contract.id,
      entityName: `${contractNumber} — ${client.companyName}`,
      details: { value, currency, duration, status, offerId },
      clientId,
      contractId: contract.id,
    })

    return NextResponse.json({
      data: {
        id: contract.id,
        number: contract.number,
        businessLine: contract.businessLine.slug,
        businessLineName: contract.businessLine.name,
        offerId: contract.offerId,
        offerNumber: contract.offer?.number ?? null,
        clientId: contract.clientId,
        clientName: contract.client.companyName,
        templateId: contract.templateId,
        sections: contract.sections,
        anexa2: contract.anexa2,
        companyDetails: contract.companyDetails,
        clientDetails: contract.clientDetails,
        status: contract.status,
        value: contract.value,
        currency: contract.currency,
        duration: contract.duration,
        startDate: contract.startDate.toISOString(),
        endDate: contract.endDate.toISOString(),
        signedAt: null,
        createdBy: contract.createdBy,
        createdAt: contract.createdAt.toISOString(),
        updatedAt: contract.updatedAt.toISOString(),
      },
    }, { status: 201 })
  } catch (error) {
    console.error('[API] POST /api/contracts error:', error)
    return NextResponse.json(
      { error: 'Failed to create contract' },
      { status: 500 }
    )
  }
}

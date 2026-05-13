import { NextRequest, NextResponse } from 'next/server'
import { db, logActivity } from '@repo/db'
import type { Prisma } from '@repo/db'

type RouteContext = { params: Promise<{ id: string }> }

// ─── Helper: generate next offer number ───
async function generateOfferNumber(): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `OF-${year}`
  const last = await db.offer.findFirst({
    where: { number: { startsWith: prefix } },
    orderBy: { number: 'desc' },
  })
  const seq = last ? parseInt(last.number.split('-')[2]!) + 1 : 1
  return `${prefix}-${String(seq).padStart(3, '0')}`
}

// ─── POST /api/offers/[id]/duplicate ───
// Clonare ofertă: citește sursă, generează număr nou, status draft, +30 zile validitate
export async function POST(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params

    // Find source offer
    const source = await db.offer.findUnique({ where: { id } })
    if (!source) {
      return NextResponse.json(
        { error: 'Source offer not found' },
        { status: 404 }
      )
    }

    // Generate new number
    const number = await generateOfferNumber()

    // Calculate new validUntil (+30 days from today)
    const validUntil = new Date()
    validUntil.setDate(validUntil.getDate() + 30)

    // Create cloned offer
    const cloned = await db.offer.create({
      data: {
        number,
        businessLineId: source.businessLineId,
        entityType: source.entityType,
        clientId: source.clientId,
        entityName: source.entityName,
        templateId: source.templateId,
        templateName: source.templateName,
        status: 'draft',
        value: source.value,
        currency: source.currency,
        validUntil,
        blocks: source.blocks as Prisma.InputJsonValue,
        modules: source.modules ? (source.modules as Prisma.InputJsonValue) : undefined,
        customFields: source.customFields ? (source.customFields as Prisma.InputJsonValue) : undefined,
        createdBy: source.createdBy,
      },
      include: {
        businessLine: { select: { id: true, slug: true, name: true } },
        client: { select: { id: true, companyName: true, contactPerson: true, email: true } },
      },
    })

    // Log activity
    await logActivity({
      businessLineId: cloned.businessLineId,
      userId: source.createdBy,
      userName: 'System',
      action: 'duplicated',
      entityType: 'offer',
      entityId: cloned.id,
      entityName: `${cloned.number} - ${cloned.templateName}`,
      details: { sourceOfferId: source.id, sourceNumber: source.number },
      offerId: cloned.id,
      clientId: cloned.clientId || undefined,
    })

    return NextResponse.json(
      {
        id: cloned.id,
        number: cloned.number,
        businessLine: cloned.businessLine.slug,
        businessLineName: cloned.businessLine.name,
        entityType: cloned.entityType,
        clientId: cloned.clientId,
        entityName: cloned.entityName,
        client: cloned.client,
        templateId: cloned.templateId,
        templateName: cloned.templateName,
        status: cloned.status,
        value: cloned.value,
        currency: cloned.currency,
        validUntil: cloned.validUntil?.toISOString() ?? null,
        blocks: cloned.blocks,
        modules: cloned.modules,
        customFields: cloned.customFields,
        createdBy: cloned.createdBy,
        createdAt: cloned.createdAt.toISOString(),
        updatedAt: cloned.updatedAt.toISOString(),
        duplicatedFrom: { id: source.id, number: source.number },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[API] POST /api/offers/[id]/duplicate error:', error)
    return NextResponse.json(
      { error: 'Failed to duplicate offer' },
      { status: 500 }
    )
  }
}

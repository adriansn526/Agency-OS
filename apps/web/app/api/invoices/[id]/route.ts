import { NextRequest, NextResponse } from 'next/server'
import { db, logActivity } from '@repo/db'

// ─── GET /api/invoices/[id] ───
// Detalii factură
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const invoice = await db.invoice.findUnique({
      where: { id },
      include: {
        client: { select: { id: true, companyName: true, email: true, phone: true } },
        businessLine: { select: { id: true, slug: true, name: true } },
        contract: { select: { id: true, number: true } },
      },
    })

    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      data: {
        id: invoice.id,
        number: invoice.number,
        businessLine: invoice.businessLine.slug,
        businessLineName: invoice.businessLine.name,
        clientId: invoice.clientId,
        clientName: invoice.client.companyName,
        clientEmail: invoice.client.email,
        clientPhone: invoice.client.phone,
        contractId: invoice.contractId,
        contractNumber: invoice.contract?.number ?? null,
        type: invoice.type,
        direction: invoice.direction,
        status: invoice.status,
        amount: invoice.amount,
        currency: invoice.currency,
        issuedAt: invoice.issuedAt.toISOString(),
        dueDate: invoice.dueDate.toISOString(),
        paidAt: invoice.paidAt?.toISOString() ?? null,
        items: invoice.items,
        notes: invoice.notes,
        createdAt: invoice.createdAt.toISOString(),
        updatedAt: invoice.updatedAt.toISOString(),
      },
    })
  } catch (error) {
    console.error('[API] GET /api/invoices/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invoice' },
      { status: 500 }
    )
  }
}

// ─── PATCH /api/invoices/[id] ───
// Update factură (amount, items, notes, dueDate, type)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Find existing invoice
    const existing = await db.invoice.findUnique({
      where: { id },
      include: {
        client: { select: { companyName: true } },
        businessLine: { select: { id: true, slug: true, name: true } },
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }

    // Build update data
    const updateData: Record<string, unknown> = {}
    const changes: Record<string, unknown> = {}

    if (body.amount !== undefined) {
      changes.amount = { old: existing.amount, new: body.amount }
      updateData.amount = body.amount
    }
    if (body.items !== undefined) {
      updateData.items = body.items
    }
    if (body.notes !== undefined) {
      updateData.notes = body.notes
    }
    if (body.dueDate !== undefined) {
      changes.dueDate = { old: existing.dueDate.toISOString(), new: body.dueDate }
      updateData.dueDate = new Date(body.dueDate)
    }
    if (body.type !== undefined) {
      changes.type = { old: existing.type, new: body.type }
      updateData.type = body.type
    }
    if (body.currency !== undefined) {
      changes.currency = { old: existing.currency, new: body.currency }
      updateData.currency = body.currency
    }

    const updated = await db.invoice.update({
      where: { id },
      data: updateData,
      include: {
        client: { select: { id: true, companyName: true } },
        businessLine: { select: { id: true, slug: true, name: true } },
      },
    })

    // Log activity
    await logActivity({
      businessLineId: existing.businessLine.id,
      userId: 'system',
      userName: 'System',
      action: 'updated',
      entityType: 'invoice',
      entityId: id,
      entityName: `${existing.number} — ${existing.client.companyName}`,
      details: changes,
      clientId: existing.clientId,
    })

    return NextResponse.json({
      data: {
        id: updated.id,
        number: updated.number,
        businessLine: updated.businessLine.slug,
        businessLineName: updated.businessLine.name,
        clientId: updated.clientId,
        clientName: updated.client.companyName,
        contractId: updated.contractId,
        type: updated.type,
        direction: updated.direction,
        status: updated.status,
        amount: updated.amount,
        currency: updated.currency,
        issuedAt: updated.issuedAt.toISOString(),
        dueDate: updated.dueDate.toISOString(),
        paidAt: updated.paidAt?.toISOString() ?? null,
        items: updated.items,
        notes: updated.notes,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    })
  } catch (error) {
    console.error('[API] PATCH /api/invoices/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to update invoice' },
      { status: 500 }
    )
  }
}

// ─── DELETE /api/invoices/[id] ───
// Anulare factură (setare status='anulata')
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await db.invoice.findUnique({
      where: { id },
      include: {
        client: { select: { companyName: true } },
        businessLine: { select: { id: true } },
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }

    // We delete the invoice record
    await db.invoice.delete({ where: { id } })

    // Log activity
    await logActivity({
      businessLineId: existing.businessLine.id,
      userId: 'system',
      userName: 'System',
      action: 'deleted',
      entityType: 'invoice',
      entityId: id,
      entityName: `${existing.number} — ${existing.client.companyName}`,
      details: { amount: existing.amount, currency: existing.currency, status: existing.status },
      clientId: existing.clientId,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API] DELETE /api/invoices/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to delete invoice' },
      { status: 500 }
    )
  }
}

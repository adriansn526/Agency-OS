import { NextRequest, NextResponse } from 'next/server'
import { db } from '@repo/db'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    let tenantId = request.headers.get('x-tenant-id')
    if (!tenantId || tenantId === 'default_tenant') {
      const t = await db.tenantInstance.findFirst()
      tenantId = t ? t.id : 'default_tenant'
    }
    const resolvedParams = await params;
    const supplierId = resolvedParams.id

    const supplier = await db.supplier.findFirst({
      where: { id: supplierId, tenantId },
      include: {
        invoices: {
          orderBy: { issueDate: 'desc' },
          include: { payments: true }
        }
      }
    })

    if (!supplier) {
      return NextResponse.json({ error: 'Furnizorul nu a fost găsit' }, { status: 404 })
    }

    return NextResponse.json({ data: supplier })
  } catch (error) {
    console.error('[API] GET /api/suppliers/[id] error:', error)
    return NextResponse.json({ error: 'Failed to fetch supplier details' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    let tenantId = request.headers.get('x-tenant-id')
    if (!tenantId || tenantId === 'default_tenant') {
      const t = await db.tenantInstance.findFirst()
      tenantId = t ? t.id : 'default_tenant'
    }
    const resolvedParams = await params;
    const supplierId = resolvedParams.id
    
    const body = await request.json()
    // Extract updateable fields
    const dataToUpdate: any = {}
    if (body.country !== undefined) dataToUpdate.country = body.country
    if (body.vatRegime !== undefined) dataToUpdate.vatRegime = body.vatRegime
    if (body.vatNumber !== undefined) dataToUpdate.vatNumber = body.vatNumber
    if (body.invoiceFetchMethod !== undefined) dataToUpdate.invoiceFetchMethod = body.invoiceFetchMethod
    if (body.invoiceSenderEmails !== undefined) {
       // Filter empty emails and trim
       dataToUpdate.invoiceSenderEmails = body.invoiceSenderEmails.filter((e: string) => e.trim().length > 0).map((e: string) => e.trim())
    }
    if (body.cui !== undefined) dataToUpdate.cui = body.cui
    if (body.iban !== undefined) dataToUpdate.iban = body.iban
    if (body.category !== undefined) dataToUpdate.category = body.category
    if (body.status !== undefined) dataToUpdate.status = body.status

    const updated = await db.supplier.updateMany({
      where: { id: supplierId, tenantId },
      data: dataToUpdate
    })

    if (updated.count === 0) {
       return NextResponse.json({ error: 'Furnizorul nu a fost găsit' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API] PATCH /api/suppliers/[id] error:', error)
    return NextResponse.json({ error: 'Failed to update supplier' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    let tenantId = request.headers.get('x-tenant-id')
    if (!tenantId || tenantId === 'default_tenant') {
      const t = await db.tenantInstance.findFirst()
      tenantId = t ? t.id : 'default_tenant'
    }
    const resolvedParams = await params;
    const supplierId = resolvedParams.id
    
    // Check if supplier has invoices
    const count = await db.supplierInvoice.count({
      where: { supplierId, tenantId }
    })
    
    if (count > 0) {
      return NextResponse.json({ 
        error: `Furnizorul are ${count} facturi asociate. Trebuie dezactivat, nu șters definitiv.` 
      }, { status: 400 })
    }

    const deleted = await db.supplier.deleteMany({
      where: { id: supplierId, tenantId }
    })

    if (deleted.count === 0) {
       return NextResponse.json({ error: 'Furnizorul nu a fost găsit' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API] DELETE /api/suppliers/[id] error:', error)
    return NextResponse.json({ error: 'Failed to delete supplier' }, { status: 500 })
  }
}

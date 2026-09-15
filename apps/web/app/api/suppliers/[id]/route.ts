import { NextRequest, NextResponse } from 'next/server'
import { db } from '@repo/db'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    let tenantId = request.headers.get('x-tenant-id')
    if (!tenantId || tenantId === 'default_tenant') {
      const t = await db.tenantInstance.findFirst()
      tenantId = t ? t.id : 'default_tenant'
    }
    const supplierId = params.id

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

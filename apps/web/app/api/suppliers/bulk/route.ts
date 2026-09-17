import { NextRequest, NextResponse } from 'next/server'
import { db } from '@repo/db'
import { auth } from '@/lib/auth'

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenant = await db.tenantInstance.findFirst()
    if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

    const body = await request.json()
    const { supplierIds, data } = body

    if (!supplierIds || !Array.isArray(supplierIds) || supplierIds.length === 0) {
      return NextResponse.json({ error: 'No suppliers selected' }, { status: 400 })
    }
    if (!data) {
      return NextResponse.json({ error: 'No data to update' }, { status: 400 })
    }

    // Currently only supporting bulk category update, but easily extensible
    const updateData: any = {}
    if (data.category !== undefined) updateData.category = data.category

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const result = await db.supplier.updateMany({
      where: {
        tenantId: tenant.id,
        id: { in: supplierIds }
      },
      data: updateData
    })

    // If category was updated, we might also want to update the supplier's historic invoices?
    // According to accounting logic, when a supplier's category changes, we usually update
    // ALL their un-exported invoices or at least future ones.
    // For now, let's keep it simple and just update the Supplier.
    
    return NextResponse.json({ success: true, count: result.count })

  } catch (error: any) {
    console.error('[Suppliers Bulk PATCH]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@repo/db'
import { auth } from '@/lib/auth'
import { applyDeductibilityRuleToInvoice } from '@/lib/accounting/rules'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenant = await db.tenantInstance.findFirst()
    if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

    const { id: invoiceId } = await params
    
    // Parse body for updated fields
    const body = await request.json().catch(() => ({}))
    const { supplierId, amount, currency, issueDate, invoiceNumber } = body

    const invoice = await db.supplierInvoice.update({
      where: { id: invoiceId, tenantId: tenant.id },
      data: {
        extractionStatus: 'confirmed',
        ...(supplierId && { supplierId }),
        ...(amount !== undefined && { amount: Number(amount) }),
        ...(currency && { currency }),
        ...(issueDate && { issueDate: new Date(issueDate) }),
        ...(invoiceNumber !== undefined && { invoiceNumber: invoiceNumber === '' ? null : invoiceNumber }),
      }
    })

    // Aplicăm regulile de deductibilitate
    await applyDeductibilityRuleToInvoice(invoice.id, tenant.id)

    return NextResponse.json({ success: true, data: invoice })
  } catch (error) {
    console.error('[API] Failed to confirm invoice:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

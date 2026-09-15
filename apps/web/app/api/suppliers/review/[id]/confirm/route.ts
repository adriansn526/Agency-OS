import { NextRequest, NextResponse } from 'next/server'
import { db } from '@repo/db'
import { auth } from '@/lib/auth'
import { applyDeductibilityRuleToInvoice } from '@/lib/accounting/rules'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenant = await db.tenantInstance.findFirst()
    if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

    const invoiceId = params.id
    const invoice = await db.supplierInvoice.update({
      where: { id: invoiceId, tenantId: tenant.id },
      data: {
        extractionStatus: 'confirmed',
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

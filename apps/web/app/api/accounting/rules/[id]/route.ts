import { NextRequest, NextResponse } from 'next/server'
import { db } from '@repo/db'
import { auth } from '@/lib/auth'

export async function PUT(
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

    const ruleId = id
    const existingRule = await db.deductibilityRule.findUnique({
      where: { id: ruleId }
    })

    if (!existingRule || existingRule.tenantId !== tenant.id) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 })
    }

    const body = await request.json()
    const { 
      name, 
      supplierId, 
      expenseCategory, 
      vatDeductiblePercent, 
      expenseDeductiblePercent,
      priority 
    } = body

    // Istoricizare logică
    const newRule = await db.$transaction(async (tx) => {
      // 1. Invalidăm regula veche
      await tx.deductibilityRule.update({
        where: { id: ruleId },
        data: { validTo: new Date() }
      })

      // 2. Creăm regula nouă preluând valorile modificate
      return tx.deductibilityRule.create({
        data: {
          tenantId: tenant.id,
          name: name ?? existingRule.name,
          supplierId: supplierId !== undefined ? supplierId : existingRule.supplierId,
          expenseCategory: expenseCategory !== undefined ? expenseCategory : existingRule.expenseCategory,
          vatDeductiblePercent: vatDeductiblePercent !== undefined ? Number(vatDeductiblePercent) : existingRule.vatDeductiblePercent,
          expenseDeductiblePercent: expenseDeductiblePercent !== undefined ? Number(expenseDeductiblePercent) : existingRule.expenseDeductiblePercent,
          priority: priority !== undefined ? Number(priority) : existingRule.priority,
        }
      })
    })

    return NextResponse.json({ success: true, data: newRule })

  } catch (error) {
    console.error('[DeductibilityRule PUT]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(
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

    const ruleId = id
    
    // În loc să ștergem, doar setăm validTo = now(), oprindu-i valabilitatea.
    // Facturile din trecut nu sunt afectate.
    await db.deductibilityRule.update({
      where: { id: ruleId },
      data: { validTo: new Date() }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('[DeductibilityRule DELETE]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

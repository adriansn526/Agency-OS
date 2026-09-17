import { NextResponse } from 'next/server'
import { db as prisma } from '@repo/db'
import { auth } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    
    const tenant = await prisma.tenantInstance.findFirst()
    if (!tenant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { targetId, sourceIds } = body

    if (!targetId || !sourceIds || !Array.isArray(sourceIds) || sourceIds.length === 0) {
      return NextResponse.json({ error: 'targetId and array of sourceIds are required' }, { status: 400 })
    }

    if (sourceIds.includes(targetId)) {
      return NextResponse.json({ error: 'targetId cannot be in sourceIds' }, { status: 400 })
    }

    // Verify all categories exist and belong to tenant
    const target = await prisma.expenseCategory.findUnique({ where: { id: targetId, tenantId: tenant.id } })
    if (!target) return NextResponse.json({ error: 'Target category not found' }, { status: 404 })

    const sources = await prisma.expenseCategory.findMany({
      where: { id: { in: sourceIds }, tenantId: tenant.id }
    })

    if (sources.length !== sourceIds.length) {
      return NextResponse.json({ error: 'One or more source categories not found' }, { status: 404 })
    }

    const sourceNames = sources.map(s => s.name)

    // Execute in a transaction:
    // 1. Reassign rules, suppliers, invoices
    // 2. Delete source categories
    await prisma.$transaction([
      prisma.deductibilityRule.updateMany({
        where: { tenantId: tenant.id, expenseCategory: { in: sourceNames } },
        data: { expenseCategory: target.name }
      }),
      prisma.supplier.updateMany({
        where: { tenantId: tenant.id, category: { in: sourceNames } },
        data: { category: target.name }
      }),
      prisma.supplierInvoice.updateMany({
        where: { tenantId: tenant.id, expenseCategory: { in: sourceNames } },
        data: { expenseCategory: target.name }
      }),
      prisma.expenseCategory.deleteMany({
        where: { tenantId: tenant.id, id: { in: sourceIds } }
      })
    ])

    return NextResponse.json({ success: true, mergedInto: target.name })
  } catch (error: any) {
    console.error(error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

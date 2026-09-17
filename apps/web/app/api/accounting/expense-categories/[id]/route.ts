import { NextResponse } from 'next/server'
import { db as prisma } from '@repo/db'
import { auth } from '@/lib/auth'

export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const id = id;
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    
    const tenant = await prisma.tenantInstance.findFirst()
    if (!tenant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const category = await prisma.expenseCategory.findUnique({
      where: { id: id, tenantId: tenant.id }
    })

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    const body = await request.json()

    // If changing the name, we MUST update all references in a transaction
    if (body.name && body.name.trim() !== category.name) {
      const newName = body.name.trim()
      
      const existing = await prisma.expenseCategory.findFirst({
        where: { tenantId: tenant.id, name: { equals: newName, mode: 'insensitive' } }
      })
      if (existing) {
        return NextResponse.json({ error: 'Another category with this name already exists' }, { status: 400 })
      }

      await prisma.$transaction([
        prisma.expenseCategory.update({
          where: { id: id },
          data: {
            name: newName,
            accountCode: body.accountCode !== undefined ? body.accountCode : category.accountCode,
            isActive: body.isActive !== undefined ? body.isActive : category.isActive
          }
        }),
        prisma.supplier.updateMany({
          where: { tenantId: tenant.id, category: category.name },
          data: { category: newName }
        }),
        prisma.supplierInvoice.updateMany({
          where: { tenantId: tenant.id, expenseCategory: category.name },
          data: { expenseCategory: newName }
        }),
        prisma.deductibilityRule.updateMany({
          where: { tenantId: tenant.id, expenseCategory: category.name },
          data: { expenseCategory: newName }
        })
      ])
      
      return NextResponse.json({ success: true, renamed: true })
    }

    // Otherwise just update standard fields
    const updated = await prisma.expenseCategory.update({
      where: { id: id },
      data: {
        accountCode: body.accountCode !== undefined ? body.accountCode : category.accountCode,
        isActive: body.isActive !== undefined ? body.isActive : category.isActive
      }
    })

    return NextResponse.json({ data: updated })
  } catch (error: any) {
    console.error(error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const id = id;
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    
    const tenant = await prisma.tenantInstance.findFirst()
    if (!tenant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const category = await prisma.expenseCategory.findUnique({
      where: { id: id, tenantId: tenant.id }
    })

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    // Check usage
    const rulesCount = await prisma.deductibilityRule.count({ where: { tenantId: tenant.id, expenseCategory: category.name } })
    const suppliersCount = await prisma.supplier.count({ where: { tenantId: tenant.id, category: category.name } })
    const invoicesCount = await prisma.supplierInvoice.count({ where: { tenantId: tenant.id, expenseCategory: category.name } })

    const totalUsage = rulesCount + suppliersCount + invoicesCount

    if (totalUsage > 0) {
      return NextResponse.json({ 
        error: `folosită de ${invoicesCount} facturi, ${suppliersCount} furnizori, ${rulesCount} reguli — dezactiveaz-o sau îmbin-o` 
      }, { status: 400 })
    }

    await prisma.expenseCategory.delete({
      where: { id: id }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error(error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

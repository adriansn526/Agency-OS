import { NextRequest, NextResponse } from 'next/server'
import { db } from '@repo/db'
import { auth } from '@/lib/auth'
import { Prisma } from '@prisma/client'
import { getInvoiceCalculations } from '@/lib/accounting/calculations'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenant = await db.tenantInstance.findFirst()
    if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

    const { searchParams } = new URL(request.url)
    
    // Pagination params
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = (page - 1) * limit

    // Filter params
    const month = searchParams.get('month')
    const supplierId = searchParams.get('supplierId')
    const source = searchParams.get('source')

    const where: Prisma.SupplierInvoiceWhereInput = {
      tenantId: tenant.id,
      extractionStatus: 'confirmed'
    }

    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const parts = month.split('-')
      const year = parts[0] as string
      const monthStr = parts[1] as string
      const startDate = new Date(parseInt(year), parseInt(monthStr) - 1, 1)
      const endDate = new Date(parseInt(year), parseInt(monthStr), 0, 23, 59, 59, 999)
      where.issueDate = { gte: startDate, lte: endDate }
    }

    if (supplierId && supplierId !== 'all') {
      where.supplierId = supplierId
    }

    if (source && source !== 'all') {
      where.source = source
    }

    const [items, totalItems] = await Promise.all([
      db.supplierInvoice.findMany({
        where,
        include: { supplier: true, lines: true },
        orderBy: { issueDate: 'desc' },
        skip,
        take: limit,
      }),
      db.supplierInvoice.count({ where })
    ])

    const mappedItems = items.map((inv) => {
      const calc = getInvoiceCalculations(inv)
      return {
        ...inv,
        calculatedExpense: calc.expenseAmount,
        calculatedVat: calc.vatAmount,
        expensePct: calc.expensePercentage,
        vatPct: calc.vatPercentage
      }
    })

    return NextResponse.json({
      data: mappedItems,
      pagination: {
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: page,
        limit
      }
    })

  } catch (error) {
    console.error('[Archive Invoices-In GET]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@repo/db'
import { auth } from '@/lib/auth'
import { Prisma } from '@prisma/client'

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

    const where: Prisma.SupplierInvoiceWhereInput = {
      tenantId: tenant.id,
      extractionStatus: 'confirmed'
    }

    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const [year, monthStr] = month.split('-')
      const startDate = new Date(parseInt(year), parseInt(monthStr) - 1, 1)
      const endDate = new Date(parseInt(year), parseInt(monthStr), 0, 23, 59, 59, 999)
      where.issueDate = { gte: startDate, lte: endDate }
    }

    if (supplierId && supplierId !== 'all') {
      where.supplierId = supplierId
    }

    const [items, totalItems] = await Promise.all([
      db.supplierInvoice.findMany({
        where,
        include: { supplier: true },
        orderBy: { issueDate: 'desc' },
        skip,
        take: limit,
      }),
      db.supplierInvoice.count({ where })
    ])

    return NextResponse.json({
      data: items,
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

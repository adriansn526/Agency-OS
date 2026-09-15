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
    const month = searchParams.get('month') // format: YYYY-MM
    const status = searchParams.get('status')
    const query = searchParams.get('query') // Search by client name

    const where: Prisma.InvoiceWhereInput = {
      direction: 'emisa'
    }

    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const [year, monthStr] = month.split('-')
      const startDate = new Date(parseInt(year), parseInt(monthStr) - 1, 1)
      const endDate = new Date(parseInt(year), parseInt(monthStr), 0, 23, 59, 59, 999)
      where.issuedAt = { gte: startDate, lte: endDate }
    }

    if (status && status !== 'all') {
      if (status === 'confirmed' || status === 'pending_review') {
        where.extractionStatus = status
      } else {
        where.status = status
      }
    }

    if (query) {
      where.OR = [
        { client: { companyName: { contains: query, mode: 'insensitive' } } },
        { extractedClientName: { contains: query, mode: 'insensitive' } },
        { number: { contains: query, mode: 'insensitive' } }
      ]
    }

    const [items, totalItems] = await Promise.all([
      db.invoice.findMany({
        where,
        include: { client: true },
        orderBy: { issuedAt: 'desc' },
        skip,
        take: limit,
      }),
      db.invoice.count({ where })
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
    console.error('[Archive Invoices-Out GET]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

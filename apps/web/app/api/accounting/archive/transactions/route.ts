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
    const type = searchParams.get('type') // 'in', 'out', 'all'
    const status = searchParams.get('status') // 'matched', 'unmatched', 'all'

    const where: Prisma.BankTransactionWhereInput = {
      tenantId: tenant.id
    }

    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const [year, monthStr] = month.split('-')
      const startDate = new Date(parseInt(year), parseInt(monthStr) - 1, 1)
      const endDate = new Date(parseInt(year), parseInt(monthStr), 0, 23, 59, 59, 999)
      where.date = { gte: startDate, lte: endDate }
    }

    if (type === 'in') {
      where.credit = { gt: 0 }
    } else if (type === 'out') {
      where.debit = { gt: 0 }
    }

    if (status === 'matched') {
      where.matchedByUserId = { not: null }
    } else if (status === 'unmatched') {
      where.matchedByUserId = null
    }

    const [items, totalItems] = await Promise.all([
      db.bankTransaction.findMany({
        where,
        orderBy: { date: 'desc' },
        skip,
        take: limit,
      }),
      db.bankTransaction.count({ where })
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
    console.error('[Archive Transactions GET]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

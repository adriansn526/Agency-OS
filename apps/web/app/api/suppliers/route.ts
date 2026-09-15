import { NextRequest, NextResponse } from 'next/server'
import { db } from '@repo/db'

// ─── GET /api/suppliers ───
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    let tenantId = request.headers.get('x-tenant-id')
    if (!tenantId || tenantId === 'default_tenant') {
      const t = await db.tenantInstance.findFirst()
      tenantId = t ? t.id : 'default_tenant'
    }

    const where: Record<string, unknown> = { tenantId }
    
    if (status && status !== 'all') where.status = status
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { cui: { contains: search, mode: 'insensitive' } },
      ]
    }

    const data = await db.supplier.findMany({
      where: where as any,
      include: {
        _count: { select: { invoices: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[API] GET /api/suppliers error:', error)
    return NextResponse.json({ error: 'Failed to fetch suppliers' }, { status: 500 })
  }
}

// ─── POST /api/suppliers ───
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, cui, iban, category, isRecurring, expectedDay } = body
    let tenantId = request.headers.get('x-tenant-id')
    if (!tenantId || tenantId === 'default_tenant') {
      const t = await db.tenantInstance.findFirst()
      tenantId = t ? t.id : 'default_tenant'
    }

    if (!name) {
      return NextResponse.json({ error: 'Numele furnizorului este obligatoriu' }, { status: 400 })
    }

    const supplier = await db.supplier.create({
      data: {
        tenantId,
        name,
        cui,
        iban,
        category,
        isRecurring: isRecurring || false,
        expectedDay: isRecurring ? (expectedDay ? parseInt(expectedDay) : null) : null,
      },
    })

    return NextResponse.json({ data: supplier }, { status: 201 })
  } catch (error) {
    console.error('[API] POST /api/suppliers error:', error)
    return NextResponse.json({ error: 'Failed to create supplier' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { db as prisma } from '@repo/db'
import { auth } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    
    const tenant = await prisma.tenantInstance.findFirst()
    if (!tenant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // We get the URL to parse query params (e.g. ?activeOnly=true)
    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('activeOnly') === 'true'

    const categories = await prisma.expenseCategory.findMany({
      where: {
        tenantId: tenant.id,
        ...(activeOnly ? { isActive: true } : {})
      },
      orderBy: { name: 'asc' }
    })

    // Compute stats manually based on name string matches
    const rulesCounts = await prisma.deductibilityRule.groupBy({
      by: ['expenseCategory'],
      where: { tenantId: tenant.id, expenseCategory: { in: categories.map(c => c.name) } },
      _count: { _all: true }
    })

    const suppliersCounts = await prisma.supplier.groupBy({
      by: ['category'],
      where: { tenantId: tenant.id, category: { in: categories.map(c => c.name) } },
      _count: { _all: true }
    })

    const invoicesCounts = await prisma.supplierInvoice.groupBy({
      by: ['expenseCategory'],
      where: { tenantId: tenant.id, expenseCategory: { in: categories.map(c => c.name) } },
      _count: { _all: true }
    })

    const rulesMap = Object.fromEntries(rulesCounts.map(r => [r.expenseCategory, r._count._all]))
    const suppliersMap = Object.fromEntries(suppliersCounts.map(s => [s.category, s._count._all]))
    const invoicesMap = Object.fromEntries(invoicesCounts.map(i => [i.expenseCategory, i._count._all]))

    const categoriesWithStats = categories.map(cat => ({
      ...cat,
      _count: {
        rules: rulesMap[cat.name] || 0,
        suppliers: suppliersMap[cat.name] || 0,
        invoices: invoicesMap[cat.name] || 0
      }
    }))

    return NextResponse.json({ data: categoriesWithStats })
  } catch (error: any) {
    console.error(error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    
    const tenant = await prisma.tenantInstance.findFirst()
    if (!tenant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    if (!body.name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

    const existing = await prisma.expenseCategory.findFirst({
      where: { tenantId: tenant.id, name: { equals: body.name, mode: 'insensitive' } }
    })
    
    if (existing) {
      return NextResponse.json({ error: 'Category already exists' }, { status: 400 })
    }

    const category = await prisma.expenseCategory.create({
      data: {
        tenantId: tenant.id,
        name: body.name.trim(),
        accountCode: body.accountCode || null,
        isActive: body.isActive ?? true
      }
    })

    return NextResponse.json({ data: category })
  } catch (error: any) {
    console.error(error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

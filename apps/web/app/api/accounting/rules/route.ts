import { NextRequest, NextResponse } from 'next/server'
import { db } from '@repo/db'
import { auth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenant = await db.tenantInstance.findFirst()
    if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

    // Return active rules only (validTo: null)
    const rules = await db.deductibilityRule.findMany({
      where: { 
        tenantId: tenant.id,
        validTo: null
      },
      orderBy: {
        priority: 'desc'
      }
    })

    return NextResponse.json({ data: rules })

  } catch (error) {
    console.error('[DeductibilityRule GET]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenant = await db.tenantInstance.findFirst()
    if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

    const body = await request.json()
    const { 
      name, 
      supplierId, 
      expenseCategory, 
      vatDeductiblePercent, 
      expenseDeductiblePercent,
      priority,
      validFrom
    } = body

    if (!name || vatDeductiblePercent === undefined || expenseDeductiblePercent === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const newRule = await db.deductibilityRule.create({
      data: {
        tenantId: tenant.id,
        name,
        supplierId: supplierId || null,
        expenseCategory: expenseCategory || null,
        vatDeductiblePercent: Number(vatDeductiblePercent),
        expenseDeductiblePercent: Number(expenseDeductiblePercent),
        priority: priority ? Number(priority) : 0,
        ...(validFrom && { validFrom: new Date(validFrom) }),
      }
    })

    return NextResponse.json({ success: true, data: newRule })

  } catch (error) {
    console.error('[DeductibilityRule POST]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@repo/db'

export async function GET(request: NextRequest) {
  try {
    const tenant = await db.tenantInstance.findFirst()
    if (!tenant) return NextResponse.json({ invoices: [] })

    const invoices = await db.supplierInvoice.findMany({
      where: {
        tenantId: tenant.id,
        extractionStatus: 'pending_review'
      },
      include: {
        supplier: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({ invoices })
  } catch (error) {
    console.error('[API] Failed to fetch review invoices:', error)
    return NextResponse.json({ invoices: [] })
  }
}

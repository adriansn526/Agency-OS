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
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
    }

    // Fetch all transactions that need reconciliation (unmatched or pending_review)
    // Ordered by date DESC
    const transactions = await db.bankTransaction.findMany({
      where: {
        tenantId: tenant.id,
        OR: [
          { matchStatus: 'unmatched' },
          { extractionStatus: 'pending_review' }
        ]
      },
      orderBy: { date: 'desc' }
    })

    // Also fetch all active, unpaid/partial supplier invoices for this tenant
    // so the frontend can display candidates for manual matching
    const candidateInvoices = await db.supplierInvoice.findMany({
      where: {
        tenantId: tenant.id,
        status: { in: ['unpaid', 'partial'] }
      },
      include: {
        supplier: {
          select: { id: true, name: true, cui: true }
        },
        lines: true
      },
      orderBy: { issueDate: 'desc' }
    })

    return NextResponse.json({ transactions, candidateInvoices })

  } catch (error) {
    console.error('[GetPendingTransactions] Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

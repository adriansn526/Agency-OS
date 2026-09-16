import { NextRequest, NextResponse } from 'next/server'
import { db } from '@repo/db'
import { auth } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { transactionIds, reason } = body

    if (!Array.isArray(transactionIds) || transactionIds.length === 0) {
      return NextResponse.json({ error: 'Missing transactionIds array' }, { status: 400 })
    }

    if (!reason) {
      return NextResponse.json({ error: 'Missing dismiss reason' }, { status: 400 })
    }

    const tenant = await db.tenantInstance.findFirst()
    if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })

    // Validăm motivele admise
    const validReasons = ['no_invoice_expected', 'bank_fee', 'internal_transfer', 'tax', 'other']
    if (!validReasons.includes(reason)) {
      return NextResponse.json({ error: 'Invalid reason' }, { status: 400 })
    }

    // Actualizăm tranzacțiile ca respinse (dismissed)
    const result = await db.bankTransaction.updateMany({
      where: { 
        id: { in: transactionIds },
        tenantId: tenant.id,
        matchedSupplierId: null // Doar tranzacțiile nereconciliate pot fi dismissed
      },
      data: {
        matchStatus: 'dismissed', // Putem folosi statusul dismissed pentru a le ascunde din view-ul principal
        dismissReason: reason,
        dismissedAt: new Date(),
        dismissedBy: session.user.id
      }
    })

    return NextResponse.json({ 
      success: true, 
      count: result.count,
      message: `${result.count} tranzacții au fost marcate ca "${reason}".`
    })
  } catch (error) {
    console.error('[Reconciliation] Dismiss Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

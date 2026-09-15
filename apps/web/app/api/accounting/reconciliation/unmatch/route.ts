import { NextRequest, NextResponse } from 'next/server'
import { db } from '@repo/db'
import { auth } from '@/lib/auth'
import { Decimal } from 'decimal.js'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { transactionId } = body

    if (!transactionId) {
      return NextResponse.json({ error: 'Missing transactionId' }, { status: 400 })
    }

    const tenant = await db.tenantInstance.findFirst()
    if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })

    // 1. Fetch transaction and verify it's matched
    const bankTx = await db.bankTransaction.findUnique({
      where: { id: transactionId, tenantId: tenant.id }
    })

    if (!bankTx) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    if (bankTx.matchStatus === 'unmatched') {
      return NextResponse.json({ error: 'Transaction is already unmatched' }, { status: 400 })
    }

    const invoiceId = bankTx.matchedInvoiceId
    if (!invoiceId) {
      // It was matched but to no invoice? Just reset it.
      await db.bankTransaction.update({
        where: { id: transactionId },
        data: { matchStatus: 'unmatched', matchedInvoiceId: null, matchedSupplierId: null }
      })
      return NextResponse.json({ success: true })
    }

    // 2. Fetch the payment associated with this bank transaction
    const payment = await db.supplierPayment.findFirst({
      where: { bankTransactionId: transactionId, tenantId: tenant.id }
    })

    // 3. Update DB in a transaction
    await db.$transaction(async (tx) => {
      if (payment) {
        // Delete the payment record
        await tx.supplierPayment.delete({ where: { id: payment.id } })

        // Recalculate invoice status
        const invoice = await tx.supplierInvoice.findUnique({
          where: { id: invoiceId },
          include: { payments: true }
        })

        if (invoice) {
          const remainingPaymentsTotal = invoice.payments
            .filter(p => p.id !== payment.id) // exclude the one we just deleted logically in our calculation
            .reduce((acc, p) => acc.plus(new Decimal(p.amount)), new Decimal(0))
          
          let newStatus = invoice.status
          if (remainingPaymentsTotal.greaterThanOrEqualTo(new Decimal(invoice.amount))) {
            newStatus = 'paid'
          } else if (remainingPaymentsTotal.greaterThan(0)) {
            newStatus = 'partial'
          } else {
            newStatus = 'unpaid'
          }

          await tx.supplierInvoice.update({
            where: { id: invoiceId },
            data: { status: newStatus }
          })
        }
      }

      // Reset the bank transaction
      await tx.bankTransaction.update({
        where: { id: transactionId },
        data: {
          matchStatus: 'unmatched',
          matchedInvoiceId: null,
          matchedSupplierId: null,
          extractionStatus: 'pending_review' // Put it back to pending review so it shows up
        }
      })
    })

    return NextResponse.json({ success: true, message: 'Unmatched successfully' })

  } catch (error) {
    console.error('[UnmatchTransaction] Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

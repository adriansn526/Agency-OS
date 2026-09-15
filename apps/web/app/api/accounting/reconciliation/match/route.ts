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
    const { transactionId, invoiceId, matchAmount } = body

    if (!transactionId || !invoiceId || !matchAmount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const tenant = await db.tenantInstance.findFirst()
    if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })

    // 1. Fetch transaction and verify it's unmatched
    const bankTx = await db.bankTransaction.findUnique({
      where: { id: transactionId, tenantId: tenant.id }
    })

    if (!bankTx) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    if (bankTx.matchStatus !== 'unmatched') {
      return NextResponse.json({ error: 'Transaction is already matched' }, { status: 400 })
    }

    // 2. Fetch invoice
    const invoice = await db.supplierInvoice.findUnique({
      where: { id: invoiceId, tenantId: tenant.id },
      include: { payments: true }
    })

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // 3. Process the payment
    const paymentAmount = new Decimal(matchAmount)
    const currentPaidAmount = invoice.payments.reduce((acc, p) => acc.plus(new Decimal(p.amount)), new Decimal(0))
    const invoiceTotal = new Decimal(invoice.amount)
    const newPaidAmount = currentPaidAmount.plus(paymentAmount)

    // Calculate new status
    let newStatus = invoice.status
    if (newPaidAmount.greaterThanOrEqualTo(invoiceTotal)) {
      newStatus = 'paid'
    } else if (newPaidAmount.greaterThan(0)) {
      newStatus = 'partial'
    }

    // 4. Perform DB updates in a transaction
    await db.$transaction(async (tx) => {
      // Mark transaction as matched
      await tx.bankTransaction.update({
        where: { id: transactionId },
        data: {
          matchStatus: 'manually_matched',
          matchedInvoiceId: invoiceId,
          matchedSupplierId: invoice.supplierId,
          extractionStatus: 'confirmed'
        }
      })

      // Create supplier payment
      await tx.supplierPayment.create({
        data: {
          tenantId: tenant.id,
          invoiceId: invoiceId,
          amount: paymentAmount,
          paidAt: bankTx.date,
          method: 'bank_transfer',
          bankTransactionId: transactionId,
          matchedByUserId: session.user.id
        }
      })

      // Update invoice status
      await tx.supplierInvoice.update({
        where: { id: invoiceId },
        data: { status: newStatus }
      })
    })

    return NextResponse.json({ success: true, message: 'Matched successfully' })

  } catch (error) {
    console.error('[MatchTransaction] Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

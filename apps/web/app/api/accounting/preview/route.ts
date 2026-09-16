import { NextRequest, NextResponse } from 'next/server'
import { db } from '@repo/db'
import { endOfMonth, startOfMonth, parseISO } from 'date-fns'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const monthParam = searchParams.get('month') // Format: "2026-09"

  if (!monthParam) {
    return NextResponse.json({ error: 'Missing month parameter' }, { status: 400 })
  }

  const tenant = await db.tenantInstance.findFirst()
  if (!tenant) return NextResponse.json({ error: 'No tenant' }, { status: 400 })

  const startDate = startOfMonth(parseISO(`${monthParam}-01`))
  const endDate = endOfMonth(startDate)

  // 1. Verificare Pending Review (Facturi și Extrase)
  const pendingInvoices = await db.supplierInvoice.count({
    where: {
      tenantId: tenant.id,
      issueDate: { gte: startDate, lte: endDate },
      extractionStatus: 'pending_review'
    }
  })

  const pendingTransactions = await db.bankTransaction.count({
    where: {
      tenantId: tenant.id,
      date: { gte: startDate, lte: endDate },
      extractionStatus: 'pending_review'
    }
  })

  const hasPending = (pendingInvoices + pendingTransactions) > 0

  // Informative checks (non-blocking)
  const unmatchedTransactions = await db.bankTransaction.count({
    where: {
      tenantId: tenant.id,
      date: { gte: startDate, lte: endDate },
      matchedSupplierId: null,
      dismissReason: null,
      matchStatus: 'unmatched'
    }
  })

  const invoicesWithoutDeductibility = await db.supplierInvoice.count({
    where: {
      tenantId: tenant.id,
      issueDate: { gte: startDate, lte: endDate },
      expenseDeductiblePercent: null
    }
  })

  // 2. Extragem facturile validate pt preview
  const validInvoices = await db.supplierInvoice.findMany({
    where: {
      tenantId: tenant.id,
      issueDate: { gte: startDate, lte: endDate },
      extractionStatus: 'confirmed' // acceptam confirmed
    },
    include: { supplier: true }
  })

  const totalAmount = validInvoices.reduce((sum, inv) => sum + Number(inv.amount), 0)

  // 3. Verificare Furnizori recurenti lipsa
  const recurringSuppliers = await db.supplier.findMany({
    where: { tenantId: tenant.id, isRecurring: true }
  })

  const missingRecurring: string[] = []
  
  for (const sup of recurringSuppliers) {
    const hasInvoice = validInvoices.some(inv => inv.supplierId === sup.id)
    if (!hasInvoice) {
      missingRecurring.push(sup.name)
    }
  }

  return NextResponse.json({
    month: monthParam,
    hasPending,
    pendingInvoices,
    pendingTransactions,
    unmatchedTransactions,
    invoicesWithoutDeductibility,
    missingRecurring,
    invoiceCount: validInvoices.length,
    totalAmount,
    invoices: validInvoices.map(inv => ({
      id: inv.id,
      supplierName: inv.supplier?.name || inv.extractedSupplierName || 'Necunoscut',
      invoiceNumber: inv.invoiceNumber,
      amount: Number(inv.amount),
      date: inv.issueDate
    }))
  })
}

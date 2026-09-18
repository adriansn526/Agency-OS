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

    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month')
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: 'Invalid month parameter' }, { status: 400 })
    }

    const year = month.split('-')[0] as string
    const monthStr = month.split('-')[1] as string
    const startDate = new Date(parseInt(year), parseInt(monthStr) - 1, 1)
    const endDate = new Date(parseInt(year), parseInt(monthStr), 0, 23, 59, 59, 999)

    // 1. Get settings valid for this period (the most recent setting created before or during this month)
    // Daca nu exista o setare valida pentru luna respectiva (ex: creata azi, dar privim luna trecuta), o luam pe prima disponibila.
    let settings = await db.accountingSettings.findFirst({
      where: {
        tenantId: tenant.id,
        validFrom: { lte: endDate },
      },
      orderBy: { validFrom: 'desc' }
    })

    if (!settings) {
      settings = await db.accountingSettings.findFirst({
        where: { tenantId: tenant.id },
        orderBy: { validFrom: 'asc' }
      })
    }

    const isVatPayer = settings?.isVatPayer ?? false

    // 2. Venituri (Invoices where direction='emisa') - Simulated for now
    // (În mod real, Invoices din CRM ar trebui legate de TenantInstance)
    const clientInvoices = await db.invoice.findMany({
      where: {
        direction: 'emisa',
        issuedAt: { gte: startDate, lte: endDate }
      }
    })
    
    // Deoarece Client Invoices (din CRM) încă nu sunt complet separate de tenant în schema curentă
    // calculăm un mock pentru demonstrație sau le luăm pe toate din luna respectivă (Agency OS CRM).
    const venituriTotal = clientInvoices.reduce((sum, inv) => sum + inv.amount, 0)
    
    // 3. Cheltuieli Recunoscute (Supplier Invoices)
    const supplierInvoices = await db.supplierInvoice.findMany({
      where: {
        tenantId: tenant.id,
        issueDate: { gte: startDate, lte: endDate },
        extractionStatus: { notIn: ['pending_review', 'missing_invoice'] }
      }
    })

    let cheltuieliRecunoscute = 0
    let tvaDeductibil = 0

    supplierInvoices.forEach(inv => {
      // Dacă suntem plătitori TVA, calculăm raportat la netAmount. Altfel la amount (brut).
      const baseAmount = (isVatPayer && inv.netAmount) ? Number(inv.netAmount) : Number(inv.amount)
      const expensePercent = inv.expenseDeductiblePercent ? Number(inv.expenseDeductiblePercent) : 100
      cheltuieliRecunoscute += baseAmount * (expensePercent / 100)
      
      if (isVatPayer && inv.vatAmount) {
        const vatPercent = inv.vatDeductiblePercent ? Number(inv.vatDeductiblePercent) : 100
        tvaDeductibil += Number(inv.vatAmount) * (vatPercent / 100)
      }
    })

    // 4. Cashflow (Bank Transactions)
    const bankTransactions = await db.bankTransaction.findMany({
      where: {
        tenantId: tenant.id,
        date: { gte: startDate, lte: endDate }
      }
    })

    const cashIn = bankTransactions.reduce((sum, t) => sum + Number(t.credit), 0)
    const cashOut = bankTransactions.reduce((sum, t) => sum + Number(t.debit), 0)

    // 5. Estimator Taxe (Calcul orientativ)
    let estimatedTax = 0
    let taxDisclaimer = 'Fără regim setat'
    
    if (settings?.taxRegime?.startsWith('micro')) {
      const rate = Number(settings.taxRate || 1)
      estimatedTax = venituriTotal * (rate / 100)
      taxDisclaimer = `Micro ${rate}% din Venituri`
    } else if (settings?.taxRegime?.startsWith('profit')) {
      const rate = Number(settings.taxRate || 16)
      const profit = Math.max(0, venituriTotal - cheltuieliRecunoscute)
      estimatedTax = profit * (rate / 100)
      taxDisclaimer = `Profit ${rate}% din (Venituri - Cheltuieli)`
    }

    // 6. Quarterly Tax Estimator (Q1/Q2/Q3/Q4)
    const quarter = Math.floor((parseInt(monthStr) - 1) / 3) + 1
    const qStartDate = new Date(parseInt(year), (quarter - 1) * 3, 1)
    const qEndDate = new Date(parseInt(year), quarter * 3, 0, 23, 59, 59, 999)

    const qClientInvoices = await db.invoice.findMany({
      where: {
        direction: 'emisa',
        issuedAt: { gte: qStartDate, lte: qEndDate }
      }
    })
    const qVenituriTotal = qClientInvoices.reduce((sum, inv) => sum + inv.amount, 0)

    const qSupplierInvoices = await db.supplierInvoice.findMany({
      where: {
        tenantId: tenant.id,
        issueDate: { gte: qStartDate, lte: qEndDate },
        extractionStatus: { notIn: ['pending_review', 'missing_invoice'] }
      }
    })
    
    let qCheltuieliRecunoscute = 0
    qSupplierInvoices.forEach(inv => {
      const baseAmount = (isVatPayer && inv.netAmount) ? Number(inv.netAmount) : Number(inv.amount)
      const expensePercent = inv.expenseDeductiblePercent ? Number(inv.expenseDeductiblePercent) : 100
      qCheltuieliRecunoscute += baseAmount * (expensePercent / 100)
    })

    let quarterEstimatedTax = 0
    let quarterTaxDisclaimer = 'Fără regim setat'
    
    if (settings?.taxRegime?.startsWith('micro')) {
      const rate = Number(settings.taxRate || 1)
      quarterEstimatedTax = qVenituriTotal * (rate / 100)
      quarterTaxDisclaimer = `Total Q${quarter}: ${rate}% din Venituri`
    } else if (settings?.taxRegime?.startsWith('profit')) {
      const rate = Number(settings.taxRate || 16)
      const profit = Math.max(0, qVenituriTotal - qCheltuieliRecunoscute)
      quarterEstimatedTax = profit * (rate / 100)
      quarterTaxDisclaimer = `Total Q${quarter}: ${rate}% din Profit`
    }

    return NextResponse.json({
      data: {
        venituriTotal,
        cheltuieliRecunoscute,
        tvaDeductibil,
        cashIn,
        cashOut,
        estimatedTax,
        taxDisclaimer,
        quarterEstimatedTax,
        quarterTaxDisclaimer,
        isVatPayer
      }
    })

  } catch (error) {
    console.error('[Dashboard GET]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

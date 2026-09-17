import { db } from '@repo/db'

export async function applyDeductibilityRuleToInvoice(invoiceId: string, tenantId: string) {
  // 1. Fetch invoice
  const invoice = await db.supplierInvoice.findUnique({
    where: { id: invoiceId, tenantId }
  })
  
  if (!invoice) return null
  
  // Dacă a fost suprascrisă manual, nu rescriem regulile
  if (invoice.deductibilityOverride) {
    return invoice
  }

  // Get supplier to fallback on category
  const supplier = invoice.supplierId ? await db.supplier.findUnique({ where: { id: invoice.supplierId } }) : null
  const effectiveCategory = invoice.expenseCategory || supplier?.category

  // Obținem setările curente (sau cele valabile la data facturii)
  const settings = await db.accountingSettings.findFirst({
    where: { 
      tenantId,
      validFrom: { lte: invoice.issueDate }
    },
    orderBy: { validFrom: 'desc' }
  })

  // 2. Fetch all rules valid at invoice issueDate
  const rules = await db.deductibilityRule.findMany({
    where: {
      tenantId,
      validFrom: { lte: invoice.issueDate },
      OR: [
        { validTo: null },
        { validTo: { gt: invoice.issueDate } }
      ]
    },
    orderBy: { priority: 'desc' }
  })

  // 3. Find matching rule
  let matchedRule = null
  for (const rule of rules) {
    // Dacă regula e specifică pe supplier și nu se potrivește
    if (rule.supplierId && rule.supplierId !== invoice.supplierId) continue
    
    // Dacă regula e specifică pe categorie și nu se potrivește
    if (rule.expenseCategory && effectiveCategory && rule.expenseCategory.toLowerCase() !== effectiveCategory.toLowerCase()) continue
    
    // Altfel, e un match
    matchedRule = rule
    break
  }

  // 4. Update the invoice
  const expenseDeductiblePercent = matchedRule ? matchedRule.expenseDeductiblePercent : 100
  const vatDeductiblePercent = matchedRule ? matchedRule.vatDeductiblePercent : 100

  // Calculate net and vat if settings specify VAT payer
  let netAmount = Number(invoice.amount)
  let vatAmount = 0
  let vatRate = 0

  if (settings?.isVatPayer) {
    // Estimare brut -> net. În mod ideal, OCR extrage separat Net și TVA. 
    // Dar dacă avem doar Amount (brut), scoatem TVA-ul standard.
    vatRate = Number(settings.defaultVatRate || 19)
    netAmount = Number(invoice.amount) / (1 + vatRate / 100)
    vatAmount = Number(invoice.amount) - netAmount
  }

  const updatedInvoice = await db.supplierInvoice.update({
    where: { id: invoiceId },
    data: {
      appliedRuleId: matchedRule?.id || null,
      expenseDeductiblePercent,
      vatDeductiblePercent,
      netAmount,
      vatAmount,
      vatRate
    }
  })

  return updatedInvoice
}

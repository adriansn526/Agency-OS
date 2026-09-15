// lib/accounting/calculations.ts
import type { SupplierInvoice, DeductibilityRule } from '@repo/db'

export function calculateDeductibleExpense(
  invoiceAmount: number,
  rulePercentage: number
): number {
  return Number(((invoiceAmount * rulePercentage) / 100).toFixed(2))
}

export function calculateDeductibleVat(
  invoiceAmount: number,
  vatRate: number = 19, // Cota standard TVA, se poate ajusta
  rulePercentage: number
): number {
  // Calculăm baza pentru TVA din valoarea brută 
  // Formula simplificata pentru suma neta: Brut / (1 + TVA_rate/100)
  const netAmount = invoiceAmount / (1 + (vatRate / 100))
  const vatAmount = invoiceAmount - netAmount
  
  return Number(((vatAmount * rulePercentage) / 100).toFixed(2))
}

export function getInvoiceCalculations(
  invoice: SupplierInvoice,
  defaultVatRate: number = 19
) {
  const amount = Number(invoice.amount)
  
  const expensePercentage = invoice.expenseDeductiblePercent ? Number(invoice.expenseDeductiblePercent) : 100
  const vatPercentage = invoice.vatDeductiblePercent ? Number(invoice.vatDeductiblePercent) : 100

  return {
    grossAmount: amount,
    expenseAmount: calculateDeductibleExpense(amount, expensePercentage),
    vatAmount: calculateDeductibleVat(amount, defaultVatRate, vatPercentage),
    expensePercentage,
    vatPercentage
  }
}

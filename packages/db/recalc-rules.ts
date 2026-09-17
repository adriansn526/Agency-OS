import { PrismaClient } from '@prisma/client'
import { applyDeductibilityRuleToInvoice } from '../../apps/web/lib/accounting/rules'

const prisma = new PrismaClient()

async function main() {
  const isDryRun = process.argv.includes('--dry-run')
  const tenant = await prisma.tenantInstance.findFirst()
  if (!tenant) throw new Error('No tenant found')

  console.log(`Starting ${isDryRun ? 'DRY RUN' : 'REAL RUN'} for recalculating rules...`)

  const invoices = await prisma.supplierInvoice.findMany({
    where: {
      tenantId: tenant.id,
      deductibilityOverride: { not: true }
    },
    include: {
      supplier: true
    }
  })

  console.log(`Found ${invoices.length} eligible invoices (not manually overridden).`)

  let modifiedCount = 0
  let noRuleCount = 0

  for (const invoice of invoices) {
    if (isDryRun) {
      // Logic from applyDeductibilityRuleToInvoice
      const effectiveCategory = invoice.expenseCategory || invoice.supplier?.category

      const rules = await prisma.deductibilityRule.findMany({
        where: {
          tenantId: tenant.id,
          validFrom: { lte: invoice.issueDate },
          OR: [
            { validTo: null },
            { validTo: { gt: invoice.issueDate } }
          ]
        },
        orderBy: { priority: 'desc' }
      })

      let matchedRule = null
      for (const rule of rules) {
        if (rule.supplierId && rule.supplierId !== invoice.supplierId) continue
        if (rule.expenseCategory && effectiveCategory && rule.expenseCategory.toLowerCase() !== effectiveCategory.toLowerCase()) continue
        matchedRule = rule
        break
      }

      if (matchedRule) {
        console.log(`[DRY RUN] Invoice ${invoice.invoiceNumber || invoice.id} (${invoice.issueDate.toISOString().split('T')[0]}) -> Will apply rule "${matchedRule.name}" (Cheltuială: ${matchedRule.expenseDeductiblePercent}%, TVA: ${matchedRule.vatDeductiblePercent}%)`)
        modifiedCount++
      } else {
        console.log(`[DRY RUN] Invoice ${invoice.invoiceNumber || invoice.id} (${invoice.issueDate.toISOString().split('T')[0]}) -> No rule matched (Fallback: 100%)`)
        noRuleCount++
      }
    } else {
      // Real run uses the central function
      const updated = await applyDeductibilityRuleToInvoice(invoice.id, tenant.id)
      if (updated && updated.appliedRuleId) {
        modifiedCount++
      } else {
        noRuleCount++
      }
    }
  }

  console.log(`\n=== Summary ===`)
  console.log(`Mode: ${isDryRun ? 'DRY RUN' : 'REAL RUN'}`)
  console.log(`Eligible Invoices: ${invoices.length}`)
  console.log(`Would Modify (Rules Applied): ${modifiedCount}`)
  console.log(`No Rule Matched (Fallback 100%): ${noRuleCount}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())

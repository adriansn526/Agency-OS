import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const isApply = process.argv.includes('--apply')
  const tenant = await prisma.tenantInstance.findFirst()
  if (!tenant) throw new Error("No tenant found")

  console.log(`Starting Data Migration Script for Categories - Mode: ${isApply ? 'APPLY' : 'DRY RUN'}`)

  // 1. Extract all existing string categories
  const rules = await prisma.deductibilityRule.findMany({ select: { id: true, expenseCategory: true } })
  const suppliers = await prisma.supplier.findMany({ select: { id: true, category: true } })
  const invoices = await prisma.supplierInvoice.findMany({ select: { id: true, expenseCategory: true } })

  const allStrings = [
    ...rules.map(r => r.expenseCategory),
    ...suppliers.map(s => s.category),
    ...invoices.map(i => i.expenseCategory)
  ].filter(Boolean) as string[]

  const uniqueRaw = Array.from(new Set(allStrings))
  
  // 2. Normalize and preserve original casing (most frequent)
  // Group by trimmed, lowercase version
  const groups = new Map<string, string[]>()
  for (const raw of allStrings) {
    const key = raw.trim().toLowerCase()
    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key)!.push(raw)
  }

  const normalizedMap = new Map<string, string>() // Maps raw string to chosen Display string
  const uniqueDisplayNames = new Set<string>()

  for (const [key, variants] of groups.entries()) {
    // Find the most frequent variant
    const counts = new Map<string, number>()
    for (const v of variants) {
      counts.set(v, (counts.get(v) || 0) + 1)
    }
    let mostFrequent = variants[0]
    let maxCount = 0
    for (const [v, c] of counts.entries()) {
      if (c > maxCount) {
        mostFrequent = v
        maxCount = c
      }
    }
    
    // mostFrequent is our chosen display name for this group
    uniqueDisplayNames.add(mostFrequent)
    
    // Map all unique raw values in this group to the most frequent one
    const uniqueGroupRaw = Array.from(new Set(variants))
    for (const raw of uniqueGroupRaw) {
      normalizedMap.set(raw, mostFrequent)
    }
  }

  console.log(`\nFound ${uniqueRaw.length} unique raw categories across DB.`)
  console.log(`They group into ${uniqueDisplayNames.size} distinct categories (preserving most frequent casing):\n`)
  
  for (const norm of Array.from(uniqueDisplayNames)) {
    const sources = uniqueRaw.filter(r => normalizedMap.get(r) === norm && r !== norm)
    if (sources.length > 0) {
      console.log(`- "${norm}" (also covers: ${sources.map(s => `"${s}"`).join(', ')})`)
    } else {
      console.log(`- "${norm}" (no other variants)`)
    }
  }

  // Check existing ExpenseCategory in DB
  const existingCategories = await prisma.expenseCategory.findMany({ where: { tenantId: tenant.id } })
  const existingNamesLower = new Set(existingCategories.map(c => c.name.toLowerCase()))

  const toCreate = Array.from(uniqueDisplayNames).filter(n => !existingNamesLower.has(n.toLowerCase()))
  
  console.log(`\nNew ExpenseCategory records to create: ${toCreate.length}`)
  toCreate.forEach(n => console.log(` + ${n}`))

  if (isApply) {
    console.log(`\n--- APPLYING CHANGES ---`)
    
    // 1. Create categories
    for (const name of toCreate) {
      await prisma.expenseCategory.create({
        data: {
          tenantId: tenant.id,
          name
        }
      })
      console.log(`Created category: ${name}`)
    }

    // 2. Update existing records to use normalized names
    let updatedRules = 0
    let updatedSuppliers = 0
    let updatedInvoices = 0

    for (const rule of rules) {
      if (rule.expenseCategory && normalizedMap.get(rule.expenseCategory) !== rule.expenseCategory) {
        await prisma.deductibilityRule.update({
          where: { id: rule.id },
          data: { expenseCategory: normalizedMap.get(rule.expenseCategory) }
        })
        updatedRules++
      }
    }

    for (const supplier of suppliers) {
      if (supplier.category && normalizedMap.get(supplier.category) !== supplier.category) {
        await prisma.supplier.update({
          where: { id: supplier.id },
          data: { category: normalizedMap.get(supplier.category) }
        })
        updatedSuppliers++
      }
    }

    for (const invoice of invoices) {
      if (invoice.expenseCategory && normalizedMap.get(invoice.expenseCategory) !== invoice.expenseCategory) {
        await prisma.supplierInvoice.update({
          where: { id: invoice.id },
          data: { expenseCategory: normalizedMap.get(invoice.expenseCategory) }
        })
        updatedInvoices++
      }
    }

    console.log(`\nUpdates Complete:`)
    console.log(`- Rules updated: ${updatedRules}`)
    console.log(`- Suppliers updated: ${updatedSuppliers}`)
    console.log(`- Invoices updated: ${updatedInvoices}`)
  } else {
    console.log(`\nRun with --apply to execute these changes.`)
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())

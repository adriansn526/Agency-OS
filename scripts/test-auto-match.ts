import { PrismaClient } from '@prisma/client'
import { Decimal } from 'decimal.js'

const prisma = new PrismaClient()

async function main() {
  const tenant = await prisma.tenantInstance.findFirst()
  if (!tenant) throw new Error('No tenant found')

  const bankConnection = await prisma.bankConnection.findFirst({ where: { tenantId: tenant.id } })
  if (!bankConnection) throw new Error('No bank connection found')

  // Create Supplier
  const supplier = await prisma.supplier.create({
    data: { tenantId: tenant.id, name: 'Google Cloud Match', category: 'Software' }
  })

  // Create TWO invoices with SAME amount
  await prisma.supplierInvoice.create({
    data: {
      tenantId: tenant.id, supplierId: supplier.id, amount: 250.00, currency: 'RON',
      issueDate: new Date('2026-09-01'), source: 'email', extractionStatus: 'confirmed', status: 'unpaid'
    }
  })
  await prisma.supplierInvoice.create({
    data: {
      tenantId: tenant.id, supplierId: supplier.id, amount: 250.00, currency: 'RON',
      issueDate: new Date('2026-09-10'), source: 'email', extractionStatus: 'confirmed', status: 'unpaid'
    }
  })

  // Simulate API Upload logic for matching
  const trx = { merchantName: 'Google Cloud', amount: 250.00, date: '2026-09-12', category: 'supplier_payment' }
  
  // Fuzzy match
  const matchedSupplier = await prisma.supplier.findFirst({
    where: { name: { contains: 'Google', mode: 'insensitive' } }
  })

  let extractionStatus = 'confirmed'
  let matchStatus = 'unmatched'

  if (matchedSupplier) {
    const unpaidInvoices = await prisma.supplierInvoice.findMany({
      where: { supplierId: matchedSupplier.id, status: 'unpaid' }
    })

    const trxAmount = new Decimal(trx.amount)
    const trxDate = new Date(trx.date)

    const candidates = unpaidInvoices.filter(inv => {
      const diffAmount = new Decimal(inv.amount).minus(trxAmount).abs()
      const diffDays = Math.ceil(Math.abs(trxDate.getTime() - new Date(inv.issueDate).getTime()) / (1000 * 60 * 60 * 24))
      return diffAmount.lessThanOrEqualTo(1) && diffDays <= 30
    })

    if (candidates.length === 1) {
      matchStatus = 'auto_matched'
    } else if (candidates.length > 1) {
      console.log('Conflict detected! Candidates count:', candidates.length)
      extractionStatus = 'pending_review'
    }
  }

  console.log('Final Extraction Status:', extractionStatus)

  // Clean up
  await prisma.supplierInvoice.deleteMany({ where: { supplierId: supplier.id } })
  await prisma.supplier.delete({ where: { id: supplier.id } })
}

main().catch(console.error).finally(() => prisma.$disconnect())

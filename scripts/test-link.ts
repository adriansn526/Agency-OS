import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const inv = await prisma.supplierInvoice.findFirst({
    where: { extractionStatus: 'pending_review' }
  })
  if (!inv) throw new Error('No pending invoice found')

  const supplier = await prisma.supplier.findFirst()
  if (!supplier) throw new Error('No supplier found')

  const updated = await prisma.supplierInvoice.update({
    where: { id: inv.id },
    data: {
      supplierId: supplier.id,
      extractionStatus: 'confirmed'
    }
  })
  
  console.log(`Linked invoice ${updated.id} to supplier ${updated.supplierId}`)
  
  // Clean up
  await prisma.supplierInvoice.delete({ where: { id: updated.id } })
}

main().catch(console.error).finally(() => prisma.$disconnect())

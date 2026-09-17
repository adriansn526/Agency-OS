import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const invoices = await prisma.supplierInvoice.findMany({
    where: { source: 'email' },
    orderBy: { createdAt: 'asc' }
  })
  
  console.log(`Found ${invoices.length} email invoices.`)
  
  const seen = new Set<string>()
  let deletedCount = 0
  
  for (const inv of invoices) {
    if (!inv.sourceRef) continue;
    
    if (seen.has(inv.sourceRef)) {
      console.log(`Deleting duplicate: ${inv.id} (sourceRef: ${inv.sourceRef})`)
      await prisma.supplierInvoice.delete({ where: { id: inv.id } })
      deletedCount++
    } else {
      seen.add(inv.sourceRef)
    }
  }
  
  console.log(`Finished. Deleted ${deletedCount} duplicates.`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())

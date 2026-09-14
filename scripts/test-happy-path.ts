import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  let tenant = await prisma.tenantInstance.findFirst()
  if (!tenant) {
    tenant = await prisma.tenantInstance.create({
      data: {
        name: 'Test Tenant',
        slug: 'test-tenant-' + Date.now(),
      }
    })
  }

  // Create a supplier to link to
  const supplier = await prisma.supplier.create({
    data: {
      tenantId: tenant.id,
      name: 'Test E2E Supplier',
      category: 'Software'
    }
  })

  // Create an orphan invoice
  const inv = await prisma.supplierInvoice.create({
    data: {
      tenantId: tenant.id,
      amount: 500,
      currency: 'EUR',
      issueDate: new Date(),
      invoiceNumber: 'E2E-123',
      pdfUrl: 'https://mock.pdf',
      source: 'email',
      sourceRef: 'msg-id-mock-e2e',
      extractionStatus: 'pending_review',
      extractedBy: 'llm',
      extractedSupplierName: 'Test E2E Supplier SRL',
    }
  })
  console.log('Created orphan invoice:', inv.id, 'with extracted name:', inv.extractedSupplierName)

  // Simulate Review UI Linking
  const updated = await prisma.supplierInvoice.update({
    where: { id: inv.id },
    data: {
      supplierId: supplier.id,
      extractionStatus: 'confirmed'
    }
  })
  
  console.log(`Successfully linked invoice ${updated.id} to supplier ${updated.supplierId}`)
  console.log(`Invoice extraction status is now: ${updated.extractionStatus}`)

  // Clean up
  await prisma.supplierInvoice.delete({ where: { id: updated.id } })
  await prisma.supplier.delete({ where: { id: supplier.id } })
}

main().catch(console.error).finally(() => prisma.$disconnect())

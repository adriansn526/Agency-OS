import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const tenant = await prisma.tenantInstance.findFirst()
  if (!tenant) throw new Error('No tenant found')

  // Create an orphan invoice
  const inv = await prisma.supplierInvoice.create({
    data: {
      tenantId: tenant.id,
      amount: 125.50,
      currency: 'RON',
      issueDate: new Date(),
      invoiceNumber: 'MOCK-123',
      pdfUrl: 'https://mock.pdf',
      source: 'email',
      sourceRef: 'msg-id-mock-abc',
      extractionStatus: 'pending_review',
      extractedBy: 'llm',
      extractedSupplierName: 'Firma Fantomă SRL',
    }
  })
  console.log('Created mock orphaned invoice:', inv.id)
}

main().catch(console.error).finally(() => prisma.$disconnect())

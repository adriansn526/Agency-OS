import { PrismaClient } from './node_modules/@prisma/client'
const db = new PrismaClient()

async function main() {
  const count = await db.supplierInvoice.count()
  const withXml = await db.supplierInvoice.count({ where: { xmlData: { not: null } } })
  console.log(`Total invoices: ${count}, with XML: ${withXml}`)
}

main().catch(console.error).finally(() => db.$disconnect())

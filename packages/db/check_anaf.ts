import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const tenant = await prisma.tenantInstance.findFirst()
  if (!tenant) {
    console.log("No tenant found.")
    return
  }
  const anaf = await prisma.anafSettings.findUnique({ where: { tenantId: tenant.id } })
  console.log("ANAF Settings:", anaf)
}

main().catch(e => {
  console.error(e)
}).finally(() => {
  prisma.$disconnect()
})

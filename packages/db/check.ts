import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const tenants = await prisma.tenantInstance.findMany()
  console.log(JSON.stringify(tenants))
}
main().finally(() => prisma.$disconnect())

import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()

async function test() {
  const tenant = await db.tenantInstance.findFirst()
  const settings = await db.anafSettings.findFirst({ where: { tenantId: tenant.id } })
  console.log(settings)
}

test().catch(console.error).finally(() => db.$disconnect())

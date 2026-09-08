import { PrismaClient } from "@prisma/client"

const db = new PrismaClient()

async function main() {
  const t = await db.tenantInstance.findMany({
    select: { id: true, tenantId: true, tenantName: true }
  })
  console.log("ALL TenantInstances:", t)
}

main().catch(console.error)

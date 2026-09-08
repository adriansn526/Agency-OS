import { PrismaClient } from "@prisma/client"

const db = new PrismaClient()

async function main() {
  const t = await db.tenantInstance.findUnique({
    where: { id: "cmpw2gtak0000mb19sdbdl8on" }
  })
  console.log("TenantInstance:", t)
}

main().catch(console.error)

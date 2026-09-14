// Usage: npx tsx apps/web/scripts/register-tenant-agency.ts

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  const tenantId = "cmtxx6rnp0000mbgscivybh4p" // Tenantul pe care tocmai l-am creat (Tentrom Paradise)
  const tenantName = "Tentrom Paradise"
  const tenantSlug = "tentrom-paradise"
  const apiEndpoint = "https://erp.tentromgroup.ro"

  const instance = await prisma.tenantInstance.upsert({
    where: { tenantId },
    update: {
      tenantName,
      tenantSlug,
      apiEndpoint,
      status: "active"
    },
    create: {
      tenantId,
      tenantName,
      tenantSlug,
      apiEndpoint,
      status: "active",
      deploymentType: "shared"
    }
  })

  console.log("✅ Tenant înregistrat în Agency OS:", instance)
}

main().finally(() => prisma.$disconnect())

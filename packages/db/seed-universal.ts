import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  await prisma.creditPricingRule.upsert({
    where: { serviceName: "universal_credit" },
    update: {},
    create: {
      serviceName: "universal_credit",
      costPerUnitEur: 0.005,
      creditsPerUnit: 1,
      unitDescription: "per 1 Credit Universal"
    }
  })
  console.log("Universal credit rule seeded successfully!")
}

main().catch(console.error).finally(() => prisma.$disconnect())

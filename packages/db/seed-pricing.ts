import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const defaultRules = [
    { serviceName: "sms", costPerUnitEur: 0.04, creditsPerUnit: 10, unitDescription: "per 1 SMS" },
    { serviceName: "twilio_sip", costPerUnitEur: 0.02, creditsPerUnit: 5, unitDescription: "per 1 Minut Telefonie" },
    { serviceName: "elevenlabs", costPerUnitEur: 0.08, creditsPerUnit: 20, unitDescription: "per 1 Minut Voce AI" },
    { serviceName: "gpt4o_tokens_1m", costPerUnitEur: 2.50, creditsPerUnit: 500, unitDescription: "per 1M Tokens" }
  ]

  for (const rule of defaultRules) {
    await prisma.creditPricingRule.upsert({
      where: { serviceName: rule.serviceName },
      update: {},
      create: rule
    })
  }
  console.log("Pricing rules seeded successfully!")
}

main().catch(console.error).finally(() => prisma.$disconnect())

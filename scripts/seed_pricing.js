const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const defaults = [
    { serviceName: 'gpt4o_tokens_1m', costPerUnitEur: 5.0, creditsPerUnit: 100, unitDescription: 'per 1M Tokens (text)' },
    { serviceName: 'openai_rtc', costPerUnitEur: 0.05, creditsPerUnit: 10, unitDescription: 'per 1 Minute (voice)' },
    { serviceName: 'whatsapp', costPerUnitEur: 0.01, creditsPerUnit: 5, unitDescription: 'per 1 Message' },
  ]
  for (const rule of defaults) {
    await prisma.creditPricingRule.upsert({
      where: { serviceName: rule.serviceName },
      update: {},
      create: rule
    })
  }
  console.log("Pricing rules seeded.")
}
main().catch(console.error).finally(() => prisma.$disconnect())

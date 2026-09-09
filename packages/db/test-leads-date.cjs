const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const dateFrom = '2026-07-01'
  const dateTo = '2026-08-31'
  const count = await prisma.lead.count({
    where: {
      sourceDomain: 'inchideriterase.ro',
      createdAt: {
        gte: new Date(dateFrom),
        lte: new Date(dateTo + 'T23:59:59Z'),
      },
    }
  })
  console.log("Count in date range:", count)
}
main().catch(console.error).finally(() => prisma.$disconnect())

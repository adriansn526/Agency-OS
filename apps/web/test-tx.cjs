const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
async function main() {
  const tx = await prisma.bankTransaction.findMany({take: 2})
  console.log(tx)
}
main().catch(console.error).finally(()=>prisma.$disconnect())

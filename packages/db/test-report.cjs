const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const report = await prisma.clientReport.findUnique({
    where: { token: 'cmqay95fg0003mb16y4q8sio9' }
  })
  console.log("Report domain:", report.domain)
}
main().catch(console.error).finally(() => prisma.$disconnect())

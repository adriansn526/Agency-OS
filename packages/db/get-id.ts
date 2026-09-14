import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function run() {
  const r = await prisma.clientReport.findFirst({ where: { token: 'cmqay95fg0003mb16y4q8sio9' } })
  console.log('ID:', r?.id)
}
run()

import { PrismaClient } from '../packages/db/node_modules/@prisma/client/index.js'
const db = new PrismaClient()
async function main() {
  const instances = await db.tenantInstance.findMany()
  console.log("Instances:", instances)
}
main().catch(console.error).finally(() => db.$disconnect())

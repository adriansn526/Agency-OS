const { PrismaClient } = require('@repo/db');
const db = new PrismaClient();
async function main() {
  const instances = await db.tenantInstance.findMany();
  console.log("Instances:", instances);
}
main().catch(console.error).finally(() => db.$disconnect());

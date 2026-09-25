import { PrismaClient } from './packages/db/src/index';
const db = new PrismaClient();
async function run() {
  const instances = await db.tenantInstance.findMany();
  console.log('INSTANCES:', JSON.stringify(instances, null, 2));
}
run();

import { PrismaClient } from './packages/db/src/index';
const db = new PrismaClient();
async function run() {
  const instances = await db.tenantInstance.findMany({
    where: { deploymentType: "dedicated" }
  });
  console.log('INSTANCES:', instances);
}
run();

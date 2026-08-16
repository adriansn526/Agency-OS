import { PrismaClient } from '@repo/db';
const db = new PrismaClient();

async function main() {
  const instances = await db.tenantInstance.findMany();
  for (const inst of instances) {
    if (inst.apiEndpoint) {
      try {
        new URL(inst.apiEndpoint);
      } catch (e) {
        console.log("Fixing invalid endpoint:", inst.apiEndpoint);
        await db.tenantInstance.update({
          where: { id: inst.id },
          data: { apiEndpoint: "http://" + inst.apiEndpoint }
        });
      }
    }
  }
  console.log("Done");
}
main().catch(console.error).finally(() => db.$disconnect());

import { db } from "@repo/db";

async function main() {
  const bl = await db.businessLine.findFirst();
  const config = bl?.config as any;
  console.log(config?.projectTemplates?.map(t => t.id));
}
main().catch(console.error).finally(() => process.exit(0));

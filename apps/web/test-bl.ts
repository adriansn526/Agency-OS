import { db } from "@repo/db";

async function main() {
  const bls = await db.businessLine.findMany();
  console.log(JSON.stringify(bls, null, 2));
}

main().catch(console.error).finally(() => process.exit(0));

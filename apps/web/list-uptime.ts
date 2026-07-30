import { db } from "@repo/db";

async function main() {
  const checks = await db.uptimeCheck.findMany({
    select: { domain: true },
    distinct: ['domain']
  });
  console.log("Domains in UptimeCheck:", checks.map(c => c.domain));
}

main().catch(console.error);

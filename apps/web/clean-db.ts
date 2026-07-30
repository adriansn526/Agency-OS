import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const badDomain = "sc:qualitycontrol.com.ro";
  
  const checks = await db.uptimeCheck.deleteMany({
    where: { domain: badDomain }
  });
  console.log(`Deleted ${checks.count} UptimeChecks`);

  const incidents = await db.uptimeIncident.deleteMany({
    where: { domain: badDomain }
  });
  console.log(`Deleted ${incidents.count} UptimeIncidents`);
}

main()
  .then(() => process.exit(0))
  .catch(e => {
    console.error(e);
    process.exit(1);
  });

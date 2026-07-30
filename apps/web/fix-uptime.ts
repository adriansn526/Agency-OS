import { db } from "@repo/db";

async function main() {
  const badDomain = "sc:qualitycontrol.com.ro";
  
  // Find UptimeChecks
  const checks = await db.uptimeCheck.deleteMany({
    where: { domain: badDomain }
  });
  console.log(`Deleted ${checks.count} UptimeChecks for ${badDomain}`);

  const incidents = await db.uptimeIncident.deleteMany({
    where: { domain: badDomain }
  });
  console.log(`Deleted ${incidents.count} UptimeIncidents for ${badDomain}`);
  
  // Just in case it's in websites array
  const allClients = await db.client.findMany();
  for (const client of allClients) {
    if (client.websites.includes(badDomain)) {
      const updated = client.websites.filter(w => w !== badDomain);
      await db.client.update({
        where: { id: client.id },
        data: { websites: updated }
      });
      console.log(`Removed ${badDomain} from Client ${client.companyName} (${client.id})`);
    }
  }
}

main().catch(console.error);

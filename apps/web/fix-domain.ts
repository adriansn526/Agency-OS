import { db } from "@repo/db";

async function main() {
  const clients = await db.client.findMany({
    where: { websites: { has: "sc:qualitycontrol.com.ro" } }
  });

  for (const client of clients) {
    const updatedWebsites = client.websites.filter(w => w !== "sc:qualitycontrol.com.ro");
    await db.client.update({
      where: { id: client.id },
      data: { websites: updatedWebsites }
    });
    console.log(`Removed from client: ${client.companyName}`);
  }

  const configs = await db.clientDomainConfig.findMany({
    where: { domain: "sc:qualitycontrol.com.ro" }
  });

  for (const config of configs) {
    await db.clientDomainConfig.delete({
      where: { id: config.id }
    });
    console.log(`Deleted config: ${config.id}`);
  }
}

main().catch(console.error);

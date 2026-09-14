import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const alerts = await prisma.systemAlert.findMany({ where: { domain: null } });
  let count = 0;
  for (const alert of alerts) {
    let domain = null;
    if (alert.metadata) {
      const payload = alert.metadata;
      domain = payload.domain || payload.event?.properties?.domain || payload.event?.properties?.$host || null;
      if (!domain && payload.event?.properties?.$current_url) {
        try {
          domain = new URL(payload.event.properties.$current_url).hostname;
        } catch(e) {}
      }
    }
    if (domain) {
      await prisma.systemAlert.update({
        where: { id: alert.id },
        data: { domain }
      });
      count++;
    }
  }
  console.log(`Updated ${count} alerts with domain`);
}
main().catch(console.error).finally(() => prisma.$disconnect());

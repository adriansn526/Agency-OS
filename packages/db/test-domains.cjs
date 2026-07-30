const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function run() {
  const clients = await db.client.findMany({
    where: { status: 'activ', deletedAt: null },
    select: {
      id: true,
      companyName: true,
      website: true,
      websites: true,
      gscSiteUrl: true,
      projects: {
        where: { status: { not: 'suspendat' } },
        select: { metadata: true },
      },
    },
  });
  console.log("CLIENTS FOUND:", clients.length);
  const asns = clients.find(c => c.id === 'test_advanced_systems_id');
  console.log("ASNS CLIENT:", asns);
  db.$disconnect();
}
run();

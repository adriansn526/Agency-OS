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

  const seen = new Set();
  const domains = [];

  function addDomain(raw, clientId, clientName) {
    if (!raw) return;
    let domain = raw
      .replace(/^https?:\/\//, '')
      .replace(/^sc(?:-domain)?:/, '')
      .replace(/\/$/, '')
      .trim();
    if (!domain || domain.length < 4 || !domain.includes('.')) return;

    const key = `${domain}__${clientId}`;
    if (seen.has(key)) return;
    seen.add(key);
    
    domains.push({
      domain,
      url: `https://${domain}`,
      clientId,
      clientName,
    });
  }

  for (const client of clients) {
    if (client.websites && client.websites.length > 0) {
      for (const w of client.websites) {
        addDomain(w, client.id, client.companyName);
      }
    } else {
      addDomain(client.website, client.id, client.companyName);
    }
    addDomain(client.gscSiteUrl, client.id, client.companyName);
  }
  
  console.log("EXTRACTED DOMAINS:", domains);
  db.$disconnect();
}
run();

const {PrismaClient} = require('@prisma/client');
const db = new PrismaClient();

const gscMapping = {
  'SEO — inchideriterase.ro': 'sc-domain:inchideriterase.ro',
  'Google Ads — inchideriterase.ro': 'sc-domain:inchideriterase.ro',
  'SEO — debitare-plasma.ro': 'sc-domain:debitare-plasma.ro',
  'Google Ads — debitare-plasma.ro': 'sc-domain:debitare-plasma.ro',
  'Google Ads — swissamanet.ro': 'sc-domain:swissamanet.ro',
};

async function main() {
  const projects = await db.project.findMany();
  for (const p of projects) {
    const gscUrl = gscMapping[p.name];
    if (!gscUrl) continue;
    
    const meta = p.metadata || {};
    if (meta.gscSiteUrl === gscUrl) {
      console.log('⏭️', p.name, '→ already set');
      continue;
    }
    
    meta.gscSiteUrl = gscUrl;
    await db.project.update({ where: { id: p.id }, data: { metadata: meta } });
    console.log('✅', p.name, '→', gscUrl);
  }
  await db.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });

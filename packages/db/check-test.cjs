const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function run() {
  const segments = await db.marketingSegment.findMany({ where: { name: { contains: 'Test' } } });
  console.log('Segments found:', segments.length);
  for (const s of segments) {
    console.log(' -', s.id, s.name);
  }
  
  const leads = await db.lead.findMany({ where: { phone: '0731156333' } });
  console.log('Leads found:', leads.length);
  for (const l of leads) {
    console.log(' -', l.id, l.companyName, l.phone);
  }
  
  await db.$disconnect();
}

run().catch(e => { console.error(e); process.exit(1); });

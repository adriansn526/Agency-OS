const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function run() {
  const fudly = await db.businessLine.findUnique({ where: { slug: 'fudly' } });
  if (!fudly) { console.log('No fudly BL'); return; }

  const segment = await db.marketingSegment.create({
    data: {
      businessLineId: fudly.id,
      name: '🧪 Test — Adrian',
      description: 'Segment de test cu un singur lead (tel: 0731156333)',
      filters: [
        { field: 'phone', operator: 'equals', value: '0731156333' }
      ],
      contactCount: 1,
    }
  });
  console.log('Created segment:', segment.id, segment.name);
  await db.$disconnect();
}

run().catch(e => { console.error('Error:', e.message); process.exit(1); });

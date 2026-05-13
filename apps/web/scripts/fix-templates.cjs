const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });

(async () => {
  const meta = { kpis: [], phases: [], viewType: 'timeline', checklist: [] };

  // Fix templateId and metadata for all non-Marystelv projects
  const projs = await db.project.findMany({
    where: { clientId: { not: 'cmnta3s9y0001cufuxtgnvv1q' } },
    select: { id: true, name: true, templateId: true },
  });

  for (const p of projs) {
    const tid = p.name.includes('SEO') ? 'seo' : 'google_ads';
    await db.project.update({ where: { id: p.id }, data: { templateId: tid, metadata: meta } });
    console.log('✅', p.name, '→', tid);
  }

  // Verify all
  const all = await db.project.findMany({ select: { name: true, templateId: true } });
  console.log('\nAll projects:');
  all.forEach(p => console.log(' ', p.name, '|', p.templateId));

  await db.$disconnect();
  process.exit(0);
})();

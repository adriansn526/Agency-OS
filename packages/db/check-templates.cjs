const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function run() {
  const templates = await db.marketingTemplate.findMany({ 
    include: { businessLine: { select: { slug: true } } },
    orderBy: { createdAt: 'desc' }
  });
  
  console.log('Total templates:', templates.length);
  templates.forEach(x => {
    console.log('---');
    console.log('BL:', x.businessLine.slug, '| Channel:', x.channel, '| Name:', x.name);
    console.log('Body:', x.body.substring(0, 200));
    console.log('Variables:', x.variables);
  });
  
  await db.$disconnect();
}
run().catch(console.error);

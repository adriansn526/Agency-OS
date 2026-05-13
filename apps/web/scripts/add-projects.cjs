const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
const BL = 'cmnt9v12a0000cuq34gzt12vp';

(async () => {
  try {
    const clients = await db.client.findMany({ select: { id: true, companyName: true } });
    console.log('Clients:', clients.map(c => `${c.companyName} (${c.id})`));

    const swiss = clients.find(c => c.companyName.includes('Swiss'));
    const tentrom = clients.find(c => c.companyName.includes('TENTROM'));

    if (!swiss || !tentrom) { console.error('Clients not found!'); process.exit(1); }

    // Swiss Amanet - 1 project
    const p1 = await db.project.create({
      data: {
        businessLineId: BL, clientId: swiss.id, templateId: 'google-ads',
        name: 'Google Ads - swissamanet.ro', status: 'activ', progress: 0,
        notes: 'Campanie Google Ads pentru site-ul swissamanet.ro',
        metadata: { website: 'swissamanet.ro', services: ['Google Ads'] },
      }
    });
    console.log('✅ Project:', p1.name, '→', swiss.companyName);

    // Tentrom Paradise - 3 projects
    const p2 = await db.project.create({
      data: {
        businessLineId: BL, clientId: tentrom.id, templateId: 'seo',
        name: 'SEO - inchideriterase.ro', status: 'activ', progress: 0,
        notes: 'Optimizare SEO pentru inchideriterase.ro',
        metadata: { website: 'inchideriterase.ro', services: ['SEO'] },
      }
    });
    console.log('✅ Project:', p2.name, '→', tentrom.companyName);

    const p3 = await db.project.create({
      data: {
        businessLineId: BL, clientId: tentrom.id, templateId: 'google-ads',
        name: 'Google Ads - inchideriterase.ro', status: 'activ', progress: 0,
        notes: 'Campanie Google Ads pentru inchideriterase.ro',
        metadata: { website: 'inchideriterase.ro', services: ['Google Ads'] },
      }
    });
    console.log('✅ Project:', p3.name, '→', tentrom.companyName);

    const p4 = await db.project.create({
      data: {
        businessLineId: BL, clientId: tentrom.id, templateId: 'seo',
        name: 'SEO - debitare-plasma.ro', status: 'activ', progress: 0,
        notes: 'Optimizare SEO pentru debitare-plasma.ro',
        metadata: { website: 'debitare-plasma.ro', services: ['SEO'] },
      }
    });
    console.log('✅ Project:', p4.name, '→', tentrom.companyName);

    const p5 = await db.project.create({
      data: {
        businessLineId: BL, clientId: tentrom.id, templateId: 'google-ads',
        name: 'Google Ads - debitare-plasma.ro', status: 'activ', progress: 0,
        notes: 'Campanie Google Ads pentru debitare-plasma.ro',
        metadata: { website: 'debitare-plasma.ro', services: ['Google Ads'] },
      }
    });
    console.log('✅ Project:', p5.name, '→', tentrom.companyName);

    console.log('\n✅ Total: 5 projects created');
  } catch (e) {
    console.error('Error:', e.message);
  }
  await db.$disconnect();
  process.exit(0);
})();

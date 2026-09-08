const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.lead.findMany({ 
  take: 1, 
  orderBy: { createdAt: 'desc' },
  include: { businessLine: true }
}).then(leads => {
  if (leads.length > 0) {
    console.log('--- LATEST LEAD ---');
    console.log('Name:', leads[0].contactName);
    console.log('Source:', leads[0].source);
    console.log('Notes:', leads[0].notes);
    console.log('Business Line:', leads[0].businessLine ? leads[0].businessLine.name + ' (' + leads[0].businessLine.domain + ')' : 'None');
    console.log('Created At:', leads[0].createdAt);
  } else {
    console.log('No leads found.');
  }
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});

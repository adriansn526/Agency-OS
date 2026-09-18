const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function fix() {
  const txs = await prisma.bankTransaction.findMany({
    where: { date: { gte: new Date('2026-06-01'), lte: new Date('2026-06-30') } },
    orderBy: { createdAt: 'asc' }
  });
  if(!txs.length) return;
  const firstUrl = txs[0].sourcePdfUrl;
  console.log('Updating 54 records to url:', firstUrl);
  const result = await prisma.bankTransaction.updateMany({
    where: { id: { in: txs.map(t=>t.id) } },
    data: { sourcePdfUrl: firstUrl }
  });
  console.log('Update result:', result);
  console.log('Done!');
}
fix().catch(console.error).finally(() => prisma.$disconnect());

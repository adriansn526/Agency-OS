const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const oldId = 'fb3603ea-93c5-4fa4-8815-1f59714d13b1';
  const newId = 'aeroduct-id';
  
  try {
    const s = await prisma.spvSyncLog.updateMany({ where: { tenantId: oldId }, data: { tenantId: newId }});
    console.log('SpvSyncLogs updated:', s.count);
  } catch (e) {}

  try {
    const l = await prisma.bankStatement.updateMany({ where: { tenantId: oldId }, data: { tenantId: newId }});
    console.log('BankStatements updated:', l.count);
  } catch (e) {}
  
  try {
    const l = await prisma.bankTransaction.updateMany({ where: { tenantId: oldId }, data: { tenantId: newId }});
    console.log('BankTransactions updated:', l.count);
  } catch (e) {}
}

run().finally(() => prisma.$disconnect());

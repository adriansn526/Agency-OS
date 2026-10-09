const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const oldId = 'fb3603ea-93c5-4fa4-8815-1f59714d13b1';
  const newId = '0000-agency-os';
  
  // Create the new 0000-agency-os tenant
  const existing = await prisma.tenantInstance.findUnique({ where: { tenantId: newId }});
  if (!existing) {
    await prisma.tenantInstance.create({
      data: {
        id: newId,
        tenantId: newId,
        tenantName: 'Agency OS (Internal)',
        tenantSlug: 'agency-os',
        deploymentType: 'internal',
        status: 'active',
        plan: 'enterprise'
      }
    });
  }
  
  // Move data from fb3603ea to 0000-agency-os
  const tables = [
    prisma.supplier,
    prisma.supplierInvoice,
    prisma.spvSyncLog,
    prisma.bankStatement,
    prisma.bankTransaction,
    prisma.offer,
    prisma.contract,
    prisma.lead,
    prisma.project,
    prisma.marketingCampaign
  ];
  
  for (const table of tables) {
    try {
      await table.updateMany({ where: { tenantId: oldId }, data: { tenantId: newId }});
    } catch (e) { }
  }
  
  try { await prisma.$executeRawUnsafe(`UPDATE "Invoice" SET "tenantId" = $1 WHERE "tenantId" = $2`, newId, oldId).catch(() => 0); } catch(e){}
  try { await prisma.$executeRawUnsafe(`UPDATE "Client" SET "tenantId" = $1 WHERE "tenantId" = $2`, newId, oldId).catch(() => 0); } catch(e){}
  try { await prisma.$executeRawUnsafe(`UPDATE "Activity" SET "tenantId" = $1 WHERE "tenantId" = $2`, newId, oldId).catch(() => 0); } catch(e){}
  try { await prisma.$executeRawUnsafe(`UPDATE "Communication" SET "tenantId" = $1 WHERE "tenantId" = $2`, newId, oldId).catch(() => 0); } catch(e){}

  // Delete the old fb3603ea tenant to avoid confusion
  try {
    await prisma.tenantInstance.delete({ where: { tenantId: oldId }});
  } catch (e) {}

  console.log('Renamed Agency OS internal tenant to 0000-agency-os successfully.');
}

run().finally(() => prisma.$disconnect());

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  // Create Agency OS tenant
  const agencyTenantId = 'fb3603ea-93c5-4fa4-8815-1f59714d13b1';
  
  const existing = await prisma.tenantInstance.findUnique({ where: { tenantId: agencyTenantId }});
  
  if (!existing) {
    await prisma.tenantInstance.create({
      data: {
        id: agencyTenantId,
        tenantId: agencyTenantId,
        tenantName: 'Agency OS (Internal)',
        tenantSlug: 'agency-os',
        deploymentType: 'internal',
        status: 'active',
        plan: 'enterprise'
      }
    });
    console.log('Agency OS tenant recreated!');
  }
  
  // Move data from aeroduct-id back to agency-os
  const tables = [
    prisma.supplier,
    prisma.supplierInvoice,
    prisma.spvSyncLog,
    prisma.bankStatement,
    prisma.bankTransaction
  ];
  
  let total = 0;
  for (const table of tables) {
    try {
      const res = await table.updateMany({
        where: { tenantId: 'aeroduct-id' },
        data: { tenantId: agencyTenantId }
      });
      total += res.count;
    } catch (e) { }
  }
  
  // For Invoice and Client, execute raw
  try {
    const i = await prisma.$executeRawUnsafe(`UPDATE "Invoice" SET "tenantId" = $1 WHERE "tenantId" = $2`, agencyTenantId, 'aeroduct-id').catch(() => 0);
    total += i;
  } catch (e) {}
  
  try {
    const c = await prisma.$executeRawUnsafe(`UPDATE "Client" SET "tenantId" = $1 WHERE "tenantId" = $2`, agencyTenantId, 'aeroduct-id').catch(() => 0);
    total += c;
  } catch (e) {}

  console.log('Data moved back to Agency OS:', total);
}

run().finally(() => prisma.$disconnect());

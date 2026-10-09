const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function check() { 
  await prisma.$executeRawUnsafe('UPDATE "TenantInstance" SET "updatedAt" = NOW() WHERE id = \'aeroduct-id\''); 
  const t = await prisma.tenantInstance.findFirst(); 
  console.log('FIRST TENANT IS NOW:', t?.id); 
} 
check();

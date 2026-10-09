const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function check() { 
  await prisma.$executeRawUnsafe('UPDATE "BankConnection" SET "tenantId" = \'0000-agency-os\' WHERE "tenantId" = \'fb3603ea-93c5-4fa4-8815-1f59714d13b1\''); 
  console.log('Updated BankConnection'); 
} 
check();

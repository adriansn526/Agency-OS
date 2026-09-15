const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: 'postgresql://agency_os:AgencyOS_2026!Secure@localhost:5434/agency_os?schema=public' } } });

async function main() {
  const c = await prisma.tenantInstance.count();
  console.log('Tenants:', c);
  const t = await prisma.tenantInstance.findFirst();
  console.log('Tenant:', t);
}
main().catch(console.error).finally(() => prisma.$disconnect());

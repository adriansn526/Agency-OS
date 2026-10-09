const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const s = await prisma.supplier.findFirst();
  console.log('Supplier tenantId:', s ? s.tenantId : 'No suppliers');
  
  const i = await prisma.invoice.findFirst();
  console.log('Invoice tenantId:', i ? i.tenantId : 'No invoices');
  
  const t = await prisma.tenantInstance.findMany();
  console.log('All Tenants:', t.map(x => x.id));
}

check().finally(() => prisma.$disconnect());

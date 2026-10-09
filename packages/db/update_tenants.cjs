const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const oldId = 'fb3603ea-93c5-4fa4-8815-1f59714d13b1';
  const newId = 'aeroduct-id';
  
  // Tables with tenantId
  const tables = ['supplier', 'supplierInvoice', 'invoice']; // wait, let's see which tables have tenantId
  let count = 0;
  
  try {
    const s = await prisma.supplier.updateMany({ where: { tenantId: oldId }, data: { tenantId: newId }});
    console.log('Suppliers updated:', s.count);
    count += s.count;
    
    const si = await prisma.supplierInvoice.updateMany({ where: { tenantId: oldId }, data: { tenantId: newId }});
    console.log('SupplierInvoices updated:', si.count);
    count += si.count;
    
    // Check invoice
    const i = await prisma.$executeRawUnsafe(`UPDATE "Invoice" SET "tenantId" = $1 WHERE "tenantId" = $2`, newId, oldId).catch(() => 0);
    console.log('Invoices updated:', i);
    
    // Check clients
    const c = await prisma.$executeRawUnsafe(`UPDATE "Client" SET "tenantId" = $1 WHERE "tenantId" = $2`, newId, oldId).catch(() => 0);
    console.log('Clients updated:', c);
    
  } catch (e) { console.error(e) }
  
  console.log('Total fixed:', count);
}
run().finally(() => prisma.$disconnect());

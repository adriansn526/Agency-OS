const { PrismaClient } = require('@prisma/client');

async function run() {
  const db = new PrismaClient();
  
  const orphans = await db.supplierInvoice.findMany({
    where: { supplierId: null },
    select: {
      id: true,
      extractedSupplierName: true,
      amount: true,
      currency: true,
      issueDate: true,
      xmlData: true
    }
  });

  console.log(`Found ${orphans.length} orphaned invoices.`);
  
  const uniqueNames = [...new Set(orphans.map(o => o.extractedSupplierName))];
  console.log('Unique supplier names:', uniqueNames);

  await db.$disconnect();
}
run();

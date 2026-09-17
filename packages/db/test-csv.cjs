const { PrismaClient } = require('@prisma/client');
const { endOfMonth, startOfMonth, parseISO } = require('date-fns');
const db = new PrismaClient();

async function run() {
  const month = '2026-09';
  const tenantId = 'fb3603ea-93c5-4fa4-8815-1f59714d13b1';
  const startDate = startOfMonth(parseISO(`${month}-01`));
  const endDate = endOfMonth(startDate);

  const invoices = await db.supplierInvoice.findMany({
    where: { 
      tenantId, 
      issueDate: { gte: startDate, lte: endDate }, 
      extractionStatus: 'confirmed' 
    },
    include: { supplier: true },
    orderBy: { issueDate: 'asc' }
  });

  console.log(`Found ${invoices.length} invoices`);
  
  for (const inv of invoices) {
      const dedCheltuialaPct = inv.expenseDeductiblePercent ? Number(inv.expenseDeductiblePercent) : 0;
      const dedCheltuialaVal = (Number(inv.netAmount || 0) * (dedCheltuialaPct / 100)).toFixed(2);
      
      const dedTvaPct = inv.vatDeductiblePercent ? Number(inv.vatDeductiblePercent) : 0;
      const dedTvaVal = (Number(inv.vatAmount || 0) * (dedTvaPct / 100)).toFixed(2);
  }
  console.log('Done');
}
run().catch(console.error).finally(() => db.$disconnect());

const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
async function run() {
  const s = await db.supplier.findFirst({
    where: { id: '6d4567008dca1eafefc79b776' },
    include: {
      invoices: {
        orderBy: { issueDate: 'desc' },
        include: { payments: true }
      }
    }
  });
  console.log('Invoices count:', s.invoices.length);
}
run().finally(() => db.$disconnect());

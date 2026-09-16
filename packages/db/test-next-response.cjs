const { NextResponse } = require('next/server');
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
async function run() {
  const s = await db.supplier.findFirst({
    where: { id: '6d4567008dca1eafefc79b776' },
    include: { invoices: true }
  });
  console.log('Supplier invoices length:', s.invoices.length);
  try {
    const jsonStr = JSON.stringify({ data: s });
    console.log('JSON Length:', jsonStr.length);
    console.log('JSON contains invoices:', jsonStr.includes('invoices'));
  } catch(e) {
    console.error('JSON Error:', e.message);
  }
}
run().finally(() => db.$disconnect());

const { PrismaClient } = require('@prisma/client');
const { Decimal } = require('decimal.js');

async function run() {
  const db = new PrismaClient();
  const invoice = await db.supplierInvoice.findFirst();
  if (invoice) {
    try {
      console.log('Invoice amount type:', typeof invoice.amount);
      const invoiceTotal = new Decimal(invoice.amount);
      console.log('Success:', invoiceTotal.toString());
    } catch (e) {
      console.error('Error:', e);
    }
  }
  await db.$disconnect();
}
run();

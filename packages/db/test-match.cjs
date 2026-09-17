const { PrismaClient } = require('@prisma/client');
const { Decimal } = require('decimal.js');

async function run() {
  const db = new PrismaClient();
  const txRecord = await db.bankTransaction.findFirst({ where: { matchStatus: 'unmatched' } });
  const invoice = await db.supplierInvoice.findFirst();
  
  if (!txRecord || !invoice) {
    console.log('No tx or invoice found');
    return;
  }

  try {
    const paymentAmount = new Decimal(txRecord.amount);
    await db.$transaction(async (tx) => {
      await tx.bankTransaction.update({
        where: { id: txRecord.id },
        data: {
          matchStatus: 'manually_matched',
          matchedInvoiceId: invoice.id,
          matchedSupplierId: invoice.supplierId,
          extractionStatus: 'confirmed'
        }
      });

      await tx.supplierPayment.create({
        data: {
          tenantId: txRecord.tenantId,
          invoiceId: invoice.id,
          amount: paymentAmount,
          paidAt: txRecord.date,
          method: 'bank_transfer',
          bankTransactionId: txRecord.id,
          matchedByUserId: 'test-user-id'
        }
      });
    });
    console.log('Success!');
  } catch (e) {
    console.error('Error during transaction:', e);
  }
  await db.$disconnect();
}
run();

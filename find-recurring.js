const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const txs = await prisma.bankTransaction.findMany({
    where: { debit: { gt: 0 } },
    select: { date: true, description: true, debit: true }
  });
  
  const getMerchant = (desc) => {
    return desc
      .replace(/Plata la POS non-BT cu card VISA/i, '')
      .replace(/Plata la POS/i, '')
      .replace(/Plata OP intra - canal electronic/i, '')
      .replace(/Comision/i, 'Comision')
      .replace(/[0-9]{10,}/g, '')
      .trim()
      .split(' ')
      .slice(0, 2)
      .join(' ')
      .toUpperCase();
  };

  const groups = {};
  txs.forEach(t => {
    const m = getMerchant(t.description);
    if (!groups[m]) groups[m] = [];
    groups[m].push(t);
  });

  const recurring = [];
  for (const [m, list] of Object.entries(groups)) {
    if (list.length >= 2) {
      recurring.push({ merchant: m, count: list.length, txs: list });
    }
  }

  recurring.sort((a, b) => b.count - a.count);

  console.log("=== PLĂȚI RECURENTE DETECTATE ===");
  recurring.forEach(r => {
    console.log(`\n🔹 ${r.merchant} (${r.count} plăți)`);
    r.txs.forEach(t => {
      console.log(`   - ${t.date.toISOString().split('T')[0]} | ${t.debit} RON`);
    });
  });
}
main().catch(console.error).finally(() => prisma.$disconnect());

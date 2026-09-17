const { PrismaClient } = require('@prisma/client');

async function run() {
  const db = new PrismaClient();
  const suppliers = await db.supplier.findMany({
    select: { name: true, cui: true }
  });

  const names = suppliers.map(s => `${s.name} (CUI: ${s.cui || 'N/A'})`);
  console.log("All suppliers:");
  console.log(names.join('\n'));
  
  await db.$disconnect();
}
run();

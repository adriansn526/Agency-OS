import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } })

async function main() {
  let t = await prisma.tenantInstance.findFirst();
  if (!t) {
    t = await prisma.tenantInstance.create({ data: { name: 'Agency OS', slug: 'agency-os' } });
    console.log('Created tenant');
  } else {
    console.log('Tenant exists:', t.id);
  }
  let b = await prisma.bankConnection.findFirst();
  if (!b) {
    b = await prisma.bankConnection.create({ data: { tenantId: t.id, bankName: 'Banca Transilvania', accountIban: 'RO99BTRL1111222233334444', statementPasswordEnvKey: 'BT_STATEMENT_PASSWORD' } });
    console.log('Created bank');
  } else {
    console.log('Bank exists:', b.id);
  }
}
main().then(() => prisma.$disconnect()).catch(e => { console.error(e); process.exit(1); });

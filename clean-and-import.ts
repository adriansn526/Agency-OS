import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } })
async function main() {
  console.log("Ștergem TOATE leadurile din csv_import...");
  const res = await prisma.lead.deleteMany({ where: { source: 'csv_import' } });
  console.log(`✅ Am șters ${res.count} lead-uri vechi.`);
}
main().finally(() => prisma.$disconnect());

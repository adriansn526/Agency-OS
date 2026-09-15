import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient({ datasources: { db: { url: "postgresql://agency_os:AgencyOS_2026!Secure@localhost:5434/agency_os" } } })
async function main() {
  console.log("Ștergem TOATE leadurile din csv_import...");
  const res = await prisma.lead.deleteMany({ where: { source: 'csv_import' } });
  console.log(`✅ Am șters ${res.count} lead-uri vechi.`);
}
main().finally(() => prisma.$disconnect());

import { PrismaClient } from '@prisma/client'
import { execSync } from 'child_process'
const prisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } })
async function main() {
  console.log("Stergem TOT...");
  await prisma.lead.deleteMany({ where: { source: 'csv_import' } })
  console.log("Rulam importul...");
  execSync('npx tsx packages/db/prisma/import-csv-leads.ts', { stdio: 'inherit' })
  console.log("Finished!");
}
main().finally(() => prisma.$disconnect())

import { execSync } from 'child_process'
import { PrismaClient } from '@prisma/client'
require('dotenv').config()

const prisma = new PrismaClient()

async function main() {
  console.log("Ștergem TOATE leadurile vechi...");
  const res = await prisma.lead.deleteMany({ where: { source: 'csv_import' } })
  console.log(`✅ Am șters ${res.count} lead-uri.`);
  
  console.log("Rulăm importul...");
  execSync('npx tsx ../../packages/db/prisma/import-csv-leads.ts', { stdio: 'inherit' })
  console.log("Gata!");
}
main().catch(console.error).finally(() => prisma.$disconnect())

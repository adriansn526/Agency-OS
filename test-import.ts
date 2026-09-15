import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import { parse } from 'csv-parse'
const prisma = new PrismaClient({ datasources: { db: { url: "postgresql://agency_os:AgencyOS_2026!Secure@localhost:5434/agency_os?schema=public" } } })
async function main() {
  const filePath = '/home/asns/projects/AdvancedSystems/Docs/PROSPECTARE-NEORDONAT/CRM-READY/CRM_LEADS_ALL.csv'
  const parser = fs.createReadStream(filePath).pipe(parse({ columns: true, skip_empty_lines: true }))
  let count = 0
  let skipped = 0
  for await (const record of parser) {
    const realEmail = record.Email_1 || record.Email_2 || ''
    if (!realEmail.trim()) { skipped++; continue; }
    count++;
  }
  console.log(`Found ${count} with email. Skipped ${skipped} without email.`);
}
main().finally(() => prisma.$disconnect());

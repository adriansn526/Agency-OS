import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import { parse } from 'csv-parse'

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://agency_os:AgencyOS_2026!Secure@localhost:5434/agency_os?schema=public"
    }
  }
})

async function main() {
  const agency = await prisma.businessLine.findUnique({ where: { slug: 'agency' } })
  if (!agency) throw new Error('Business line agency not found')

  const filePath = '/home/asns/projects/AdvancedSystems/Docs/PROSPECTARE-NEORDONAT/CRM-READY/CRM_LEADS_ALL.csv'
  console.log(`🚀 Starting import from ${filePath}...`)

  const parser = fs.createReadStream(filePath).pipe(
    parse({
      columns: true,
      skip_empty_lines: true,
    })
  )

  let batch: any[] = []
  let totalInserted = 0
  const BATCH_SIZE = 1000

  for await (const record of parser) {
    const realEmail = record.Email_1 || record.Email_2 || ''
    
    // Dacă nu există email real, sărim peste acest lead conform cerințelor
    if (!realEmail.trim()) {
      continue
    }

    batch.push({
      businessLineId: agency.id,
      entityType: 'clients',
      companyName: record.Denumire || 'Fără Nume',
      contactPerson: record.Persoana_Contact || 'Nespecificat',
      email: realEmail,
      phone: record.Telefon_1 || record.Telefon_2 || null,
      status: 'prospect',
      source: 'csv_import',
      notes: record.Adresa ? `Adresa: ${record.Adresa}` : null,
      customFields: {
        cui: record.CUI,
        county: record.Judet,
        city: record.Oras,
        address: record.Adresa,
        phone1: record.Telefon_1,
        phone2: record.Telefon_2,
        phone3: record.Telefon_3,
        email1: record.Email_1,
        email2: record.Email_2,
        website: record.Website,
        contactRole: record.Functie_Contact,
        caenCode: record.Cod_CAEN,
        caenDescription: record.Descriere_CAEN,
        industry: record.Domeniu_Activitate,
        services: record.Servicii,
        revenue: record.Cifra_Afaceri,
        employeesCount: record.Nr_Angajati,
        companyStatus: record.Stare_Firma,
        foundingYear: record.An_Infiintare,
        dataSource: record.Sursa
      }
    })

    if (batch.length >= BATCH_SIZE) {
      await prisma.lead.createMany({ data: batch, skipDuplicates: true })
      totalInserted += batch.length
      console.log(`✅ Inserted ${totalInserted} leads so far...`)
      batch = []
    }
  }

  // Insert remaining
  if (batch.length > 0) {
    await prisma.lead.createMany({ data: batch, skipDuplicates: true })
    totalInserted += batch.length
  }

  console.log(`🎉 Import complete! Total leads inserted: ${totalInserted}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())

#!/usr/bin/env node
/**
 * Import Leads from CRM-READY CSV files
 * Only imports rows with at least one contact (phone or email)
 * Deduplicates on CUI, tags industry from filename
 */

const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

const db = new PrismaClient()

const CSV_DIR = '/home/asns/projects/AdvancedSystems/Docs/PROSPECTARE-NEORDONAT/CRM-READY'

const FILES = [
  { file: 'CRM_LEADS_AGRICULTURA.csv', industry: 'agricultura' },
  { file: 'CRM_LEADS_FONDURI.csv', industry: 'fonduri' },
  { file: 'CRM_LEADS_MEDICAL.csv', industry: 'medical' },
  { file: 'CRM_LEADS_CONSTRUCTII.csv', industry: 'constructii' },
  { file: 'CRM_LEADS_COMERT.csv', industry: 'comert' },
  { file: 'CRM_LEADS_ALTELE.csv', industry: 'altele' },
]

const BATCH_SIZE = 500

// Simple CSV parser that handles quoted fields
function parseCSVLine(line) {
  const fields = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      fields.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  fields.push(current.trim())
  return fields
}

function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8')
  // Remove BOM
  const clean = content.replace(/^\uFEFF/, '')
  const lines = clean.split('\n').filter(l => l.trim())
  if (lines.length < 2) return []

  const headers = parseCSVLine(lines[0])
  const rows = []
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    const row = {}
    headers.forEach((h, idx) => {
      row[h] = values[idx] || ''
    })
    rows.push(row)
  }
  return rows
}

function parseContactPerson(raw) {
  if (!raw) return { name: '', role: '' }
  // Format: "Popa Ioan,, Administrator" or "Popa Ioan, Administrator"
  const parts = raw.split(',').map(p => p.trim()).filter(Boolean)
  if (parts.length >= 2) {
    return { name: parts[0], role: parts[parts.length - 1] }
  }
  return { name: raw.trim(), role: '' }
}

function parseNumber(str) {
  if (!str) return null
  // "650.697.014" → 650697014
  const cleaned = str.replace(/\./g, '').replace(/,/g, '.').trim()
  const num = parseFloat(cleaned)
  return isNaN(num) ? null : num
}

function parseInt2(str) {
  if (!str) return null
  const cleaned = str.replace(/\./g, '').trim()
  const num = parseInt(cleaned)
  return isNaN(num) ? null : num
}

function hasContact(row) {
  return !!(
    (row.Telefon_1 && row.Telefon_1.trim()) ||
    (row.Email_1 && row.Email_1.trim())
  )
}

async function main() {
  // Get Agency business line ID
  const agencyBL = await db.businessLine.findFirst({ where: { slug: 'agency' } })
  if (!agencyBL) {
    console.error('❌ Business Line "agency" not found!')
    process.exit(1)
  }
  console.log(`✅ Business Line: ${agencyBL.name} (${agencyBL.id})`)

  const seenCUIs = new Set()
  const seenNames = new Set()
  let totalImported = 0
  let totalSkipped = 0
  let totalDuplicates = 0
  let totalNoContact = 0

  for (const { file, industry } of FILES) {
    const filePath = path.join(CSV_DIR, file)
    console.log(`\n📄 Processing: ${file} (${industry})`)
    
    const rows = parseCSV(filePath)
    console.log(`   Rânduri totale: ${rows.length}`)

    const batch = []
    let fileImported = 0
    let fileSkipped = 0

    for (const row of rows) {
      // Skip without contact
      if (!hasContact(row)) {
        totalNoContact++
        continue
      }

      // Deduplicate on CUI or companyName
      const cui = (row.CUI || '').trim()
      const name = (row.Denumire || '').trim()
      
      if (cui) {
        if (seenCUIs.has(cui)) {
          totalDuplicates++
          continue
        }
        seenCUIs.add(cui)
      } else if (name) {
        if (seenNames.has(name.toLowerCase())) {
          totalDuplicates++
          continue
        }
        seenNames.add(name.toLowerCase())
      } else {
        fileSkipped++
        continue
      }

      const { name: contactName, role: contactRole } = parseContactPerson(row.Persoana_Contact)

      batch.push({
        businessLineId: agencyBL.id,
        entityType: 'prospects',
        companyName: name || 'N/A',
        contactPerson: contactName || 'N/A',
        email: (row.Email_1 || '').trim() || 'N/A',
        phone: (row.Telefon_1 || '').trim() || null,
        status: 'cold',
        source: (row.Sursa || '').trim().substring(0, 200) || 'csv_import',
        cui: cui || null,
        website: (row.Website || '').trim() || null,
        county: (row.Judet || '').trim() || null,
        city: (row.Oras || '').trim() || null,
        address: (row.Adresa || '').trim() || null,
        industry,
        caenCode: (row.Cod_CAEN || '').trim() || null,
        caenDescription: (row.Descriere_CAEN || '').trim() || null,
        revenue: parseNumber(row.Cifra_Afaceri),
        employees: parseInt2(row.Nr_Angajati),
        companyStatus: (row.Stare_Firma || '').trim() || null,
        foundedYear: parseInt2(row.An_Infiintare),
        contactRole: contactRole || null,
        phone2: (row.Telefon_2 || '').trim() || null,
        phone3: (row.Telefon_3 || '').trim() || null,
        email2: (row.Email_2 || '').trim() || null,
        externalId: cui || `name-${name.toLowerCase().replace(/\s+/g, '-').substring(0, 50)}`,
        externalSource: 'csv_import',
      })

      if (batch.length >= BATCH_SIZE) {
        try {
          const result = await db.lead.createMany({
            data: batch,
            skipDuplicates: true,
          })
          fileImported += result.count
        } catch (err) {
          console.error(`   ⚠ Batch error: ${err.message}`)
          fileSkipped += batch.length
        }
        batch.length = 0
        process.stdout.write(`   ${fileImported} imported...\r`)
      }
    }

    // Flush remaining
    if (batch.length > 0) {
      try {
        const result = await db.lead.createMany({
          data: batch,
          skipDuplicates: true,
        })
        fileImported += result.count
      } catch (err) {
        console.error(`   ⚠ Final batch error: ${err.message}`)
        fileSkipped += batch.length
      }
    }

    console.log(`   ✅ Imported: ${fileImported}, Skipped: ${fileSkipped}`)
    totalImported += fileImported
    totalSkipped += fileSkipped
  }

  console.log('\n' + '═'.repeat(50))
  console.log(`📊 IMPORT COMPLETE`)
  console.log(`   Total imported:   ${totalImported.toLocaleString()}`)
  console.log(`   Total duplicates: ${totalDuplicates.toLocaleString()}`)
  console.log(`   Total no contact: ${totalNoContact.toLocaleString()}`)
  console.log(`   Total skipped:    ${totalSkipped.toLocaleString()}`)
  console.log('═'.repeat(50))

  await db.$disconnect()
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})

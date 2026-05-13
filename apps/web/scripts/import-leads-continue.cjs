#!/usr/bin/env node
/**
 * Continue importing remaining CSV files (medical rest, constructii, comert, altele)
 * Skips existing CUIs already in DB
 */
const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

const db = new PrismaClient()
const CSV_DIR = '/home/asns/projects/AdvancedSystems/Docs/PROSPECTARE-NEORDONAT/CRM-READY'
const BATCH = 500

function parseCSVLine(line) {
  const fields = []
  let cur = ''
  let inQ = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQ = !inQ
    } else if (ch === ',' && !inQ) {
      fields.push(cur.trim())
      cur = ''
    } else {
      cur += ch
    }
  }
  fields.push(cur.trim())
  return fields
}

function parseCSV(fp) {
  const c = fs.readFileSync(fp, 'utf-8').replace(/^\uFEFF/, '')
  const lines = c.split('\n').filter(l => l.trim())
  const hdr = parseCSVLine(lines[0])
  return lines.slice(1).map(l => {
    const v = parseCSVLine(l)
    const r = {}
    hdr.forEach((h, i) => { r[h] = v[i] || '' })
    return r
  })
}

function parsePerson(raw) {
  if (!raw) return { name: '', role: '' }
  const parts = raw.split(',').map(p => p.trim()).filter(Boolean)
  if (parts.length >= 2) return { name: parts[0], role: parts[parts.length - 1] }
  return { name: raw.trim(), role: '' }
}

function parseNum(s) {
  if (!s) return null
  const n = parseFloat(s.replace(/\./g, '').replace(',', '.'))
  return isNaN(n) ? null : n
}

function parseInt2(s) {
  if (!s) return null
  const n = parseInt(s.replace(/\./g, ''))
  return isNaN(n) ? null : n
}

async function main() {
  const bl = await db.businessLine.findFirst({ where: { slug: 'agency' } })
  if (!bl) { console.error('No agency BL'); process.exit(1) }

  // Load existing CUIs/externalIds to skip
  const existing = await db.lead.findMany({
    where: { externalSource: 'csv_import' },
    select: { cui: true, externalId: true },
  })
  const seenCUIs = new Set(existing.filter(e => e.cui).map(e => e.cui))
  const seenExt = new Set(existing.filter(e => e.externalId).map(e => e.externalId))
  console.log(`Existing in DB: ${existing.length} | CUIs tracked: ${seenCUIs.size}`)

  const FILES = [
    { file: 'CRM_LEADS_MEDICAL.csv', industry: 'medical' },
    { file: 'CRM_LEADS_CONSTRUCTII.csv', industry: 'constructii' },
    { file: 'CRM_LEADS_COMERT.csv', industry: 'comert' },
    { file: 'CRM_LEADS_ALTELE.csv', industry: 'altele' },
  ]

  let totalImp = 0
  let totalDup = 0

  for (const { file, industry } of FILES) {
    console.log(`\n📄 ${file}`)
    const rows = parseCSV(path.join(CSV_DIR, file))
    console.log(`   Total rows: ${rows.length}`)

    let batch = []
    let imp = 0

    for (const row of rows) {
      const t1 = (row.Telefon_1 || '').trim()
      const e1 = (row.Email_1 || '').trim()
      if (!t1 && !e1) continue

      const cui = (row.CUI || '').trim()
      const name = (row.Denumire || '').trim()
      const extId = cui || ('name-' + name.toLowerCase().replace(/\s+/g, '-').substring(0, 50))

      if (cui && seenCUIs.has(cui)) { totalDup++; continue }
      if (seenExt.has(extId)) { totalDup++; continue }
      if (cui) seenCUIs.add(cui)
      seenExt.add(extId)

      const { name: cn, role: cr } = parsePerson(row.Persoana_Contact)

      batch.push({
        businessLineId: bl.id,
        entityType: 'prospects',
        companyName: name || 'N/A',
        contactPerson: cn || 'N/A',
        email: e1 || 'N/A',
        phone: t1 || null,
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
        revenue: parseNum(row.Cifra_Afaceri),
        employees: parseInt2(row.Nr_Angajati),
        companyStatus: (row.Stare_Firma || '').trim() || null,
        foundedYear: parseInt2(row.An_Infiintare),
        contactRole: cr || null,
        phone2: (row.Telefon_2 || '').trim() || null,
        phone3: (row.Telefon_3 || '').trim() || null,
        email2: (row.Email_2 || '').trim() || null,
        externalId: extId,
        externalSource: 'csv_import',
      })

      if (batch.length >= BATCH) {
        try {
          const r = await db.lead.createMany({ data: batch, skipDuplicates: true })
          imp += r.count
        } catch (err) {
          console.error(`   ⚠ Batch error: ${err.message.substring(0, 100)}`)
        }
        batch = []
        if (imp % 5000 < BATCH) console.log(`   ${imp} imported...`)
      }
    }

    if (batch.length) {
      try {
        const r = await db.lead.createMany({ data: batch, skipDuplicates: true })
        imp += r.count
      } catch (err) {
        console.error(`   ⚠ Final batch error: ${err.message.substring(0, 100)}`)
      }
    }

    console.log(`   ✅ ${imp} imported`)
    totalImp += imp
  }

  const finalCount = await db.lead.count({ where: { externalSource: 'csv_import' } })
  console.log('\n' + '═'.repeat(50))
  console.log(`📊 IMPORT COMPLETE`)
  console.log(`   New imported:     ${totalImp.toLocaleString()}`)
  console.log(`   Duplicates skip:  ${totalDup.toLocaleString()}`)
  console.log(`   Total in DB:      ${finalCount.toLocaleString()}`)
  console.log('═'.repeat(50))

  await db.$disconnect()
}

main().catch(err => { console.error('Fatal:', err); process.exit(1) })

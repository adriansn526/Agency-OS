/**
 * Import CRM_LEADS_ALTELE.csv
 * - Matches existing leads by CUI (upsert)
 * - Adds new fields: activityDomain, services, address, city
 * - Creates new leads for CUI not found
 * - Only imports rows with at least one contact (phone or email)
 */

const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

const db = new PrismaClient()

const CSV_PATH = path.resolve(__dirname, '../../Docs/PROSPECTARE-NEORDONAT/CRM-READY/CRM_LEADS_ALTELE.csv')
const BUSINESS_LINE_SLUG = 'agency'
const BATCH_SIZE = 500

function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8').replace(/^\uFEFF/, '') // strip BOM
  const lines = content.split('\n')
  const headers = parseCSVLine(lines[0])
  const rows = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const values = parseCSVLine(line)
    const row = {}
    headers.forEach((h, idx) => { row[h.trim()] = (values[idx] || '').trim() })
    rows.push(row)
  }
  return rows
}

function parseCSVLine(line) {
  const result = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; continue }
      inQuotes = !inQuotes; continue
    }
    if (ch === ',' && !inQuotes) { result.push(current); current = ''; continue }
    current += ch
  }
  result.push(current)
  return result
}

function cleanPhone(p) {
  if (!p) return null
  const cleaned = p.replace(/[^0-9+]/g, '')
  if (cleaned.length < 7) return null
  return cleaned
}

function cleanRevenue(v) {
  if (!v) return null
  const cleaned = v.replace(/[^0-9.,-]/g, '').replace(/\./g, '').replace(',', '.')
  const num = parseFloat(cleaned)
  return isNaN(num) ? null : num
}

async function main() {
  console.log('📂 Reading CSV:', CSV_PATH)
  const rows = parseCSV(CSV_PATH)
  console.log(`📊 Total rows: ${rows.length}`)

  // Get business line
  const bl = await db.businessLine.findUnique({ where: { slug: BUSINESS_LINE_SLUG } })
  if (!bl) { console.error('❌ Business line not found:', BUSINESS_LINE_SLUG); process.exit(1) }
  console.log(`🏢 Business Line: ${bl.name} (${bl.id})`)

  // Filter rows with at least one contact
  const contactRows = rows.filter(r => {
    const phone1 = cleanPhone(r.Telefon_1)
    const email1 = (r.Email_1 || '').trim()
    return phone1 || email1
  })
  console.log(`📞 Rows with contact: ${contactRows.length}`)

  // Get all existing CUIs for matching
  const existingLeads = await db.lead.findMany({
    where: { cui: { not: null } },
    select: { id: true, cui: true },
  })
  const cuiMap = new Map()
  existingLeads.forEach(l => { if (l.cui) cuiMap.set(l.cui, l.id) })
  console.log(`🔍 Existing leads with CUI: ${cuiMap.size}`)

  let updated = 0, created = 0, skipped = 0, errors = 0

  for (let i = 0; i < contactRows.length; i += BATCH_SIZE) {
    const batch = contactRows.slice(i, i + BATCH_SIZE)
    const ops = []

    for (const row of batch) {
      try {
        const cui = (row.CUI || '').trim()
        const phone1 = cleanPhone(row.Telefon_1)
        const email1 = (row.Email_1 || '').trim()
        const companyName = (row.Denumire || '').trim()
        if (!companyName) { skipped++; continue }

        const data = {
          companyName,
          contactPerson: (row.Persoana_Contact || '').trim() || 'N/A',
          email: email1 || 'N/A',
          phone: phone1,
          phone2: cleanPhone(row.Telefon_2),
          phone3: cleanPhone(row.Telefon_3),
          email2: (row.Email_2 || '').trim() || null,
          website: (row.Website || '').trim() || null,
          contactRole: (row.Functie_Contact || '').trim() || null,
          cui: cui || null,
          county: (row.Judet || '').trim() || null,
          city: (row.Oras || '').trim() || null,
          address: (row.Adresa || '').trim() || null,
          caenCode: (row.Cod_CAEN || '').trim() || null,
          caenDescription: (row.Descriere_CAEN || '').trim() || null,
          activityDomain: (row.Domeniu_Activitate || '').trim() || null,
          services: (row.Servicii || '').trim() || null,
          revenue: cleanRevenue(row.Cifra_Afaceri),
          employees: parseInt(row.Nr_Angajati) || null,
          companyStatus: (row.Stare_Firma || '').trim() || null,
          foundedYear: parseInt(row.An_Infiintare) || null,
          industry: 'altele',
          source: (row.Sursa || '').trim() || null,
        }

        if (cui && cuiMap.has(cui)) {
          // UPDATE existing — only update new fields (don't overwrite existing data)
          const existingId = cuiMap.get(cui)
          ops.push(
            db.lead.update({
              where: { id: existingId },
              data: {
                // Only set fields that add new info
                activityDomain: data.activityDomain,
                services: data.services,
                address: data.address || undefined,
                city: data.city || undefined,
                // Update phone/email only if we have better data
                ...(data.phone2 ? { phone2: data.phone2 } : {}),
                ...(data.phone3 ? { phone3: data.phone3 } : {}),
                ...(data.email2 ? { email2: data.email2 } : {}),
                ...(data.website ? { website: data.website } : {}),
                ...(data.contactRole ? { contactRole: data.contactRole } : {}),
                ...(data.source ? { source: data.source } : {}),
              },
            })
          )
          updated++
        } else {
          // CREATE new lead
          ops.push(
            db.lead.create({
              data: {
                businessLineId: bl.id,
                entityType: 'prospects',
                status: 'cold',
                ...data,
              },
            })
          )
          created++
          if (cui) cuiMap.set(cui, 'pending') // prevent duplicates within batch
        }
      } catch (e) {
        errors++
      }
    }

    // Execute batch
    if (ops.length > 0) {
      try {
        await db.$transaction(ops)
      } catch (e) {
        // Fallback: execute one by one
        for (const op of ops) {
          try { await op } catch (err) { errors++ }
        }
      }
    }

    if ((i + BATCH_SIZE) % 5000 === 0 || i + BATCH_SIZE >= contactRows.length) {
      console.log(`  ⏳ ${Math.min(i + BATCH_SIZE, contactRows.length)}/${contactRows.length} — ${created} created, ${updated} updated, ${errors} errors`)
    }
  }

  // Final count
  const totalLeads = await db.lead.count()
  console.log('\n✅ Import Complete!')
  console.log(`  📌 Created: ${created}`)
  console.log(`  🔄 Updated: ${updated}`)
  console.log(`  ⏭️  Skipped: ${skipped}`)
  console.log(`  ❌ Errors: ${errors}`)
  console.log(`  📊 Total leads in DB: ${totalLeads}`)

  await db.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })

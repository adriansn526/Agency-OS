const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const db = new PrismaClient();
const CSV_PATH = '/home/asns/projects/AdvancedSystems/Docs/PROSPECTARE-NEORDONAT/CRM-READY/CRM_LEADS_CLIMATIZARE.csv';
const CLIMATICPRO_BL_ID = 'cmnt9v12a0002cuq3yz2ks8r7';

function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8').replace(/^\uFEFF/, '');
  const lines = content.split('\n');
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Handle quoted fields with commas
    const values = [];
    let current = '';
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') { inQuotes = !inQuotes; continue; }
      if (char === ',' && !inQuotes) { values.push(current.trim()); current = ''; continue; }
      current += char;
    }
    values.push(current.trim());

    const row = {};
    headers.forEach((h, idx) => { row[h] = values[idx] || ''; });
    rows.push(row);
  }
  return rows;
}

function clean(val) {
  if (!val || val === '-' || val === 'N/A' || val === '0' || val === '') return null;
  return val.trim();
}

(async () => {
  const rows = parseCSV(CSV_PATH);
  console.log(`CSV rows: ${rows.length}`);

  // Get all existing CUIs in DB
  const existingLeads = await db.$queryRawUnsafe(`
    SELECT id, cui FROM "Lead" WHERE cui IS NOT NULL
  `);
  const cuiMap = {};
  existingLeads.forEach(l => { cuiMap[String(l.cui)] = l.id; });
  console.log(`Existing leads with CUI: ${existingLeads.length}`);

  let inserted = 0, updated = 0, skipped = 0;

  for (const row of rows) {
    const cui = clean(row.CUI);
    if (!cui) { skipped++; continue; }

    const data = {
      county: clean(row.Judet),
      city: clean(row.Oras),
      address: clean(row.Adresa),
      phone: clean(row.Telefon_1) || 'N/A',
      phone2: clean(row.Telefon_2),
      phone3: clean(row.Telefon_3),
      email: clean(row.Email_1) || 'N/A',
      email2: clean(row.Email_2),
      website: clean(row.Website),
      caenCode: clean(row.Cod_CAEN),
      caenDescription: clean(row.Descriere_CAEN),
      activityDomain: clean(row.Domeniu_Activitate),
      services: clean(row.Servicii),
      companyStatus: clean(row.Stare_Firma),
      foundedYear: row.An_Infiintare && parseInt(row.An_Infiintare) > 1900 ? parseInt(row.An_Infiintare) : null,
    };

    // Parse contactPerson + contactRole
    const rawContact = clean(row.Persoana_Contact);
    if (rawContact) {
      // Format: "Marcu Tudor Florin,, Director General" or "Popa Ion (Administrator)"
      const parts = rawContact.split(',').map(p => p.trim()).filter(Boolean);
      data.contactPerson = parts[0] || null;
    }
    const rawRole = clean(row.Functie_Contact);
    if (rawRole) data.contactRole = rawRole;

    // Revenue & employees
    const rev = parseFloat(row.Cifra_Afaceri);
    if (rev && rev > 0) data.revenue = rev;
    const emp = parseInt(row.Nr_Angajati);
    if (emp && emp > 0) data.employees = emp;

    const existingId = cuiMap[cui];

    if (existingId) {
      // UPDATE: only fill in missing fields, don't overwrite existing data
      const updateData = {};
      // We'll fetch current record to only update nulls
      const current = await db.lead.findUnique({ where: { id: existingId } });
      if (!current) { skipped++; continue; }

      // Update fields only if current is null and new has data
      if (!current.county && data.county) updateData.county = data.county;
      if (!current.city && data.city) updateData.city = data.city;
      if (!current.address && data.address) updateData.address = data.address;
      if ((!current.phone || current.phone === 'N/A') && data.phone && data.phone !== 'N/A') updateData.phone = data.phone;
      if (!current.phone2 && data.phone2) updateData.phone2 = data.phone2;
      if (!current.phone3 && data.phone3) updateData.phone3 = data.phone3;
      if ((!current.email || current.email === 'N/A') && data.email && data.email !== 'N/A') updateData.email = data.email;
      if (!current.email2 && data.email2) updateData.email2 = data.email2;
      if (!current.website && data.website) updateData.website = data.website;
      if (!current.caenDescription && data.caenDescription) updateData.caenDescription = data.caenDescription;
      if (!current.activityDomain && data.activityDomain) updateData.activityDomain = data.activityDomain;
      if (!current.services && data.services) updateData.services = data.services;
      if (!current.companyStatus && data.companyStatus) updateData.companyStatus = data.companyStatus;
      if (!current.foundedYear && data.foundedYear) updateData.foundedYear = data.foundedYear;
      if (!current.contactRole && data.contactRole) updateData.contactRole = data.contactRole;
      if (!current.revenue && data.revenue) updateData.revenue = data.revenue;
      if (!current.employees && data.employees) updateData.employees = data.employees;

      if (Object.keys(updateData).length > 0) {
        await db.lead.update({ where: { id: existingId }, data: updateData });
        updated++;
      } else {
        skipped++;
      }
    } else {
      // INSERT new lead into ClimaticPRO
      await db.lead.create({
        data: {
          businessLineId: CLIMATICPRO_BL_ID,
          entityType: 'prospects',
          companyName: row.Denumire || 'Unknown',
          contactPerson: data.contactPerson || row.Denumire || 'N/A',
          email: data.email || 'N/A',
          phone: data.phone,
          status: 'cold',
          source: 'csv_import',
          industry: 'climatizare',
          cui: cui,
          ...data,
        },
      });
      inserted++;
    }

    if ((inserted + updated + skipped) % 200 === 0) {
      console.log(`  Progress: ${inserted} new, ${updated} updated, ${skipped} skipped`);
    }
  }

  // Final stats
  const cpCount = await db.lead.count({ where: { businessLineId: CLIMATICPRO_BL_ID } });
  console.log(`\n✅ Done!`);
  console.log(`  Inserted: ${inserted}`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  ClimaticPRO total leads: ${cpCount}`);

  await db.$disconnect();
})();

const { PrismaClient } = require('@prisma/client');
const xlsx = require('xlsx');

const db = new PrismaClient();
const FILE_PATH = '/home/asns/projects/AdvancedSystems/agency-os/docs/prospectare/Climatizare-PFA.xlsx';
const CLIMATICPRO_BL_ID = 'cmu1fxmtj0002mba4yneuxu4i'; // Fixed ID

function clean(val) {
  if (val === undefined || val === null || val === '-' || val === 'N/A' || val === '0' || val === '' || val === 'nan') return null;
  if (typeof val === 'string') return val.trim();
  return val;
}

(async () => {
  console.log(`Reading Excel file: ${FILE_PATH}`);
  const workbook = xlsx.readFile(FILE_PATH);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(worksheet);
  
  console.log(`Found ${rows.length} rows.`);

  // Get all existing CUIs in DB
  const existingLeads = await db.$queryRawUnsafe(`
    SELECT id, cui FROM "Lead" WHERE cui IS NOT NULL
  `);
  const cuiMap = {};
  existingLeads.forEach(l => { cuiMap[String(l.cui)] = l.id; });
  console.log(`Existing leads with CUI: ${existingLeads.length}`);

  let inserted = 0, updated = 0, skipped = 0;
  const insertions = [];

  for (const row of rows) {
    const cui = clean(row['CUI']);
    if (!cui) { skipped++; continue; }

    const stringCui = String(cui);

    const data = {
      county: clean(row['Judet']),
      companyStatus: clean(row['Stare firma']),
      caenCode: clean(row['Cod CAEN']) ? String(clean(row['Cod CAEN'])) : null,
      phone: clean(row['Telefon']) ? String(clean(row['Telefon'])) : null,
      phone2: clean(row['Telefon.1']) ? String(clean(row['Telefon.1'])) : null,
      phone3: clean(row['Telefon.2']) ? String(clean(row['Telefon.2'])) : null,
      email: clean(row['Email']),
      website: clean(row['Website']),
      revenue: clean(row['Cifra de afaceri 2022']) ? parseFloat(row['Cifra de afaceri 2022']) : null,
    };
    
    if (isNaN(data.revenue)) {
        data.revenue = null;
    }

    const contact1 = clean(row['Persoane contact']);
    if (contact1 && contact1 !== 'nan') {
        const match = contact1.match(/^(.*?)\((.*?)\)$/);
        if (match) {
            data.contactPerson = clean(match[1]);
            data.contactRole = clean(match[2]);
        } else {
            data.contactPerson = contact1;
        }
    }

    const existingId = cuiMap[stringCui];

    if (existingId) {
      // UPDATE: only fill in missing fields, don't overwrite existing data
      const updateData = {};
      const current = await db.lead.findUnique({ where: { id: existingId } });
      if (!current) { skipped++; continue; }

      if (!current.county && data.county) updateData.county = data.county;
      if ((!current.phone || current.phone === 'N/A') && data.phone && data.phone !== 'N/A') updateData.phone = data.phone;
      if (!current.phone2 && data.phone2) updateData.phone2 = data.phone2;
      if (!current.phone3 && data.phone3) updateData.phone3 = data.phone3;
      if ((!current.email || current.email === 'N/A') && data.email && data.email !== 'N/A') updateData.email = data.email;
      if (!current.website && data.website) updateData.website = data.website;
      if (!current.companyStatus && data.companyStatus) updateData.companyStatus = data.companyStatus;
      if (!current.contactRole && data.contactRole) updateData.contactRole = data.contactRole;
      if (!current.revenue && data.revenue) updateData.revenue = data.revenue;
      if (!current.contactPerson && data.contactPerson) updateData.contactPerson = data.contactPerson;
      if (!current.caenCode && data.caenCode) updateData.caenCode = data.caenCode;

      if (Object.keys(updateData).length > 0) {
        await db.lead.update({ where: { id: existingId }, data: updateData });
        updated++;
      } else {
        skipped++;
      }
    } else {
      // INSERT new lead into ClimaticPRO as 'installers'
      const companyName = clean(row['Denumire']) || 'Unknown';
      
      const insertData = {
        businessLineId: CLIMATICPRO_BL_ID,
        entityType: 'installers',
        companyName: companyName,
        contactPerson: data.contactPerson || companyName || 'N/A',
        status: 'aplicat_inst',
        source: 'excel_import_pfa',
        industry: 'climatizare',
        cui: stringCui,
      };
      
      // Add all data fields, defaulting required fields if null
      for (const key in data) {
          if (data[key] !== undefined && data[key] !== null) {
              insertData[key] = data[key];
          }
      }
      
      if (!insertData.email) insertData.email = 'N/A';
      if (!insertData.phone) insertData.phone = 'N/A';
      
      insertions.push(insertData);
    }
  }
  
  if (insertions.length > 0) {
      console.log(`Inserting ${insertions.length} new leads in bulk...`);
      await db.lead.createMany({
          data: insertions,
          skipDuplicates: true
      });
      inserted = insertions.length;
  }

  // Final stats
  const cpCount = await db.lead.count({ where: { businessLineId: CLIMATICPRO_BL_ID, entityType: 'installers' } });
  console.log(`\n✅ Done!`);
  console.log(`  Inserted: ${inserted}`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  ClimaticPRO total installers: ${cpCount}`);

  await db.$disconnect();
})();

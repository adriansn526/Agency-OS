const { PrismaClient } = require('@prisma/client');
const xml2js = require('xml2js');

async function run() {
  const db = new PrismaClient();
  const invoices = await db.supplierInvoice.findMany({
    where: { xmlData: { not: null } },
    select: { id: true, xmlData: true, supplier: { select: { name: true, cui: true } } }
  });

  const foreignSuppliers = new Map();

  for (const inv of invoices) {
    if (!inv.xmlData) continue;
    try {
      const parser = new xml2js.Parser({ explicitArray: false, ignoreAttrs: true });
      const result = await parser.parseStringPromise(inv.xmlData);
      let root = result.Invoice || result.CreditNote;
      if (!root && result['Invoice']) root = result['Invoice'];

      if (root && root.AccountingSupplierParty && root.AccountingSupplierParty.Party) {
        const party = root.AccountingSupplierParty.Party;
        let country = 'RO';
        
        if (party.PostalAddress && party.PostalAddress.Country && party.PostalAddress.Country.IdentificationCode) {
          country = party.PostalAddress.Country.IdentificationCode;
        }

        if (country !== 'RO') {
          const supName = inv.supplier ? inv.supplier.name : 'Unknown';
          const supCui = inv.supplier ? inv.supplier.cui : 'Unknown';
          foreignSuppliers.set(supCui, { name: supName, cui: supCui, country: country });
        }
      }
    } catch (e) {
      // ignore parse errors
    }
  }

  console.log("Furnizori non-RO (din XML):");
  for (const sup of foreignSuppliers.values()) {
    console.log(`- ${sup.name} (CUI: ${sup.cui}, Țara: ${sup.country})`);
  }

  // Also check all suppliers in DB with weird CUIs
  const allSuppliers = await db.supplier.findMany();
  console.log("\nFurnizori cu CUI potențial străin (litere în CUI, exceptând RO):");
  for (const s of allSuppliers) {
    if (s.cui) {
      let stripped = s.cui.toUpperCase().replace(/^RO/, '');
      if (/[A-Z]/.test(stripped)) {
        if (!foreignSuppliers.has(s.cui)) {
           console.log(`- ${s.name} (CUI: ${s.cui})`);
        }
      }
    }
  }

  await db.$disconnect();
}
run();

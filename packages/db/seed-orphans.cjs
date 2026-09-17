const { PrismaClient } = require('@prisma/client');
const xml2js = require('xml2js');

async function run() {
  const db = new PrismaClient();
  const orphans = await db.supplierInvoice.findMany({
    where: { supplierId: null }
  });

  console.log(`Processing ${orphans.length} orphaned invoices...`);

  let newSuppliers = 0;
  let linkedInvoices = 0;

  for (const inv of orphans) {
    let cui = '';
    let name = inv.extractedSupplierName || 'Necunoscut';

    if (inv.xmlData) {
      try {
        const parser = new xml2js.Parser({ explicitArray: false, ignoreAttrs: true });
        const result = await parser.parseStringPromise(inv.xmlData);
        
        let root = result.Invoice || result.CreditNote;
        if (!root && result['Invoice']) root = result['Invoice'];

        if (root && root.AccountingSupplierParty && root.AccountingSupplierParty.Party) {
          const party = root.AccountingSupplierParty.Party;
          
          if (party.PartyName && party.PartyName.Name) {
            name = party.PartyName.Name;
          } else if (party.PartyLegalEntity && party.PartyLegalEntity.RegistrationName) {
            name = party.PartyLegalEntity.RegistrationName;
          }

          if (party.PartyTaxScheme && party.PartyTaxScheme.CompanyID) {
            cui = party.PartyTaxScheme.CompanyID;
          }
        }
      } catch (e) {
        console.error(`Failed to parse XML for invoice ${inv.id}`);
      }
    }

    if (!cui && inv.extractedSupplierName) {
       cui = name.substring(0, 15).toUpperCase().replace(/[^A-Z0-9]/g, '');
    }

    if (!cui) cui = 'UNKNOWN-' + Math.random().toString(36).substring(7);

    let supplier = await db.supplier.findFirst({
      where: { cui: cui, tenantId: inv.tenantId }
    });

    if (!supplier) {
      supplier = await db.supplier.create({
        data: {
          tenantId: inv.tenantId,
          name: name,
          cui: cui
        }
      });
      newSuppliers++;
      console.log(`Created supplier: ${name} (${cui})`);
    }

    await db.supplierInvoice.update({
      where: { id: inv.id },
      data: { supplierId: supplier.id }
    });
    linkedInvoices++;
  }

  console.log(`Done! Created ${newSuppliers} suppliers, linked ${linkedInvoices} invoices.`);
  await db.$disconnect();
}
run();

import { db } from '@repo/db';

async function main() {
  const tenant = await db.tenantInstance.findFirst();
  if (!tenant) {
    console.error("No tenant found!");
    return;
  }

  const suppliers = [
    { name: 'Bolt Services RO S.R.L.', category: 'Transport', defaultExpensePct: 50, defaultVatPct: 50 },
    { name: 'Banca Transilvania', category: 'Servicii Bancare', defaultExpensePct: 100, defaultVatPct: 100 },
    { name: 'Claus Web SRL', category: 'IT & Software', defaultExpensePct: 100, defaultVatPct: 100 },
    { name: 'MOL Romania', category: 'Combustibil', defaultExpensePct: 50, defaultVatPct: 50 },
    { name: 'OpenAI', category: 'Software / AI', defaultExpensePct: 100, defaultVatPct: 100 },
    { name: 'DigitalOcean', category: 'Hosting / Cloud', defaultExpensePct: 100, defaultVatPct: 100 },
    { name: 'Twilio', category: 'Telecomunicații', defaultExpensePct: 100, defaultVatPct: 100 },
    { name: 'Google Workspace', category: 'Software', defaultExpensePct: 100, defaultVatPct: 100 },
    { name: 'Google Ads', category: 'Marketing', defaultExpensePct: 100, defaultVatPct: 100 }
  ];

  console.log(`Seeding suppliers for tenant: ${tenant.id}`);

  let added = 0;
  for (const s of suppliers) {
    try {
      await db.supplier.upsert({
        where: {
          tenantId_name: {
            tenantId: tenant.id,
            name: s.name
          }
        },
        update: {},
        create: {
          tenantId: tenant.id,
          name: s.name,
          category: s.category,
          defaultExpensePct: s.defaultExpensePct,
          defaultVatPct: s.defaultVatPct
        }
      });
      console.log(`✅ Upserted supplier: ${s.name}`);
      added++;
    } catch (e: any) {
      console.error(`❌ Error upserting ${s.name}: ${e.message}`);
    }
  }

  console.log(`Done! Upserted ${added} suppliers.`);
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));

import { db } from '@repo/db'

async function main() {
  const leads = await db.lead.findMany({
    where: {
      OR: [
        { city: null },
        { value: null }
      ]
    }
  });

  console.log(`Found ${leads.length} leads without city or value.`);

  let updated = 0;

  for (const lead of leads) {
    let changed = false;
    let newCity = lead.city;
    let newValue = lead.value;

    if (lead.customFields && typeof lead.customFields === 'object') {
      const custom = lead.customFields as any;
      const raw = custom.rawFormData || {};
      const extra = raw.extra || {};
      
      if (!lead.city) {
        const cityStr = String(raw.city || raw.oras || raw.localitate || extra.city || extra.oras || extra.localitate || '').trim().substring(0, 500);
        if (cityStr && cityStr !== 'undefined' && cityStr !== 'null') {
          newCity = cityStr;
          changed = true;
        }
      }

      if (lead.value === null) {
        const rawValue = raw.pret_estimativ || raw.value || raw.pret || raw.estimat || extra.pret_estimativ || extra.value || extra.pret || extra.estimat || null;
        if (rawValue !== null && rawValue !== undefined && rawValue !== '') {
          const parsed = parseFloat(String(rawValue).replace(/[^0-9.]/g, ''));
          if (!isNaN(parsed)) {
            newValue = parsed;
            changed = true;
          }
        }
      }
    }

    if (changed) {
      await db.lead.update({
        where: { id: lead.id },
        data: {
          city: newCity,
          value: newValue
        }
      });
      updated++;
    }
  }

  console.log(`Updated ${updated} leads.`);
}

main().catch(console.error).finally(() => db.$disconnect());

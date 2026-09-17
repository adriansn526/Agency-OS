const { PrismaClient } = require('@prisma/client');
async function run() {
  const db = new PrismaClient();
  const foreignNames = [
    'OpenAI', 'DigitalOcean', 'Twilio', 'Google Workspace', 'Google Ads', 
    'Scribd.com', 'Canva', 'EUROELECTRONICS.EU SP. Z.O.O. SP. K'
  ];

  const suppliers = await db.supplier.findMany({
    where: { name: { in: foreignNames } },
    include: { invoices: { select: { xmlData: true } } } // wait, do we have extractedText?
  });

  for (const sup of suppliers) {
    let vatNumber = null;
    let country = 'US'; // default to US unless EU
    let vatRegime = 'extracommunity';

    if (sup.name.includes('Google') || sup.name === 'Twilio' || sup.name === 'EUROELECTRONICS.EU SP. Z.O.O. SP. K') {
       country = sup.name === 'EUROELECTRONICS.EU SP. Z.O.O. SP. K' ? 'PL' : 'IE';
       vatRegime = 'intracommunity';
    }

    // Attempt to extract vatNumber from invoice texts
    for (const inv of sup.invoices) {
      if (inv.xmlData && inv.xmlData.includes('CompanyID')) {
         // simple regex to extract CompanyID
         const match = inv.xmlData.match(/<cbc:CompanyID>(.*?)<\/cbc:CompanyID>/);
         if (match) {
            vatNumber = match[1];
            break;
         }
      }
    }

    const emails = [];
    if (sup.name.toLowerCase().includes('twilio')) emails.push('no-reply@twilio.com');
    if (sup.name.toLowerCase().includes('google')) emails.push('billing-noreply@google.com');
    if (sup.name.toLowerCase().includes('canva')) emails.push('invoices@canva.com');
    if (sup.name.toLowerCase().includes('scribd')) emails.push('support@scribd.com');
    if (sup.name.toLowerCase().includes('openai')) emails.push('billing@openai.com');
    if (sup.name.toLowerCase().includes('digitalocean')) emails.push('billing@digitalocean.com');

    await db.supplier.update({
      where: { id: sup.id },
      data: {
        vatNumber: vatNumber,
        country: country,
        vatRegime: vatRegime,
        invoiceFetchMethod: 'email_parsing',
        invoiceSenderEmails: emails
      }
    });

    console.log(`Updated ${sup.name}: VAT ${vatNumber || 'MISSING'}, Country ${country}, Emails: ${emails.join(',')}`);
  }

  await db.$disconnect();
}
run();

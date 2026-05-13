const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function run() {
  const fudly = await db.businessLine.findUnique({ where: { slug: 'fudly' } });
  if (!fudly) { console.log('No fudly BL'); return; }

  const templates = [
    {
      name: '🆕 Cold Outreach — SMS',
      channel: 'sms',
      body: 'Buna ziua! V-am contactat pt o propunere de digitalizare pt {{companyName}}. Site propriu + comenzi online cu livrare integrata. Fara comisioane. Detalii: {{link}}',
      variables: ['companyName', 'link'],
    },
    {
      name: '🔥 Pain Point Comisioane — SMS',
      channel: 'sms',
      body: '{{companyName}} — Stiai ca pe platformele de livrare comisionul poate ajunge la 30%? Cu Fudly comenzile sunt 100% ale tale. De la 59€/luna. Oferta pt 50 afaceri: {{link}}',
      variables: ['companyName', 'link'],
    },
    {
      name: '📊 Pain Point Date Clienti — SMS',
      channel: 'sms',
      body: '{{companyName}} — Cand vinzi pe Bolt Food nu stii cine sunt clientii tai. Cu Fudly ai baza proprie de clienti + SMS de reactivare automat. Propunere: {{link}}',
      variables: ['companyName', 'link'],
    },
    {
      name: '🆕 Cold Outreach — Email',
      channel: 'email',
      subject: 'Propunere digitalizare pentru {{companyName}}',
      body: `Bună ziua,

V-am contactat deoarece credem că putem aduce valoare afacerii dvs. printr-o soluție completă de comenzi online cu livrare integrată.

Ce oferim:
• Site propriu cu comenzi online (clienții sunt ai dvs., nu ai platformei)
• Livrare prin Glovo On Demand sau aplicație dedicată pentru livratorii proprii
• Marketing automat: postări AI pe Facebook/Instagram, SMS remindere pt clienții inactivi
• Fără comisioane din vânzări — preț fix de la 59€/lună
• Ofertă de lansare: acces complet fără abonament la 500€+TVA (în loc de 850€) — disponibil doar pentru primele 50 de afaceri din România

Am pregătit o propunere personalizată aici:
{{link}}

Cu stimă,
Echipa Fudly`,
      variables: ['companyName', 'link'],
    },
  ];

  for (const t of templates) {
    const created = await db.marketingTemplate.create({
      data: {
        businessLineId: fudly.id,
        name: t.name,
        channel: t.channel,
        subject: t.subject || null,
        body: t.body,
        variables: t.variables,
      }
    });
    console.log('Created:', created.channel, '|', created.name);
  }

  await db.$disconnect();
}

run().catch(e => { console.error('Error:', e.message); process.exit(1); });

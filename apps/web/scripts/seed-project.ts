import { db } from "@repo/db"

async function main() {
  await db.project.create({
    data: {
      clientId: 'cmnzjv0g60001cunm6ajzgmb9',
      name: 'Platformă Web - Închideri Terase',
      status: 'finalizat',
      notes: 'Proiect preluat din raport_client_inchideri_terase.md',
      metadata: {
        checklist: [
          { item: 'Dezvoltare arhitectură performantă pe framework Next.js', done: true },
          { item: 'Implementare UI/UX Premium cu Showcase-uri vizuale', done: true },
          { item: 'Dezvoltare Calculatoare Dinamice de Ofertă', done: true },
          { item: 'Integrare selector vizual de texturi și materiale', done: true },
          { item: 'Flux integrat de calificare lead-uri', done: true },
          { item: 'Suport multilingv (i18n)', done: true },
          { item: 'Configurare tracking (Analytics) și GDPR', done: true }
        ]
      }
    }
  });
  console.log('Project created successfully!');
}

main().catch(console.error).finally(() => process.exit(0));

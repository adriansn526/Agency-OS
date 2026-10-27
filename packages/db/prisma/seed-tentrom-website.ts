import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('\n🏗️  Seeding Tentrom Paradise SRL în IntraConstruct (Colecția Companii)...\n')

  // 1. Verificăm linia de business 'intraconstruct'
  const intraconstruct = await prisma.businessLine.findUnique({
    where: { slug: 'intraconstruct' },
  })
  if (!intraconstruct) {
    throw new Error('Linia de business "intraconstruct" nu a fost găsită!')
  }
  console.log(`✅ Linia de business găsită: ${intraconstruct.name} (${intraconstruct.id})`)

  // 2. Găsim colecția 'companii'
  const companiiCollection = await prisma.websiteCollection.findFirst({
    where: {
      businessLineId: intraconstruct.id,
      key: 'companii',
    },
  })
  if (!companiiCollection) {
    throw new Error('Colecția "companii" nu a fost găsită pentru linia de business intraconstruct!')
  }
  console.log(`✅ Colecție identificată: ${companiiCollection.name} (${companiiCollection.id})`)

  // 3. Găsim clientul Tentrom Paradise SRL în baza de date
  let client = await prisma.client.findFirst({
    where: {
      OR: [
        { companyName: 'Tentrom Paradise SRL' },
        { companyName: 'TENTROM PARADISE SRL' },
        { website: { contains: 'inchideriterase.ro' } },
        { websites: { has: 'inchideriterase.ro' } },
      ],
    },
  })

  // Date fiscale și de contact complete
  const tentromDetails = {
    companyName: 'Tentrom Paradise SRL',
    cui: '22758821',
    regCom: 'J23/3683/2008',
    phone: '0722416512',
    email: 'contact@inchideriterase.ro',
    address: 'Șos. Banatului, nr. 70B, Chitila, Județ Ilfov',
    website: 'https://inchideriterase.ro',
    websites: ['inchideriterase.ro'],
    industry: 'Construcții',
    status: 'activ',
  }

  if (client) {
    console.log(`  ℹ️  Clientul "${client.companyName}" există deja (${client.id}), actualizăm datele fiscale...`)
    client = await prisma.client.update({
      where: { id: client.id },
      data: {
        cui: client.cui || tentromDetails.cui,
        regCom: client.regCom || tentromDetails.regCom,
        phone: client.phone || tentromDetails.phone,
        address: client.address || tentromDetails.address,
        website: tentromDetails.website,
        websites: tentromDetails.websites,
        status: 'activ',
      },
    })
  } else {
    client = await prisma.client.create({
      data: {
        businessLineId: intraconstruct.id,
        entityType: 'clients',
        ...tentromDetails,
        contactPerson: 'Reprezentant Tentrom Paradise',
      },
    })
    console.log(`  ✅ Client creat: ${client.companyName} (${client.id})`)
  }

  // 4. Căutăm lead-ul asociat (dacă există)
  const lead = await prisma.lead.findFirst({
    where: {
      OR: [
        { companyName: { contains: 'TENTROM', mode: 'insensitive' } },
        { email: { contains: 'tentromparadise', mode: 'insensitive' } },
      ],
    },
  })
  if (lead) {
    console.log(`  🔗 Conectat cu lead-ul din CRM: ${lead.companyName} (${lead.id})`)
  }

  // 5. Creăm sau actualizăm WebsiteEntry pentru Tentrom Paradise SRL
  const slug = 'tentrom-paradise-srl-bucuresti'
  const summary =
    'Lider național în soluții profesionale de închideri terase cu sticlă securizată glisantă, pergole bioclimatice automatizate, copertine retractabile și prelate transparente pentru spații rezidențiale și HoReCa.'

  const body = `TENTROM PARADISE SRL, înființată în 2008, este unul dintre cei mai importanți producători și integratori de soluții avansate pentru amenajarea și protejarea spațiilor exterioare din România. Cu o experiență de peste 15 ani și mii de proiecte finalizate, compania oferă sisteme complete pentru terase rezidențiale, foișoare, balcoane, grădini și spații comerciale (restaurante, cafenele, hoteluri).

Sisteme de închidere cu sticlă securizată:
Sisteme glisante și pliabile din sticlă securizată de 8mm sau 10mm (panouri glisante pe șine paralele, sticlă tip armonică, balustrade din sticlă). Oferă protecție completă împotriva vântului, ploii și prafului, fără profile verticale obstructive, asigurând o panoramă deschisă 100%.

Pergole bioclimatice automatizate:
Structuri autoportante sau atașate din aluminiu extrudat vopsit în câmp electrostatic, cu lamele din aluminiu orientabile și retractabile, iluminare LED perimetrală integrată, senzori de ploaie/vânt și acționare prin telecomandă sau aplicație smart home.

Sisteme de umbrire și prelate transparente:
Copertine retractabile casetate, marchize, sisteme tip rulou casetat cu ghidaje și folie transparentă PVC (cristal transparent) pentru protecția teraselor de iarnă.

De ce Tentrom Paradise:
- Peste 15 ani de producție proprie și montaj specializat;
- Măsurători exacte și consultanță tehnică personalizată la fața locului;
- Garanție extinsă și service asigurat post-montaj;
- Portofoliu vast în București, Ilfov și la nivel național.

Contact: Luni – Vineri 08:30 – 17:30. Telefon: 0722 416 512 / 021 352 05 54. Email: contact@inchideriterase.ro. Adresă: Șos. Banatului, nr. 70B, Chitila, Județ Ilfov.`

  const entryData = {
    cui: '22758821',
    regCom: 'J23/3683/2008',
    regiune: 'București-Ilfov',
    forma_juridica: 'SRL',
    specializare: 'Închideri terase cu sticlă securizată, pergole bioclimatice și sisteme de umbrire',
    an_infiintare: 2008,
    banda_vechime: '10-20 ani',
    banda_angajati: '10-49 (mică)',
    banda_cifra_afaceri: '>10M',
    servicii: ['finisaje', 'geamuri', 'case-modulare'],
    program: 'Luni – Vineri: 08:30 – 17:30',
  }

  const existingEntry = await prisma.websiteEntry.findFirst({
    where: {
      businessLineId: intraconstruct.id,
      collectionId: companiiCollection.id,
      OR: [
        { slug },
        { clientId: client.id },
        { title: 'TENTROM PARADISE SRL' },
      ],
    },
  })

  let entry
  if (existingEntry) {
    console.log(`  ℹ️  Intrarea de website există deja (${existingEntry.id}), actualizăm...`)
    entry = await prisma.websiteEntry.update({
      where: { id: existingEntry.id },
      data: {
        title: 'TENTROM PARADISE SRL',
        slug,
        summary,
        body,
        status: 'published',
        publishedAt: existingEntry.publishedAt || new Date(),
        city: 'București',
        county: 'București',
        address: 'Șos. Banatului, nr. 70B, Chitila, Județ Ilfov',
        phone: '0722416512',
        email: 'contact@inchideriterase.ro',
        websiteUrl: 'https://inchideriterase.ro',
        clientId: client.id,
        leadId: lead ? lead.id : existingEntry.leadId,
        data: entryData,
        partnerAccess: true,
      },
    })
  } else {
    entry = await prisma.websiteEntry.create({
      data: {
        businessLineId: intraconstruct.id,
        collectionId: companiiCollection.id,
        clientId: client.id,
        leadId: lead ? lead.id : null,
        title: 'TENTROM PARADISE SRL',
        slug,
        summary,
        body,
        status: 'published',
        publishedAt: new Date(),
        verified: true,
        featured: true,
        city: 'București',
        county: 'București',
        address: 'Șos. Banatului, nr. 70B, Chitila, Județ Ilfov',
        phone: '0722416512',
        email: 'contact@inchideriterase.ro',
        websiteUrl: 'https://inchideriterase.ro',
        data: entryData,
        partnerAccess: true,
        plan: 'gratuit',
      },
    })
    console.log(`  ✅ Profil creat cu succes: ${entry.title} (${entry.slug})`)
  }

  // 6. Activitate în Activity Log
  await prisma.activity.create({
    data: {
      businessLineId: intraconstruct.id,
      userId: 'system',
      userName: 'System',
      action: 'created',
      entityType: 'website_entry',
      entityId: entry.id,
      entityName: entry.title,
      clientId: client.id,
      details: {
        note: 'Profil companie creat pe IntraConstruct pentru Tentrom Paradise SRL',
        slug: entry.slug,
        services: entryData.servicii,
      },
    },
  })

  console.log('\n🎉 Tentrom Paradise SRL a fost seed-uită complet în colecția "companii" din IntraConstruct!')
  console.log(`   📌 Titlu: ${entry.title}`)
  console.log(`   📌 Slug: ${entry.slug}`)
  console.log(`   📌 Status: ${entry.status}`)
  console.log(`   📌 Servicii asociate: ${entryData.servicii.join(', ')}`)
  console.log(`   📌 Website: ${entry.websiteUrl}\n`)
}

main()
  .catch((e) => {
    console.error('❌ Eroare la seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

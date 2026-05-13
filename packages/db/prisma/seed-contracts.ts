// packages/db/prisma/seed-contracts.ts
// ─── Contracts Module Seed ───
// Creates 2 demo contracts from existing offers (if available)

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding Contracts Module...')

  // ── Step 1: Resolve business lines ──
  const businessLines = await prisma.businessLine.findMany({
    select: { id: true, slug: true },
  })
  const blMap = new Map(businessLines.map((bl) => [bl.slug, bl.id]))

  if (businessLines.length === 0) {
    console.error('❌ No business lines found in DB. Seed the business lines first (Module 0).')
    process.exit(1)
  }
  console.log(`  Found ${businessLines.length} business lines: ${businessLines.map(bl => bl.slug).join(', ')}`)

  // ── Step 2: Find existing offers and clients ──
  const offers = await prisma.offer.findMany({
    take: 2,
    orderBy: { createdAt: 'asc' },
    include: {
      client: { select: { id: true, companyName: true, cui: true, address: true, contactPerson: true } },
      businessLine: { select: { id: true, slug: true } },
    },
  })

  const agencyBLId = blMap.get('agency')

  if (offers.length === 0) {
    console.log('  ⚠ No offers found. Searching for clients to create standalone contracts...')

    // Find agency clients instead
    const clients = await prisma.client.findMany({
      where: { businessLineId: agencyBLId },
      take: 2,
      orderBy: { createdAt: 'asc' },
      select: { id: true, companyName: true, cui: true, address: true, contactPerson: true },
    })

    if (clients.length === 0) {
      console.error('❌ No clients found in DB. Seed CRM first (Module 1).')
      process.exit(1)
    }

    // Clear existing contracts
    const deleted = await prisma.contract.deleteMany({})
    console.log(`  Cleared ${deleted.count} existing contracts`)

    // Create contracts from clients
    for (let i = 0; i < clients.length; i++) {
      const client = clients[i]!
      const number = `ASNS-AG-2026-${String(i + 1).padStart(3, '0')}`

      await prisma.contract.create({
        data: {
          number,
          businessLineId: agencyBLId!,
          clientId: client.id,
          templateId: 'ct-seo-ads',
          sections: getDefaultSections(client),
          anexa2: getDefaultAnexa2(),
          companyDetails: getCompanyDetails(),
          clientDetails: {
            legalName: client.companyName,
            cif: client.cui || 'N/A',
            regCom: 'N/A',
            address: client.address || 'N/A',
            representative: client.contactPerson,
            representativeRole: 'Administrator',
          },
          status: i === 0 ? 'active' : 'draft',
          value: i === 0 ? 4800 : 3200,
          currency: 'EUR',
          duration: 12,
          startDate: new Date('2026-01-01'),
          endDate: new Date('2026-12-31'),
          signedAt: i === 0 ? new Date('2026-01-05') : null,
          createdBy: 'user-001',
        },
      })
      console.log(`  ✅ Created contract ${number} for ${client.companyName}`)
    }
  } else {
    // Clear existing contracts
    const deleted = await prisma.contract.deleteMany({})
    console.log(`  Cleared ${deleted.count} existing contracts`)

    // Create contracts from offers
    for (let i = 0; i < offers.length; i++) {
      const offer = offers[i]!
      const blSlug = offer.businessLine.slug
      const prefix = blSlug === 'agency' ? 'ASNS-AG' : blSlug === 'fudly' ? 'ASNS-FD' : 'ASNS-CP'
      const number = `${prefix}-2026-${String(i + 1).padStart(3, '0')}`

      const clientDetails = offer.client ? {
        legalName: offer.client.companyName,
        cif: offer.client.cui || 'N/A',
        regCom: 'N/A',
        address: offer.client.address || 'N/A',
        representative: offer.client.contactPerson,
        representativeRole: 'Administrator',
      } : {
        legalName: offer.entityName,
        cif: 'N/A',
        regCom: 'N/A',
        address: 'N/A',
        representative: 'N/A',
        representativeRole: 'Administrator',
      }

      await prisma.contract.create({
        data: {
          number,
          businessLineId: offer.businessLine.id,
          offerId: offer.id,
          clientId: offer.client?.id || offer.clientId!,
          templateId: 'ct-seo-ads',
          sections: getDefaultSections(offer.client || { companyName: offer.entityName, contactPerson: 'N/A', address: null, cui: null }),
          anexa2: getDefaultAnexa2(),
          companyDetails: getCompanyDetails(),
          clientDetails,
          status: i === 0 ? 'signed' : 'draft',
          value: offer.value,
          currency: offer.currency,
          duration: 12,
          startDate: new Date('2026-01-01'),
          endDate: new Date('2026-12-31'),
          signedAt: i === 0 ? new Date('2026-01-10') : null,
          createdBy: 'user-001',
        },
      })

      // Mark offer as contract_generat
      await prisma.offer.update({
        where: { id: offer.id },
        data: { status: 'contract_generat' },
      })

      console.log(`  ✅ Created contract ${number} from offer ${offer.number}`)
    }
  }

  console.log('🌱 Contracts Module seed complete!')
}

// ─── Helper: Company details snapshot ──
function getCompanyDetails() {
  return {
    name: 'ASNS',
    legalName: 'ADVANCED SYSTEMS & NETWORK SOLUTIONS SRL',
    regCom: 'J40/12223/2006',
    cif: 'RO18890424',
    address: 'Sos. Berceni, Nr.39, Bl.107, Sc.2, Et.7, Ap.100, Sector 4, Jud. București',
    iban: 'RO59BTRLRONCRT0549484001',
    bank: 'BANCA TRANSILVANIA',
    representative: 'Administrator',
    representativeRole: 'Administrator',
    email: 'office@asns.ro',
    phone: '+40 XXX XXX XXX',
    website: 'https://asns.ro',
  }
}

// ─── Helper: Default sections with resolved variables ──
function getDefaultSections(client: { companyName: string; contactPerson: string; address?: string | null; cui?: string | null }) {
  return [
    { id: 'art-1', title: 'Art. 1 — Părțile Contractante', editable: true, content: `1.1. **ADVANCED SYSTEMS & NETWORK SOLUTIONS SRL**, cu sediul în Sos. Berceni, Nr.39, Bl.107, Sc.2, Et.7, Ap.100, Sector 4, Jud. București, înregistrată la Registrul Comerțului sub nr. J40/12223/2006, CIF RO18890424, cont IBAN RO59BTRLRONCRT0549484001 deschis la BANCA TRANSILVANIA, reprezentată legal prin Administrator, în calitate de **PRESTATOR**,\n\nși\n\n1.2. **${client.companyName}**, cu sediul în ${client.address || 'N/A'}, CIF ${client.cui || 'N/A'}, reprezentată legal prin ${client.contactPerson} în calitate de Administrator, denumit(ă) în continuare **BENEFICIAR**,\n\nau convenit încheierea prezentului contract de prestări servicii, în următoarele condiții:` },
    { id: 'art-2', title: 'Art. 2 — Obiectul Contractului', editable: true, content: '2.1. Obiectul prezentului contract îl constituie prestarea de către Prestator a serviciilor de marketing digital (SEO + Google Ads).' },
    { id: 'art-3', title: 'Art. 3 — Durata Contractului', editable: true, content: '3.1. Prezentul contract se încheie pe o perioadă de **12 luni**, începând cu data de **01.01.2026** și până la data de **31.12.2026**.' },
    { id: 'art-4', title: 'Art. 4 — Prețul și Modalități de Plată', editable: true, content: '4.1. Tarif lunar de management conform ofertei anexate.' },
    { id: 'art-5', title: 'Art. 5 — Obligațiile Prestatorului', editable: true, content: '5.1. Prestatorul se obligă să presteze serviciile prevăzute cu profesionalism și diligență.' },
    { id: 'art-6', title: 'Art. 6 — Obligațiile Beneficiarului', editable: true, content: '6.1. Beneficiarul se obligă să achite la termen și să furnizeze accesurile necesare.' },
    { id: 'art-7', title: 'Art. 7 — Limitarea Răspunderii', editable: true, content: '7.1. Prestatorul nu garantează rezultate specifice (poziții, trafic, conversii).' },
    { id: 'art-8', title: 'Art. 8 — Confidențialitate', editable: false, content: '8.1. Ambele Părți se obligă să păstreze confidențialitatea informațiilor.' },
    { id: 'art-9', title: 'Art. 9 — Proprietate Intelectuală', editable: true, content: '9.1. Conținutul creat devine proprietatea Beneficiarului după plata integrală.' },
    { id: 'art-10', title: 'Art. 10 — Forța Majoră', editable: false, content: '10.1. Forța majoră exonerează de răspundere Partea care o invocă.' },
    { id: 'art-11', title: 'Art. 11 — Rezilierea Contractului', editable: true, content: '11.1. Contractul poate fi reziliat prin acordul ambelor Părți sau cu preaviz de 30 zile.' },
    { id: 'art-12', title: 'Art. 12 — Dispoziții Finale', editable: false, content: '12.1. Prezentul contract este guvernat de legislația din România.' },
  ]
}

// ─── Helper: Default Anexa 2 (SoW) ──
function getDefaultAnexa2() {
  return {
    deliverables: [
      { id: 'del-01', service: 'Audit SEO Tehnic', frequency: 'one-time', kpi: 'Raport complet' },
      { id: 'del-02', service: 'Cercetare Cuvinte Cheie', frequency: 'lunar', kpi: '50+ keywords' },
      { id: 'del-03', service: 'Optimizare On-Page', frequency: 'lunar', kpi: 'Pagini optimizate/lună' },
      { id: 'del-04', service: 'Link Building', frequency: 'lunar', kpi: '4+ backlinks/lună' },
      { id: 'del-05', service: 'Content Marketing', frequency: 'lunar', kpi: '4-8 articole/lună' },
      { id: 'del-06', service: 'Setup Google Ads', frequency: 'one-time', kpi: 'Cont configurat' },
      { id: 'del-07', service: 'Management Google Ads', frequency: 'lunar', kpi: 'ROAS, CPA, CTR' },
      { id: 'del-08', service: 'Raport Lunar', frequency: 'lunar', kpi: 'Raport PDF + Dashboard' },
    ],
    phases: [
      { id: 'phase-1', name: 'Onboarding & Setup Tehnic', period: 'Luna 1', tasks: ['Configurare accese', 'Audit SEO', 'Setup Google Ads'], deliverable: 'Strategie Inițială + Audit SEO' },
      { id: 'phase-2', name: 'Implementare & Lansare', period: 'Lunile 2-3', tasks: ['Optimizare On-Page', 'Lansare campanii Ads', 'Publicare articole'], deliverable: 'Raport progres Luna 2' },
      { id: 'phase-3', name: 'Scalare & Optimizare', period: 'Lunile 4-6', tasks: ['Scalare conținut', 'Link building activ', 'Optimizare campanii'], deliverable: 'Raport trimestrial' },
    ],
    reporting: {
      frequency: 'Lunar — până la data de 10 a lunii următoare',
      format: 'Raport PDF detaliat + Dashboard live',
      meetingCadence: 'La cerere sau bilunar',
      kpis: [
        { category: 'SEO Organic', metrics: ['Poziții keywords', 'Trafic organic', 'CTR organic'] },
        { category: 'Google Ads', metrics: ['CPC', 'CTR', 'CPA', 'ROAS', 'Conversii'] },
        { category: 'General', metrics: ['Sesiuni totale', 'Conversii totale'] },
      ],
    },
  }
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

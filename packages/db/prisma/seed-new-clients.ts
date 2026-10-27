import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const createSeoMetadata = (domain: string) => ({
  viewType: 'timeline',
  phases: [
    { name: 'Audit', status: 'pending', completedAt: null },
    { name: 'Strategie', status: 'pending', completedAt: null },
    { name: 'Implementare On-Page', status: 'pending', completedAt: null },
    { name: 'Off-Page', status: 'pending', completedAt: null },
    { name: 'Monitorizare', status: 'pending', completedAt: null },
  ],
  kpis: [
    { label: 'Trafic organic', value: '—', target: '—' },
    { label: 'Keywords top 10', value: '—', target: '—' },
    { label: 'Impressions GSC', value: '—', target: '—' },
    { label: 'CTR mediu', value: '—', target: '—' },
  ],
  gscSiteUrl: `sc-domain:${domain}`,
  targetDomain: domain,
})

async function main() {
  console.log('\n🚀 Adăugare clienți și domenii noi în Agency OS...\n')

  const agency = await prisma.businessLine.findUnique({ where: { slug: 'agency' } })
  if (!agency) {
    throw new Error('Business line "agency" nu a fost găsită!')
  }
  console.log(`✅ Business Line identificată: ${agency.name} (${agency.id})`)

  // 1. Mido94 (tigladeacoperis.ro)
  console.log('\n--- 1. Mido94 ---')
  const midoData = {
    businessLineId: agency.id,
    entityType: 'clients',
    companyName: 'Mido94',
    contactPerson: 'Reprezentant Mido94',
    email: 'contact@tigladeacoperis.ro',
    phone: '0722626707',
    website: 'https://tigladeacoperis.ro',
    websites: ['tigladeacoperis.ro'],
    status: 'activ',
    industry: 'Acoperișuri & Învelitori',
    address: 'Aleea Teișani, Nr. 125, Sector 1, București',
    gscSiteUrl: 'sc-domain:tigladeacoperis.ro',
  }

  let mido = await prisma.client.findFirst({
    where: {
      businessLineId: agency.id,
      OR: [
        { companyName: 'Mido94' },
        { companyName: 'MIDO COMIMPEX 94 S.R.L.' },
        { website: 'https://tigladeacoperis.ro' },
        { websites: { has: 'tigladeacoperis.ro' } },
      ],
    },
  })

  if (mido) {
    console.log(`  ℹ️  Clientul Mido94 există deja (${mido.id}), actualizăm...`)
    mido = await prisma.client.update({
      where: { id: mido.id },
      data: {
        companyName: 'Mido94',
        website: midoData.website,
        websites: ['tigladeacoperis.ro'],
        status: 'activ',
        email: mido.email || midoData.email,
        phone: mido.phone || midoData.phone,
        industry: midoData.industry,
        gscSiteUrl: midoData.gscSiteUrl,
      },
    })
  } else {
    mido = await prisma.client.create({ data: midoData })
    console.log(`  ✅ Client creat: ${mido.companyName} (${mido.id})`)
  }

  await prisma.clientDomainConfig.upsert({
    where: { clientId_domain: { clientId: mido.id, domain: 'tigladeacoperis.ro' } },
    update: { gscSiteUrl: 'sc-domain:tigladeacoperis.ro', isActive: true, notes: 'Site oficial țiglă de acoperiș' },
    create: {
      clientId: mido.id,
      domain: 'tigladeacoperis.ro',
      gscSiteUrl: 'sc-domain:tigladeacoperis.ro',
      isActive: true,
      notes: 'Site oficial țiglă de acoperiș',
    },
  })
  console.log(`  ✅ Domeniu configurat: tigladeacoperis.ro`)

  const midoProjName = 'SEO — tigladeacoperis.ro'
  const existingMidoProj = await prisma.project.findFirst({
    where: { clientId: mido.id, name: midoProjName },
  })
  if (!existingMidoProj) {
    await prisma.project.create({
      data: {
        businessLineId: agency.id,
        clientId: mido.id,
        templateId: 'seo_project',
        name: midoProjName,
        status: 'in_lucru',
        currentPhase: 'Audit',
        progress: 10,
        startDate: new Date(),
        metadata: createSeoMetadata('tigladeacoperis.ro'),
      },
    })
    console.log(`  ✅ Proiect creat: ${midoProjName}`)
  }

  // 2. Turbovent Retail SRL (tubovent.ro)
  console.log('\n--- 2. Turbovent Retail SRL ---')
  const turboventData = {
    businessLineId: agency.id,
    entityType: 'clients',
    companyName: 'Turbovent Retail SRL',
    cui: '16544270',
    contactPerson: 'Reprezentant Turbovent',
    email: 'tubovent@yahoo.ro',
    phone: '0720249149',
    website: 'https://tubovent.ro',
    websites: ['tubovent.ro'],
    status: 'activ',
    industry: 'Ventilație & Climatizare',
    address: 'Bd. Basarabia, nr. 177, Sector 3, București',
    gscSiteUrl: 'sc-domain:tubovent.ro',
  }

  let turbovent = await prisma.client.findFirst({
    where: {
      businessLineId: agency.id,
      OR: [
        { companyName: 'Turbovent Retail SRL' },
        { companyName: 'TURBOVENT RETAIL S.R.L.' },
        { website: 'https://tubovent.ro' },
        { websites: { has: 'tubovent.ro' } },
      ],
    },
  })

  if (turbovent) {
    console.log(`  ℹ️  Clientul Turbovent Retail SRL există deja (${turbovent.id}), actualizăm...`)
    turbovent = await prisma.client.update({
      where: { id: turbovent.id },
      data: {
        companyName: 'Turbovent Retail SRL',
        cui: turboventData.cui,
        website: turboventData.website,
        websites: ['tubovent.ro'],
        status: 'activ',
        email: turbovent.email || turboventData.email,
        phone: turbovent.phone || turboventData.phone,
        industry: turboventData.industry,
        gscSiteUrl: turboventData.gscSiteUrl,
      },
    })
  } else {
    turbovent = await prisma.client.create({ data: turboventData })
    console.log(`  ✅ Client creat: ${turbovent.companyName} (${turbovent.id})`)
  }

  await prisma.clientDomainConfig.upsert({
    where: { clientId_domain: { clientId: turbovent.id, domain: 'tubovent.ro' } },
    update: { gscSiteUrl: 'sc-domain:tubovent.ro', isActive: true, notes: 'Site oficial tubulaturi ventilație' },
    create: {
      clientId: turbovent.id,
      domain: 'tubovent.ro',
      gscSiteUrl: 'sc-domain:tubovent.ro',
      isActive: true,
      notes: 'Site oficial tubulaturi ventilație',
    },
  })
  console.log(`  ✅ Domeniu configurat: tubovent.ro`)

  const turboventProjName = 'SEO — tubovent.ro'
  const existingTurboventProj = await prisma.project.findFirst({
    where: { clientId: turbovent.id, name: turboventProjName },
  })
  if (!existingTurboventProj) {
    await prisma.project.create({
      data: {
        businessLineId: agency.id,
        clientId: turbovent.id,
        templateId: 'seo_project',
        name: turboventProjName,
        status: 'in_lucru',
        currentPhase: 'Audit',
        progress: 10,
        startDate: new Date(),
        metadata: createSeoMetadata('tubovent.ro'),
      },
    })
    console.log(`  ✅ Proiect creat: ${turboventProjName}`)
  }

  // 3. Tomas Woods SRL (ferestrelemnstratificat.ro & tomaswoods.ro)
  console.log('\n--- 3. Tomas Woods SRL ---')
  const tomasData = {
    businessLineId: agency.id,
    entityType: 'clients',
    companyName: 'Tomas Woods SRL',
    cui: '43218719',
    regCom: 'J40/13901/2020',
    contactPerson: 'Reprezentant Tomas Woods',
    email: 'contact@tomaswoods.ro',
    website: 'https://tomaswoods.ro',
    websites: ['ferestrelemnstratificat.ro', 'tomaswoods.ro'],
    status: 'activ',
    industry: 'Tâmplărie Lemn Stratificat & Producție',
    address: 'Șos. Berceni nr. 39, Sector 4, București',
    gscSiteUrl: 'sc-domain:tomaswoods.ro',
  }

  let tomas = await prisma.client.findFirst({
    where: {
      businessLineId: agency.id,
      OR: [
        { companyName: 'Tomas Woods SRL' },
        { companyName: 'TOMAS WOODS S.R.L.' },
        { website: 'https://tomaswoods.ro' },
        { websites: { hasSome: ['tomaswoods.ro', 'ferestrelemnstratificat.ro'] } },
      ],
    },
  })

  if (tomas) {
    console.log(`  ℹ️  Clientul Tomas Woods SRL există deja (${tomas.id}), actualizăm...`)
    tomas = await prisma.client.update({
      where: { id: tomas.id },
      data: {
        companyName: 'Tomas Woods SRL',
        cui: tomasData.cui,
        regCom: tomasData.regCom,
        website: tomasData.website,
        websites: ['ferestrelemnstratificat.ro', 'tomaswoods.ro'],
        status: 'activ',
        email: tomas.email || tomasData.email,
        industry: tomasData.industry,
        address: tomasData.address,
        gscSiteUrl: tomasData.gscSiteUrl,
      },
    })
  } else {
    tomas = await prisma.client.create({ data: tomasData })
    console.log(`  ✅ Client creat: ${tomas.companyName} (${tomas.id})`)
  }

  const tomasDomains = [
    {
      domain: 'ferestrelemnstratificat.ro',
      gscSiteUrl: 'sc-domain:ferestrelemnstratificat.ro',
      notes: 'Tâmplărie și ferestre lemn stratificat',
    },
    {
      domain: 'tomaswoods.ro',
      gscSiteUrl: 'sc-domain:tomaswoods.ro',
      notes: 'Site principal Tomas Woods',
    },
  ]

  for (const td of tomasDomains) {
    await prisma.clientDomainConfig.upsert({
      where: { clientId_domain: { clientId: tomas.id, domain: td.domain } },
      update: { gscSiteUrl: td.gscSiteUrl, isActive: true, notes: td.notes },
      create: {
        clientId: tomas.id,
        domain: td.domain,
        gscSiteUrl: td.gscSiteUrl,
        isActive: true,
        notes: td.notes,
      },
    })
    console.log(`  ✅ Domeniu configurat: ${td.domain}`)

    const projName = `SEO — ${td.domain}`
    const existingProj = await prisma.project.findFirst({
      where: { clientId: tomas.id, name: projName },
    })
    if (!existingProj) {
      await prisma.project.create({
        data: {
          businessLineId: agency.id,
          clientId: tomas.id,
          templateId: 'seo_project',
          name: projName,
          status: 'in_lucru',
          currentPhase: 'Audit',
          progress: 10,
          startDate: new Date(),
          metadata: createSeoMetadata(td.domain),
        },
      })
      console.log(`  ✅ Proiect creat: ${projName}`)
    }
  }

  // 4. Hidro Pro SRL (hidropro.ro)
  console.log('\n--- 4. Hidro Pro SRL ---')
  const hidroData = {
    businessLineId: agency.id,
    entityType: 'clients',
    companyName: 'Hidro Pro SRL',
    contactPerson: 'Reprezentant Hidro Pro',
    email: 'contact@hidropro.ro',
    phone: '0773701654',
    website: 'https://hidropro.ro',
    websites: ['hidropro.ro'],
    status: 'activ',
    industry: 'Hidroizolații & Construcții',
    address: 'Șos. Mihai Bravu nr. 55-59, Sector 3, București',
    gscSiteUrl: 'sc-domain:hidropro.ro',
  }

  let hidro = await prisma.client.findFirst({
    where: {
      businessLineId: agency.id,
      OR: [
        { companyName: 'Hidro Pro SRL' },
        { companyName: 'HIDRO PRO S.R.L.' },
        { website: 'https://hidropro.ro' },
        { websites: { has: 'hidropro.ro' } },
      ],
    },
  })

  if (hidro) {
    console.log(`  ℹ️  Clientul Hidro Pro SRL există deja (${hidro.id}), actualizăm...`)
    hidro = await prisma.client.update({
      where: { id: hidro.id },
      data: {
        companyName: 'Hidro Pro SRL',
        website: hidroData.website,
        websites: ['hidropro.ro'],
        status: 'activ',
        email: hidro.email || hidroData.email,
        phone: hidro.phone || hidroData.phone,
        industry: hidroData.industry,
        address: hidroData.address,
        gscSiteUrl: hidroData.gscSiteUrl,
      },
    })
  } else {
    hidro = await prisma.client.create({ data: hidroData })
    console.log(`  ✅ Client creat: ${hidro.companyName} (${hidro.id})`)
  }

  await prisma.clientDomainConfig.upsert({
    where: { clientId_domain: { clientId: hidro.id, domain: 'hidropro.ro' } },
    update: { gscSiteUrl: 'sc-domain:hidropro.ro', isActive: true, notes: 'Site oficial hidroizolații' },
    create: {
      clientId: hidro.id,
      domain: 'hidropro.ro',
      gscSiteUrl: 'sc-domain:hidropro.ro',
      isActive: true,
      notes: 'Site oficial hidroizolații',
    },
  })
  console.log(`  ✅ Domeniu configurat: hidropro.ro`)

  const hidroProjName = 'SEO — hidropro.ro'
  const existingHidroProj = await prisma.project.findFirst({
    where: { clientId: hidro.id, name: hidroProjName },
  })
  if (!existingHidroProj) {
    await prisma.project.create({
      data: {
        businessLineId: agency.id,
        clientId: hidro.id,
        templateId: 'seo_project',
        name: hidroProjName,
        status: 'in_lucru',
        currentPhase: 'Audit',
        progress: 10,
        startDate: new Date(),
        metadata: createSeoMetadata('hidropro.ro'),
      },
    })
    console.log(`  ✅ Proiect creat: ${hidroProjName}`)
  }

  // 5. Advanced Systems (adăugare doctorchirurg.ro, madalinatartalea.ro, topdoctori.ro)
  console.log('\n--- 5. Advanced Systems ---')
  let advanced = await prisma.client.findFirst({
    where: { companyName: 'Advanced Systems' },
  })

  if (!advanced) {
    throw new Error('Clientul "Advanced Systems" nu a fost găsit în baza de date!')
  }

  const existingWebsites = advanced.websites || []
  const newAdvancedDomains = ['doctorchirurg.ro', 'madalinatartalea.ro', 'topdoctori.ro']
  const updatedWebsites = Array.from(new Set([...existingWebsites, ...newAdvancedDomains]))

  advanced = await prisma.client.update({
    where: { id: advanced.id },
    data: {
      websites: updatedWebsites,
    },
  })
  console.log(`  ✅ Advanced Systems actualizat cu domeniile: ${updatedWebsites.join(', ')}`)

  const advancedDomainConfigs = [
    {
      domain: 'doctorchirurg.ro',
      gscSiteUrl: 'sc-domain:doctorchirurg.ro',
      notes: 'Portal chirurgie / servicii medicale',
    },
    {
      domain: 'madalinatartalea.ro',
      gscSiteUrl: 'sc-domain:madalinatartalea.ro',
      notes: 'Cabinet dr. Mădălina Tărtălea',
    },
    {
      domain: 'topdoctori.ro',
      gscSiteUrl: 'sc-domain:topdoctori.ro',
      notes: 'Platformă medici / clinici Top Doctori',
    },
  ]

  for (const adc of advancedDomainConfigs) {
    await prisma.clientDomainConfig.upsert({
      where: { clientId_domain: { clientId: advanced.id, domain: adc.domain } },
      update: { gscSiteUrl: adc.gscSiteUrl, isActive: true, notes: adc.notes },
      create: {
        clientId: advanced.id,
        domain: adc.domain,
        gscSiteUrl: adc.gscSiteUrl,
        isActive: true,
        notes: adc.notes,
      },
    })
    console.log(`  ✅ Domeniu configurat: ${adc.domain}`)

    const projName = `SEO — ${adc.domain}`
    const existingProj = await prisma.project.findFirst({
      where: { clientId: advanced.id, name: projName },
    })
    if (!existingProj) {
      await prisma.project.create({
        data: {
          businessLineId: agency.id,
          clientId: advanced.id,
          templateId: 'seo_project',
          name: projName,
          status: 'in_lucru',
          currentPhase: 'Audit',
          progress: 10,
          startDate: new Date(),
          metadata: createSeoMetadata(adc.domain),
        },
      })
      console.log(`  ✅ Proiect creat: ${projName}`)
    }
  }

  // Log activity
  await prisma.activity.create({
    data: {
      businessLineId: agency.id,
      userId: 'system',
      userName: 'System',
      action: 'created',
      entityType: 'client',
      entityId: agency.id,
      entityName: 'Import Clienți Noi',
      details: {
        importedClients: ['Mido94', 'Turbovent Retail SRL', 'Tomas Woods SRL', 'Hidro Pro SRL'],
        advancedSystemsAddedDomains: newAdvancedDomains,
      },
    },
  })

  console.log('\n🎉 Toți clienții și domeniile au fost adăugate cu succes în Agency OS!\n')
}

main()
  .catch((e) => {
    console.error('❌ Eroare la seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

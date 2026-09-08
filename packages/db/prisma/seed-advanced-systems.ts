import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('\n🏗️  Seeding Advanced Systems client + SEO project...\n')

  // 1. Find the 'agency' business line
  const agency = await prisma.businessLine.findUnique({ where: { slug: 'agency' } })
  if (!agency) {
    throw new Error('Business line "agency" not found. Run the main seed first.')
  }
  console.log(`  ✅ Found business line: ${agency.name} (${agency.id})`)

  // 2. Create (or update) the Advanced Systems client
  const websites = [
    'centruldemobila.ro',
    'intraconstruct.ro',
    'pisicutesicaini.ro',
    'omniamed.ro',
  ]

  // Check if client already exists (by companyName + businessLine)
  let client = await prisma.client.findFirst({
    where: {
      companyName: 'Advanced Systems',
      businessLineId: agency.id,
    },
  })

  if (client) {
    console.log(`  ⚠️  Client "Advanced Systems" already exists (${client.id}), updating...`)
    client = await prisma.client.update({
      where: { id: client.id },
      data: {
        websites,
        website: 'https://centruldemobila.ro',
        status: 'activ',
        contactPerson: 'Adrian Nichitov',
        gscSiteUrl: 'sc-domain:centruldemobila.ro',
      },
    })
  } else {
    client = await prisma.client.create({
      data: {
        businessLineId: agency.id,
        entityType: 'clients',
        companyName: 'Advanced Systems',
        contactPerson: 'Adrian Nichitov',
        email: 'contact@advancedsystems.ro',
        status: 'activ',
        industry: 'E-commerce & Services',
        website: 'https://centruldemobila.ro',
        websites,
        gscSiteUrl: 'sc-domain:centruldemobila.ro',
      },
    })
  }
  console.log(`  ✅ Client: ${client.companyName} (${client.id})`)
  console.log(`     📌 Websites: ${websites.join(', ')}`)

  // 3. Create ClientDomainConfig for each domain
  const domainConfigs = [
    {
      domain: 'centruldemobila.ro',
      gscSiteUrl: 'sc-domain:centruldemobila.ro',
      notes: 'Main e-commerce site — mobilier',
    },
    {
      domain: 'intraconstruct.ro',
      gscSiteUrl: 'sc-domain:intraconstruct.ro',
      notes: 'Construction services site',
    },
    {
      domain: 'pisicutesicaini.ro',
      gscSiteUrl: 'sc-domain:pisicutesicaini.ro',
      notes: 'Pet shop / pet services',
    },
    {
      domain: 'omniamed.ro',
      gscSiteUrl: 'sc-domain:omniamed.ro',
      notes: 'Medical services',
    },
  ]

  for (const dc of domainConfigs) {
    await prisma.clientDomainConfig.upsert({
      where: {
        clientId_domain: {
          clientId: client.id,
          domain: dc.domain,
        },
      },
      update: {
        gscSiteUrl: dc.gscSiteUrl,
        notes: dc.notes,
      },
      create: {
        clientId: client.id,
        domain: dc.domain,
        gscSiteUrl: dc.gscSiteUrl,
        notes: dc.notes,
      },
    })
    console.log(`  ✅ Domain config: ${dc.domain} → GSC: ${dc.gscSiteUrl}`)
  }

  // 4. Create SEO Project for centruldemobila.ro
  const seoProjectName = 'SEO — centruldemobila.ro'

  // Check if project already exists
  let seoProject = await prisma.project.findFirst({
    where: {
      clientId: client.id,
      name: seoProjectName,
    },
  })

  const seoMetadata = {
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
    // GSC config at project level
    gscSiteUrl: 'sc-domain:centruldemobila.ro',
    // Target domain for multi-site clients
    targetDomain: 'centruldemobila.ro',
  }

  if (seoProject) {
    console.log(`  ⚠️  SEO project already exists (${seoProject.id}), updating metadata...`)
    seoProject = await prisma.project.update({
      where: { id: seoProject.id },
      data: {
        metadata: seoMetadata,
      },
    })
  } else {
    seoProject = await prisma.project.create({
      data: {
        businessLineId: agency.id,
        clientId: client.id,
        templateId: 'seo_project',
        name: seoProjectName,
        status: 'planificare',
        currentPhase: 'Audit',
        progress: 0,
        startDate: new Date(),
        assignedTo: 'usr-001',
        metadata: seoMetadata,
      },
    })
  }
  console.log(`  ✅ SEO Project: ${seoProject.name} (${seoProject.id})`)
  console.log(`     🔍 GSC: sc-domain:centruldemobila.ro`)
  console.log(`     📋 Template: seo_project`)
  console.log(`     📊 Phases: Audit → Strategie → On-Page → Off-Page → Monitorizare`)

  // 5. Log activity
  await prisma.activity.create({
    data: {
      businessLineId: agency.id,
      userId: 'system',
      userName: 'System (Seed)',
      action: 'created',
      entityType: 'client',
      entityId: client.id,
      entityName: 'Advanced Systems',
      clientId: client.id,
      details: {
        note: 'Client creat via seed cu 4 domenii: centruldemobila.ro, intraconstruct.ro, pisicutesicaini.ro, omniamed.ro',
      },
    },
  })

  await prisma.activity.create({
    data: {
      businessLineId: agency.id,
      userId: 'system',
      userName: 'System (Seed)',
      action: 'created',
      entityType: 'project',
      entityId: seoProject.id,
      entityName: seoProjectName,
      projectId: seoProject.id,
      clientId: client.id,
      details: {
        note: 'Proiect SEO creat via seed cu GSC configurat pe sc-domain:centruldemobila.ro',
      },
    },
  })

  console.log('\n✅ Seed complete!\n')
  console.log('  📝 Summary:')
  console.log(`     Client: Advanced Systems (${client.id})`)
  console.log(`     Domains: ${websites.join(', ')}`)
  console.log(`     SEO Project: ${seoProjectName} (${seoProject.id})`)
  console.log(`     GSC: sc-domain:centruldemobila.ro`)
  console.log('')
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

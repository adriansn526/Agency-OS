import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function seedBusinessLines() {
  console.log('🏢 Seeding Business Lines...')
  
  const businessLines = [
    {
      slug: 'agency',
      name: 'Servicii Agenție',
      icon: 'Briefcase',
      color: '#6366f1',
      config: {
        entityTypes: ['clients'],
        projectTemplates: [
          { id: 'website', name: 'Website Development', viewType: 'timeline', phases: ['Discovery', 'Design', 'Development', 'Testing', 'Launch'] },
          { id: 'seo', name: 'SEO Campaign', viewType: 'timeline', phases: ['Audit', 'Strategie', 'Implementare On-Page', 'Off-Page', 'Monitorizare'] },
          { id: 'google_ads', name: 'Google Ads', viewType: 'timeline', phases: ['Setup', 'Campanii', 'Optimizare', 'Raportare'] },
        ],
      },
    },
    {
      slug: 'fudly',
      name: 'Fudly SaaS',
      icon: 'UtensilsCrossed',
      color: '#f59e0b',
      config: {
        entityTypes: ['restaurants'],
        projectTemplates: [
          { id: 'onboarding_restaurant', name: 'Onboarding Restaurant', viewType: 'checklist', checklist: ['Contract semnat', 'Cont creat', 'Meniu configurat', 'Integrare POS', 'Training echipă', 'Go-live'] },
        ],
      },
    },
    {
      slug: 'climaticpro',
      name: 'ClimaticPRO',
      icon: 'Thermometer',
      color: '#10b981',
      config: {
        entityTypes: ['end_clients', 'installers', 'suppliers'],
        projectTemplates: [
          { id: 'instalare_ac', name: 'Instalare AC', viewType: 'stepper', phases: ['Cerere', 'Ofertă', 'Programare', 'Instalare', 'Verificare', 'Garanție'] },
        ],
      },
    },
    {
      slug: 'wertaudit',
      name: 'WertAudit',
      icon: 'Shield',
      color: '#ef4444',
      config: {
        entityTypes: ['clients'],
        projectTemplates: [
          { id: 'audit', name: 'Audit Complet', viewType: 'timeline', phases: ['Planificare', 'Colectare Date', 'Analiză', 'Raport Draft', 'Raport Final'] },
        ],
      },
    },
  ]

  for (const bl of businessLines) {
    await prisma.businessLine.upsert({
      where: { slug: bl.slug },
      update: bl,
      create: bl,
    })
  }
  console.log(`  ✅ ${businessLines.length} business lines`)
}

async function seedClients() {
  console.log('👥 Seeding Clients...')
  
  const agency = await prisma.businessLine.findUnique({ where: { slug: 'agency' } })
  const fudly = await prisma.businessLine.findUnique({ where: { slug: 'fudly' } })
  const climaticpro = await prisma.businessLine.findUnique({ where: { slug: 'climaticpro' } })
  
  if (!agency || !fudly || !climaticpro) throw new Error('Business lines not found')

  const clients = [
    // Agency clients
    { businessLineId: agency.id, entityType: 'clients', companyName: 'QualityControl.com.ro', contactPerson: 'Maria Ionescu', email: 'maria@qualitycontrol.com.ro', phone: '+40721111111', status: 'activ', industry: 'Textile & Fashion', website: 'https://qualitycontrol.com.ro' },
    { businessLineId: agency.id, entityType: 'clients', companyName: 'TechVision SRL', contactPerson: 'Alexandru Pop', email: 'alex@techvision.ro', phone: '+40722222222', status: 'activ', industry: 'IT & Software' },
    { businessLineId: agency.id, entityType: 'clients', companyName: 'GreenEnergy Solutions', contactPerson: 'Andrei Marin', email: 'andrei@greenenergy.ro', phone: '+40723333333', status: 'activ', industry: 'Energie Regenerabilă' },
    { businessLineId: agency.id, entityType: 'clients', companyName: 'Nordic Textile ApS', contactPerson: 'Lars Hansen', email: 'lars@nordictextile.dk', phone: '+4520123456', status: 'prospect', industry: 'Textile' },
    { businessLineId: agency.id, entityType: 'clients', companyName: 'Amanet Swiss GmbH', contactPerson: 'Thomas Müller', email: 'thomas@amanetswiss.ch', phone: '+41791234567', status: 'activ', industry: 'Financial Services' },
    // Fudly restaurants
    { businessLineId: fudly.id, entityType: 'restaurants', companyName: 'La Mama Restaurant', contactPerson: 'Ion Popescu', email: 'ion@lamamarestaurant.ro', phone: '+40724444444', status: 'activ', industry: 'HoReCa' },
    { businessLineId: fudly.id, entityType: 'restaurants', companyName: 'Bistro Central', contactPerson: 'Elena Dumitrescu', email: 'elena@bistrocentral.ro', phone: '+40725555555', status: 'activ', industry: 'HoReCa' },
    { businessLineId: fudly.id, entityType: 'restaurants', companyName: 'Pizza Express Cluj', contactPerson: 'Radu Moldovan', email: 'radu@pizzaexpress.ro', phone: '+40726666666', status: 'prospect', industry: 'HoReCa' },
    // ClimaticPRO
    { businessLineId: climaticpro.id, entityType: 'end_clients', companyName: 'Familia Georgescu', contactPerson: 'Mihai Georgescu', email: 'mihai@gmail.com', phone: '+40727777777', status: 'activ', industry: 'Rezidențial' },
    { businessLineId: climaticpro.id, entityType: 'installers', companyName: 'CoolTech Instalări SRL', contactPerson: 'Vasile Niculescu', email: 'vasile@cooltech.ro', phone: '+40728888888', status: 'activ', industry: 'HVAC' },
    { businessLineId: climaticpro.id, entityType: 'suppliers', companyName: 'Daikin România', contactPerson: 'Cristina Petrescu', email: 'cristina@daikin.ro', phone: '+40729999999', status: 'activ', industry: 'HVAC Manufacturing' },
  ]

  for (const client of clients) {
    await prisma.client.create({ data: client })
  }
  console.log(`  ✅ ${clients.length} clients`)
}

async function seedLeads() {
  console.log('🎯 Seeding Leads...')
  
  const agency = await prisma.businessLine.findUnique({ where: { slug: 'agency' } })
  const fudly = await prisma.businessLine.findUnique({ where: { slug: 'fudly' } })
  
  if (!agency || !fudly) throw new Error('Business lines not found')

  const leads = [
    { businessLineId: agency.id, entityType: 'clients', companyName: 'Digital Craft Studio', contactPerson: 'Ana Stanciu', email: 'ana@digitalcraft.ro', status: 'contactat', source: 'website', value: 3500 },
    { businessLineId: agency.id, entityType: 'clients', companyName: 'Eco Packaging SRL', contactPerson: 'Florin Dragomir', email: 'florin@ecopackaging.ro', status: 'calificat', source: 'linkedin', value: 5000 },
    { businessLineId: agency.id, entityType: 'clients', companyName: 'Smart Home Solutions', contactPerson: 'Diana Radu', email: 'diana@smarthome.ro', status: 'oferta_trimisa', source: 'referral', value: 8000 },
    { businessLineId: agency.id, entityType: 'clients', companyName: 'Nordic Fashion AB', contactPerson: 'Erik Johansson', email: 'erik@nordicfashion.se', status: 'negociere', source: 'google_ads', value: 12000 },
    { businessLineId: agency.id, entityType: 'clients', companyName: 'BioFarm Organic', contactPerson: 'Sorin Vlad', email: 'sorin@biofarm.ro', status: 'contactat', source: 'cold_outreach', value: 2500 },
    { businessLineId: fudly.id, entityType: 'restaurants', companyName: 'Trattoria Napoli', contactPerson: 'Giuseppe Romano', email: 'giuseppe@trattoria.ro', status: 'trial', source: 'website', value: 200 },
    { businessLineId: fudly.id, entityType: 'restaurants', companyName: 'Sushi Master', contactPerson: 'Yuki Tanaka', email: 'yuki@sushimaster.ro', status: 'onboarding', source: 'partner', value: 200 },
  ]

  for (const lead of leads) {
    await prisma.lead.create({ data: lead })
  }
  console.log(`  ✅ ${leads.length} leads`)
}

async function seedProjects() {
  console.log('📋 Seeding Projects...')
  
  const agency = await prisma.businessLine.findUnique({ where: { slug: 'agency' } })
  const fudly = await prisma.businessLine.findUnique({ where: { slug: 'fudly' } })
  
  if (!agency || !fudly) throw new Error('Business lines not found')
  
  const agencyClients = await prisma.client.findMany({ where: { businessLineId: agency.id }, take: 3 })
  const fudlyClients = await prisma.client.findMany({ where: { businessLineId: fudly.id }, take: 1 })

  const projects = [
    {
      businessLineId: agency.id, clientId: agencyClients[0]!.id, templateId: 'seo', name: 'SEO Campaign - QualityControl',
      status: 'in_lucru', currentPhase: 'Implementare On-Page', progress: 45, assignedTo: 'usr-001',
      startDate: new Date('2026-02-01'), dueDate: new Date('2026-08-01'), budget: 4800,
      metadata: { viewType: 'timeline', phases: [
        { name: 'Audit', status: 'completed', completedAt: '2026-02-15' },
        { name: 'Strategie', status: 'completed', completedAt: '2026-03-01' },
        { name: 'Implementare On-Page', status: 'in_progress', completedAt: null },
        { name: 'Off-Page', status: 'pending', completedAt: null },
        { name: 'Monitorizare', status: 'pending', completedAt: null },
      ], kpis: [
        { label: 'Trafic organic', value: '1,200', target: '3,000' },
        { label: 'Keywords top 10', value: '23', target: '50' },
      ]},
    },
    {
      businessLineId: agency.id, clientId: agencyClients[1]!.id, templateId: 'website', name: 'Website Redesign - TechVision',
      status: 'in_lucru', currentPhase: 'Development', progress: 60, assignedTo: 'usr-002',
      startDate: new Date('2026-03-01'), dueDate: new Date('2026-05-30'), budget: 8500,
      metadata: { viewType: 'timeline', phases: [
        { name: 'Discovery', status: 'completed', completedAt: '2026-03-10' },
        { name: 'Design', status: 'completed', completedAt: '2026-03-25' },
        { name: 'Development', status: 'in_progress', completedAt: null },
        { name: 'Testing', status: 'pending', completedAt: null },
        { name: 'Launch', status: 'pending', completedAt: null },
      ]},
    },
    {
      businessLineId: agency.id, clientId: agencyClients[2]!.id, templateId: 'google_ads', name: 'Google Ads - GreenEnergy',
      status: 'in_lucru', currentPhase: 'Optimizare', progress: 70, assignedTo: 'usr-001',
      startDate: new Date('2026-01-15'), dueDate: new Date('2026-12-31'), budget: 12000,
      metadata: { viewType: 'timeline', phases: [
        { name: 'Setup', status: 'completed', completedAt: '2026-01-20' },
        { name: 'Campanii', status: 'completed', completedAt: '2026-02-10' },
        { name: 'Optimizare', status: 'in_progress', completedAt: null },
        { name: 'Raportare', status: 'pending', completedAt: null },
      ]},
    },
    {
      businessLineId: fudly.id, clientId: fudlyClients[0]!.id, templateId: 'onboarding_restaurant', name: 'Onboarding - La Mama',
      status: 'in_lucru', currentPhase: 'Meniu configurat', progress: 50, assignedTo: 'usr-003',
      startDate: new Date('2026-03-20'), dueDate: new Date('2026-04-20'),
      metadata: { viewType: 'checklist', checklist: [
        { item: 'Contract semnat', done: true },
        { item: 'Cont creat', done: true },
        { item: 'Meniu configurat', done: true },
        { item: 'Integrare POS', done: false },
        { item: 'Training echipă', done: false },
        { item: 'Go-live', done: false },
      ]},
    },
  ]

  for (const project of projects) {
    await prisma.project.create({ data: project })
  }
  console.log(`  ✅ ${projects.length} projects`)
}

async function seedUsers() {
  console.log('👤 Seeding Users...')
  const users = [
    { id: 'usr-001', name: 'Adrian Sabău', email: 'adrian@asns.ro', role: 'admin' },
    { id: 'usr-002', name: 'Maria Ionescu', email: 'maria@asns.ro', role: 'manager' },
    { id: 'usr-003', name: 'Andrei Popa', email: 'andrei@asns.ro', role: 'operator' },
  ]
  for (const user of users) {
    await prisma.user.upsert({ where: { id: user.id }, update: user, create: user })
  }
  console.log(`  ✅ ${users.length} users`)
}

async function main() {
  console.log('\n🌱 Starting Agency OS seed...\n')
  
  await seedBusinessLines()
  await seedUsers()
  await seedClients()
  await seedLeads()
  await seedProjects()
  
  console.log('\n✅ Seed complete!\n')
}

main()
  .catch((e) => { console.error('❌ Seed error:', e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })

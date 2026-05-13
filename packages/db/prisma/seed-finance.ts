// packages/db/prisma/seed-finance.ts
// ─── Finance Module Seed ───
// Populates invoices and retainers from mock data

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// ─── Mock invoices data (from packages/mock-data/src/invoices.ts) ───
interface SeedInvoice {
  mockId: string
  businessLine: string
  clientId: string         // mock client ID like 'cli-001'
  number: string
  status: string
  type: string
  direction: string
  amount: number
  currency: string
  issuedDate: string
  dueDate: string
  paidDate?: string
  description: string
  items: { description: string; quantity: number; unitPrice: number }[]
}

const seedInvoices: SeedInvoice[] = [
  {
    mockId: 'inv-001',
    businessLine: 'agency',
    clientId: 'cli-001',
    number: 'FA-2026-001',
    status: 'platita',
    type: 'fiscala',
    direction: 'emisa',
    amount: 3800,
    currency: 'EUR',
    issuedDate: '2026-03-01',
    dueDate: '2026-03-15',
    paidDate: '2026-03-12',
    description: 'Servicii SEO Programmatic + Web Dev — Martie 2026',
    items: [
      { description: 'SEO Programmatic Nordic', quantity: 1, unitPrice: 2200 },
      { description: 'Mentenanță & Updates Website', quantity: 1, unitPrice: 600 },
      { description: 'Google Ads Management', quantity: 1, unitPrice: 1000 },
    ]
  },
  {
    mockId: 'inv-002',
    businessLine: 'agency',
    clientId: 'cli-005',
    number: 'FA-2026-002',
    status: 'platita',
    type: 'fiscala',
    direction: 'emisa',
    amount: 4800,
    currency: 'EUR',
    issuedDate: '2026-03-01',
    dueDate: '2026-03-15',
    paidDate: '2026-03-14',
    description: 'Servicii SEO + Google Ads — Swiss Amanet — Martie 2026',
    items: [
      { description: 'SEO Multilanguage (DE/FR/IT)', quantity: 1, unitPrice: 2800 },
      { description: 'Google Ads Management CH', quantity: 1, unitPrice: 2000 },
    ]
  },
  {
    mockId: 'inv-003',
    businessLine: 'agency',
    clientId: 'cli-006',
    number: 'FA-2026-003',
    status: 'trimisa',
    type: 'fiscala',
    direction: 'emisa',
    amount: 5200,
    currency: 'EUR',
    issuedDate: '2026-04-01',
    dueDate: '2026-04-15',
    description: 'Servicii SEO Programmatic + Ads — NordFinance — Aprilie 2026',
    items: [
      { description: 'SEO Programmatic Daneza', quantity: 1, unitPrice: 3200 },
      { description: 'Google Ads Management DK', quantity: 1, unitPrice: 2000 },
    ]
  },
  {
    mockId: 'inv-004',
    businessLine: 'agency',
    clientId: 'cli-002',
    number: 'FA-2026-004',
    status: 'trimisa',
    type: 'fiscala',
    direction: 'emisa',
    amount: 2400,
    currency: 'EUR',
    issuedDate: '2026-04-01',
    dueDate: '2026-04-15',
    description: 'Servicii SEO Programmatic + Mentenanță — Fudly — Aprilie 2026',
    items: [
      { description: 'SEO Programmatic', quantity: 1, unitPrice: 1800 },
      { description: 'Mentenanță Web', quantity: 1, unitPrice: 600 },
    ]
  },
  {
    mockId: 'inv-005',
    businessLine: 'agency',
    clientId: 'cli-003',
    number: 'FA-2026-005',
    status: 'emisa',
    type: 'proforma',
    direction: 'emisa',
    amount: 1800,
    currency: 'EUR',
    issuedDate: '2026-04-05',
    dueDate: '2026-04-20',
    description: 'Google Ads Management + SEO — ClimaticPRO — Aprilie 2026',
    items: [
      { description: 'Google Ads Management', quantity: 1, unitPrice: 1000 },
      { description: 'SEO On-Page', quantity: 1, unitPrice: 800 },
    ]
  },
  {
    mockId: 'inv-006',
    businessLine: 'agency',
    clientId: 'cli-007',
    number: 'FA-2026-006',
    status: 'restanta',
    type: 'fiscala',
    direction: 'emisa',
    amount: 4500,
    currency: 'EUR',
    issuedDate: '2026-02-01',
    dueDate: '2026-02-15',
    description: 'SEO Programmatic + Mentenanță — Meridian Logistics — Februarie 2026',
    items: [
      { description: 'SEO Programmatic Rute', quantity: 1, unitPrice: 3500 },
      { description: 'Mentenanță Web', quantity: 1, unitPrice: 500 },
      { description: 'Hosting & Suport', quantity: 1, unitPrice: 500 },
    ]
  },
  {
    mockId: 'inv-007',
    businessLine: 'agency',
    clientId: 'cli-008',
    number: 'FA-2026-007',
    status: 'restanta',
    type: 'fiscala',
    direction: 'emisa',
    amount: 2800,
    currency: 'EUR',
    issuedDate: '2026-03-01',
    dueDate: '2026-03-15',
    description: 'SEO Local + Web Dev — Dental Excellence — Martie 2026',
    items: [
      { description: 'SEO Local 3 Clinici', quantity: 1, unitPrice: 1800 },
      { description: 'Web Development Updates', quantity: 1, unitPrice: 1000 },
    ]
  },
  {
    mockId: 'inv-008',
    businessLine: 'agency',
    clientId: 'cli-004',
    number: 'FA-2026-008',
    status: 'platita',
    type: 'fiscala',
    direction: 'emisa',
    amount: 1500,
    currency: 'EUR',
    issuedDate: '2026-03-01',
    dueDate: '2026-03-20',
    paidDate: '2026-03-18',
    description: 'SEO + Web Dev — WertAudit — Martie 2026',
    items: [
      { description: 'SEO On-Page & Technical', quantity: 1, unitPrice: 800 },
      { description: 'Web Development', quantity: 1, unitPrice: 700 },
    ]
  },
]

// ─── Mock retainers data (from packages/mock-data/src/retainers.ts) ───
interface SeedRetainer {
  mockId: string
  businessLine: string
  clientId: string
  serviceName: string
  amount: number
  currency: string
  billingCycle: string
  status: string
  startDate: string
  endDate?: string
}

const seedRetainers: SeedRetainer[] = [
  { mockId: 'ret-002', businessLine: 'agency', clientId: 'cli-002', serviceName: 'SEO Programmatic + Mentenanță', amount: 2400, currency: 'EUR', billingCycle: 'lunar', status: 'activ', startDate: '2025-03-15' },
  { mockId: 'ret-003', businessLine: 'agency', clientId: 'cli-003', serviceName: 'Google Ads + SEO', amount: 1800, currency: 'EUR', billingCycle: 'lunar', status: 'activ', startDate: '2025-09-01' },
  { mockId: 'ret-004', businessLine: 'agency', clientId: 'cli-004', serviceName: 'SEO + Web Development', amount: 1500, currency: 'EUR', billingCycle: 'lunar', status: 'activ', startDate: '2025-06-01' },
  { mockId: 'ret-005', businessLine: 'agency', clientId: 'cli-005', serviceName: 'SEO Multilingv + Google Ads', amount: 4800, currency: 'EUR', billingCycle: 'lunar', status: 'activ', startDate: '2025-02-01' },
  { mockId: 'ret-006', businessLine: 'agency', clientId: 'cli-006', serviceName: 'SEO Programmatic + Google Ads DK', amount: 5200, currency: 'EUR', billingCycle: 'lunar', status: 'activ', startDate: '2025-07-01' },
  { mockId: 'ret-007', businessLine: 'agency', clientId: 'cli-007', serviceName: 'SEO Programmatic + Mentenanță', amount: 4500, currency: 'EUR', billingCycle: 'lunar', status: 'activ', startDate: '2024-11-01' },
  { mockId: 'ret-008', businessLine: 'agency', clientId: 'cli-008', serviceName: 'SEO Local + Web Dev', amount: 2800, currency: 'EUR', billingCycle: 'lunar', status: 'activ', startDate: '2025-06-01' },
  { mockId: 'ret-009', businessLine: 'agency', clientId: 'cli-009', serviceName: 'SEO + Web Development', amount: 2100, currency: 'EUR', billingCycle: 'lunar', status: 'activ', startDate: '2025-04-01' },
  { mockId: 'ret-010', businessLine: 'agency', clientId: 'cli-010', serviceName: 'Web Development', amount: 500, currency: 'EUR', billingCycle: 'lunar', status: 'expirat', startDate: '2024-06-01', endDate: '2025-06-01' },
]

async function main() {
  console.log('🌱 Seeding Finance Module (Invoices + Retainers)...')

  // ── Step 1: Resolve business line slugs → IDs ──
  const businessLines = await prisma.businessLine.findMany({
    select: { id: true, slug: true },
  })
  const blMap = new Map(businessLines.map((bl) => [bl.slug, bl.id]))

  if (businessLines.length === 0) {
    console.error('❌ No business lines found in DB. Seed the business lines first (Module 0).')
    process.exit(1)
  }
  console.log(`  Found ${businessLines.length} business lines: ${businessLines.map(bl => bl.slug).join(', ')}`)

  // ── Step 2: Resolve mock client IDs → real client IDs ──
  // Mock data uses 'cli-001' etc. We need to find real DB clients.
  // The CRM seed stores clients; we'll match by looking up clients in order of creation per BL.
  const clients = await prisma.client.findMany({
    select: { id: true, companyName: true, businessLineId: true },
    orderBy: { createdAt: 'asc' },
  })

  // Build a map of mock client IDs → real client IDs
  // agency clients are created in order: cli-001 → first agency client, cli-002 → second, etc.
  const agencyBLId = blMap.get('agency')
  const agencyClients = clients.filter((c) => c.businessLineId === agencyBLId)
  
  const mockClientMap = new Map<string, string>()
  for (let i = 0; i < agencyClients.length; i++) {
    const mockId = `cli-${String(i + 1).padStart(3, '0')}`
    mockClientMap.set(mockId, agencyClients[i].id)
  }

  console.log(`  Mapped ${mockClientMap.size} mock client IDs to real IDs`)

  // ── Step 3: Clear existing invoices and retainers ──
  const deletedInvoices = await prisma.invoice.deleteMany({})
  const deletedRetainers = await prisma.retainer.deleteMany({})
  console.log(`  Cleared ${deletedInvoices.count} invoices and ${deletedRetainers.count} retainers`)

  // ── Step 4: Insert invoices ──
  let insertedInvoices = 0
  for (const inv of seedInvoices) {
    const businessLineId = blMap.get(inv.businessLine)
    const clientId = mockClientMap.get(inv.clientId)

    if (!businessLineId) {
      console.warn(`  ⚠ Skipping invoice ${inv.number}: businessLine "${inv.businessLine}" not found`)
      continue
    }
    if (!clientId) {
      console.warn(`  ⚠ Skipping invoice ${inv.number}: client "${inv.clientId}" not found (need ${agencyClients.length} agency clients)`)
      continue
    }

    // Compute items with totals
    const items = inv.items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: item.quantity * item.unitPrice,
    }))

    await prisma.invoice.create({
      data: {
        number: inv.number,
        businessLineId,
        clientId,
        type: inv.type,
        direction: inv.direction,
        status: inv.status,
        amount: inv.amount,
        currency: inv.currency,
        issuedAt: new Date(inv.issuedDate),
        dueDate: new Date(inv.dueDate),
        paidAt: inv.paidDate ? new Date(inv.paidDate) : null,
        items,
        notes: inv.description,
      },
    })
    insertedInvoices++
  }
  console.log(`  ✅ Inserted ${insertedInvoices} invoices`)

  // ── Step 5: Insert retainers ──
  let insertedRetainers = 0
  for (const ret of seedRetainers) {
    const businessLineId = blMap.get(ret.businessLine)
    const clientId = mockClientMap.get(ret.clientId)

    if (!businessLineId) {
      console.warn(`  ⚠ Skipping retainer ${ret.mockId}: businessLine "${ret.businessLine}" not found`)
      continue
    }
    if (!clientId) {
      console.warn(`  ⚠ Skipping retainer ${ret.mockId}: client "${ret.clientId}" not found`)
      continue
    }

    await prisma.retainer.create({
      data: {
        clientId,
        businessLineId,
        serviceName: ret.serviceName,
        amount: ret.amount,
        currency: ret.currency,
        billingCycle: ret.billingCycle,
        status: ret.status,
        startDate: new Date(ret.startDate),
        endDate: ret.endDate ? new Date(ret.endDate) : null,
      },
    })
    insertedRetainers++
  }
  console.log(`  ✅ Inserted ${insertedRetainers} retainers`)

  console.log('🌱 Finance Module seed complete!')
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

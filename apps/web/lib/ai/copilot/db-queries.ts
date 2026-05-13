// ─── AI Copilot — Prisma DB Queries (Phase 2) ───
// Centralized data-access layer for Copilot tools.
// Each function returns a compressed summary string (JSON) optimized for LLM context.

import { db } from '@repo/db'

// ────────────────────────────────────────────
// Helper: resolve business line slug → id
// ────────────────────────────────────────────

async function resolveBusinessLine(slug?: string): Promise<string | undefined> {
  if (!slug || slug === 'all') return undefined
  const bl = await db.businessLine.findUnique({ where: { slug } })
  return bl?.id
}

// ────────────────────────────────────────────
// Dashboard Stats
// ────────────────────────────────────────────

export async function queryDashboardStats(businessLine?: string) {
  const blId = await resolveBusinessLine(businessLine)
  const blFilter = blId ? { businessLineId: blId } : {}

  // Parallel queries
  const [
    totalClients,
    activeProjects,
    openLeads,
    activeRetainers,
    overdueInvoices,
    allBusinessLines,
  ] = await Promise.all([
    db.client.count({ where: { status: 'activ', ...blFilter } }),
    db.project.count({ where: { status: { in: ['in_lucru', 'planificare'] }, ...blFilter } }),
    db.lead.count({ where: { status: { notIn: ['convertit', 'pierdut'] }, deletedAt: null, ...blFilter } }),
    db.retainer.findMany({
      where: { status: 'activ', ...blFilter },
      select: { amount: true, billingCycle: true, businessLineId: true },
    }),
    db.invoice.findMany({
      where: { status: 'restanta', ...blFilter },
      select: { amount: true },
    }),
    db.businessLine.findMany({ select: { id: true, slug: true, name: true } }),
  ])

  // Calculate MRR
  let totalMRR = 0
  const mrrByBL: Record<string, number> = {}
  for (const ret of activeRetainers) {
    const monthly = ret.billingCycle === 'trimestrial' ? ret.amount / 3 : ret.amount
    totalMRR += monthly
    const blSlug = allBusinessLines.find((bl) => bl.id === ret.businessLineId)?.slug || 'unknown'
    mrrByBL[blSlug] = (mrrByBL[blSlug] || 0) + monthly
  }

  const overdueAmount = overdueInvoices.reduce((s, i) => s + i.amount, 0)

  // Revenue this month
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

  const monthInvoices = await db.invoice.findMany({
    where: {
      issuedAt: { gte: startOfMonth, lte: endOfMonth },
      direction: 'emisa',
      status: { not: 'anulata' },
      ...blFilter,
    },
    select: { amount: true, businessLineId: true },
  })

  let monthlyRevenue = 0
  const revenueByBL: Record<string, number> = {}
  for (const inv of monthInvoices) {
    monthlyRevenue += inv.amount
    const slug = allBusinessLines.find((bl) => bl.id === inv.businessLineId)?.slug || 'unknown'
    revenueByBL[slug] = (revenueByBL[slug] || 0) + inv.amount
  }

  // Conversion rate from leads
  const [convertedLeads, totalLeadsEver] = await Promise.all([
    db.lead.count({ where: { convertedToId: { not: null }, ...blFilter } }),
    db.lead.count({ where: blFilter }),
  ])
  const conversionRate = totalLeadsEver > 0 ? Math.round((convertedLeads / totalLeadsEver) * 10000) / 100 : 0

  return {
    totalClients,
    activeProjects,
    mrr: Math.round(totalMRR * 100) / 100,
    mrrByBL,
    monthlyRevenue: Math.round(monthlyRevenue * 100) / 100,
    revenueByBL,
    openLeads,
    conversionRate,
    overdueCount: overdueInvoices.length,
    overdueAmount: Math.round(overdueAmount * 100) / 100,
  }
}

// ────────────────────────────────────────────
// Clients
// ────────────────────────────────────────────

export async function queryClients(businessLine?: string, status?: string) {
  const blId = await resolveBusinessLine(businessLine)
  const where: Record<string, unknown> = {}
  if (blId) where.businessLineId = blId
  if (status && status !== 'all') where.status = status

  const [clients, total] = await Promise.all([
    db.client.findMany({
      where: where as any,
      include: {
        businessLine: { select: { slug: true, name: true } },
        _count: { select: { projects: true, invoices: true, offers: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 15,
    }),
    db.client.count({ where: where as any }),
  ])

  const byStatus = {
    activ: await db.client.count({ where: { ...where, status: 'activ' } as any }),
    inactiv: await db.client.count({ where: { ...where, status: 'inactiv' } as any }),
    prospect: await db.client.count({ where: { ...where, status: 'prospect' } as any }),
  }

  return {
    total,
    byStatus,
    clients: clients.map((c) => ({
      id: c.id,
      name: c.companyName,
      contact: c.contactPerson,
      email: c.email,
      status: c.status,
      businessLine: c.businessLine.slug,
      projects: c._count.projects,
      invoices: c._count.invoices,
      offers: c._count.offers,
    })),
  }
}

// ────────────────────────────────────────────
// Leads
// ────────────────────────────────────────────

export async function queryLeads(businessLine?: string, minProbability?: number) {
  const blId = await resolveBusinessLine(businessLine)
  const where: Record<string, unknown> = { deletedAt: null }
  if (blId) where.businessLineId = blId
  if (minProbability) where.probability = { gte: minProbability }

  const [leads, total] = await Promise.all([
    db.lead.findMany({
      where: where as any,
      include: {
        businessLine: { select: { slug: true } },
      },
      orderBy: { probability: 'desc' },
      take: 15,
    }),
    db.lead.count({ where: where as any }),
  ])

  const totalValue = leads.reduce((s, l) => s + (l.value || 0), 0)
  const hot = leads.filter((l) => (l.probability || 0) >= 70)

  return {
    total,
    pipelineValue: totalValue,
    hotCount: hot.length,
    leads: leads.map((l) => ({
      id: l.id,
      name: l.companyName,
      contact: l.contactPerson,
      value: l.value || 0,
      probability: l.probability || 0,
      status: l.status,
      source: l.source,
      businessLine: l.businessLine.slug,
      city: l.city,
    })),
  }
}

// ────────────────────────────────────────────
// Projects
// ────────────────────────────────────────────

export async function queryProjects(status?: string) {
  const where: Record<string, unknown> = {}
  if (status && status !== 'all') where.status = status

  const [projects, total] = await Promise.all([
    db.project.findMany({
      where: where as any,
      include: {
        client: { select: { companyName: true } },
        businessLine: { select: { slug: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 15,
    }),
    db.project.count({ where: where as any }),
  ])

  const avgProgress = projects.length > 0
    ? Math.round(projects.reduce((s, p) => s + p.progress, 0) / projects.length)
    : 0

  const byStatus = {
    in_lucru: await db.project.count({ where: { status: 'in_lucru' } }),
    planificare: await db.project.count({ where: { status: 'planificare' } }),
    finalizat: await db.project.count({ where: { status: 'finalizat' } }),
    in_asteptare: await db.project.count({ where: { status: 'in_asteptare' } }),
  }

  return {
    total,
    avgProgress,
    byStatus,
    projects: projects.map((p) => ({
      id: p.id,
      name: p.name,
      client: p.client.companyName,
      status: p.status,
      progress: p.progress,
      deadline: p.dueDate?.toISOString().slice(0, 10) || null,
      businessLine: p.businessLine.slug,
    })),
  }
}

// ────────────────────────────────────────────
// Offers
// ────────────────────────────────────────────

const ACTIVE_OFFER_STATUSES = ['draft', 'trimisa', 'vizualizata']

export async function queryOffers(status?: string) {
  const where: Record<string, unknown> = {}
  if (status === 'active') {
    where.status = { in: ACTIVE_OFFER_STATUSES }
  } else if (status && status !== 'all') {
    where.status = status
  }

  const [offers, total] = await Promise.all([
    db.offer.findMany({
      where: where as any,
      include: {
        client: { select: { companyName: true } },
        businessLine: { select: { slug: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 15,
    }),
    db.offer.count({ where: where as any }),
  ])

  const totalValue = offers.reduce((s, o) => s + o.value, 0)

  const byStatus = {
    draft: await db.offer.count({ where: { status: 'draft' } }),
    trimisa: await db.offer.count({ where: { status: 'trimisa' } }),
    vizualizata: await db.offer.count({ where: { status: 'vizualizata' } }),
    acceptata: await db.offer.count({ where: { status: 'acceptata' } }),
    respinsa: await db.offer.count({ where: { status: 'respinsa' } }),
  }

  return {
    total,
    totalValue,
    byStatus,
    offers: offers.map((o) => ({
      id: o.id,
      number: o.number,
      client: o.client?.companyName || o.entityName,
      value: o.value,
      currency: o.currency,
      status: o.status,
      businessLine: o.businessLine.slug,
    })),
  }
}

// ────────────────────────────────────────────
// Invoices
// ────────────────────────────────────────────

export async function queryInvoices(status?: string) {
  // Auto-detect overdue
  await db.invoice.updateMany({
    where: {
      status: { in: ['emisa', 'trimisa'] },
      dueDate: { lt: new Date() },
      paidAt: null,
    },
    data: { status: 'restanta' },
  })

  const where: Record<string, unknown> = {}
  if (status && status !== 'all') where.status = status

  const [invoices, total] = await Promise.all([
    db.invoice.findMany({
      where: where as any,
      include: {
        client: { select: { companyName: true } },
        businessLine: { select: { slug: true } },
      },
      orderBy: { issuedAt: 'desc' },
      take: 15,
    }),
    db.invoice.count({ where: where as any }),
  ])

  const totalAmount = invoices.reduce((s, i) => s + i.amount, 0)

  // Overdue stats always
  const overdueInvoices = await db.invoice.findMany({
    where: { status: 'restanta' },
    select: { amount: true },
  })
  const overdueAmount = overdueInvoices.reduce((s, i) => s + i.amount, 0)

  return {
    total,
    totalAmount: Math.round(totalAmount * 100) / 100,
    overdueCount: overdueInvoices.length,
    overdueAmount: Math.round(overdueAmount * 100) / 100,
    invoices: invoices.map((i) => ({
      id: i.id,
      number: i.number,
      client: i.client.companyName,
      amount: i.amount,
      currency: i.currency,
      status: i.status,
      direction: i.direction,
      dueDate: i.dueDate.toISOString().slice(0, 10),
      businessLine: i.businessLine.slug,
    })),
  }
}

// ────────────────────────────────────────────
// Revenue History (last 6 months)
// ────────────────────────────────────────────

export async function queryRevenueHistory() {
  const now = new Date()
  const months: { month: string; start: Date; end: Date }[] = []

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const start = new Date(d.getFullYear(), d.getMonth(), 1)
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
    const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    months.push({ month: monthStr, start, end })
  }

  const allBLs = await db.businessLine.findMany({ select: { id: true, slug: true } })
  const blMap = new Map(allBLs.map((bl) => [bl.id, bl.slug]))

  const firstMonth = months[0]!
  const lastMonth = months[months.length - 1]!

  const invoices = await db.invoice.findMany({
    where: {
      issuedAt: { gte: firstMonth.start, lte: lastMonth.end },
      status: { not: 'anulata' },
    },
    select: { businessLineId: true, direction: true, amount: true, issuedAt: true },
  })

  const result = months.map(({ month, start, end }) => {
    const monthInv = invoices.filter((inv) => inv.issuedAt >= start && inv.issuedAt <= end)
    let income = 0
    let expense = 0
    const byBL: Record<string, number> = {}

    for (const inv of monthInv) {
      const slug = blMap.get(inv.businessLineId) || 'unknown'
      if (inv.direction === 'emisa') {
        income += inv.amount
        byBL[slug] = (byBL[slug] || 0) + inv.amount
      } else {
        expense += inv.amount
      }
    }

    return { month, income: Math.round(income * 100) / 100, expense: Math.round(expense * 100) / 100, profit: Math.round((income - expense) * 100) / 100, byBL }
  })

  // Trend calculation
  const latest = result[result.length - 1]!
  const previous = result[result.length - 2]!
  const growthPercent = previous.income > 0
    ? Math.round(((latest.income - previous.income) / previous.income) * 100)
    : 0

  return { months: result, trend: { growthPercent, latestMonth: latest.month, latestIncome: latest.income } }
}

// ────────────────────────────────────────────
// Marketing Stats
// ────────────────────────────────────────────

export async function queryMarketingStats(businessLine: string) {
  const blId = await resolveBusinessLine(businessLine)
  if (!blId) return { error: 'Business line not found' }

  const [
    totalContacts,
    totalSegments,
    totalTemplates,
    totalCampaigns,
    activeCampaigns,
    campaigns,
  ] = await Promise.all([
    db.lead.count({ where: { businessLineId: blId, optOut: false, deletedAt: null } }),
    db.marketingSegment.count({ where: { businessLineId: blId } }),
    db.marketingTemplate.count({ where: { businessLineId: blId } }),
    db.marketingCampaign.count({ where: { businessLineId: blId } }),
    db.marketingCampaign.count({ where: { businessLineId: blId, status: { in: ['running', 'scheduled'] } } }),
    db.marketingCampaign.findMany({
      where: { businessLineId: blId },
      select: {
        id: true, name: true, channel: true, status: true,
        totalLeads: true, totalSent: true, totalOpened: true, totalConverted: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ])

  const totalSent = campaigns.reduce((s, c) => s + c.totalSent, 0)
  const totalOpened = campaigns.reduce((s, c) => s + c.totalOpened, 0)
  const totalConverted = campaigns.reduce((s, c) => s + c.totalConverted, 0)
  const openRate = totalSent > 0 ? Math.round((totalOpened / totalSent) * 1000) / 10 : 0
  const convRate = totalOpened > 0 ? Math.round((totalConverted / totalOpened) * 1000) / 10 : 0

  return {
    totalContacts,
    totalSegments,
    totalTemplates,
    totalCampaigns,
    activeCampaigns,
    openRate,
    conversionRate: convRate,
    recentCampaigns: campaigns.map((c) => ({
      name: c.name,
      channel: c.channel,
      status: c.status,
      sent: c.totalSent,
      opened: c.totalOpened,
      converted: c.totalConverted,
    })),
  }
}

// ────────────────────────────────────────────
// Search Entity (cross-model text search)
// ────────────────────────────────────────────

export async function searchEntity(query: string, entityType?: string) {
  const searchTerm = query.trim()
  if (!searchTerm) return { results: [] }

  const results: { type: string; id: string; name: string; detail: string; path: string }[] = []

  // Search clients
  if (!entityType || entityType === 'client') {
    const clients = await db.client.findMany({
      where: {
        OR: [
          { companyName: { contains: searchTerm, mode: 'insensitive' } },
          { contactPerson: { contains: searchTerm, mode: 'insensitive' } },
          { email: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
      select: { id: true, companyName: true, status: true, contactPerson: true },
      take: 5,
    })
    for (const c of clients) {
      results.push({ type: 'client', id: c.id, name: c.companyName, detail: `${c.contactPerson} — ${c.status}`, path: `/crm/clienti/${c.id}` })
    }
  }

  // Search leads
  if (!entityType || entityType === 'lead') {
    const leads = await db.lead.findMany({
      where: {
        deletedAt: null,
        OR: [
          { companyName: { contains: searchTerm, mode: 'insensitive' } },
          { contactPerson: { contains: searchTerm, mode: 'insensitive' } },
          { email: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
      select: { id: true, companyName: true, status: true, probability: true },
      take: 5,
    })
    for (const l of leads) {
      results.push({ type: 'lead', id: l.id, name: l.companyName, detail: `${l.status} — ${l.probability || 0}%`, path: `/crm/lead-uri/${l.id}` })
    }
  }

  // Search projects
  if (!entityType || entityType === 'project') {
    const projects = await db.project.findMany({
      where: {
        OR: [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { client: { companyName: { contains: searchTerm, mode: 'insensitive' } } },
        ],
      },
      include: { client: { select: { companyName: true } } },
      take: 5,
    })
    for (const p of projects) {
      results.push({ type: 'project', id: p.id, name: p.name, detail: `${p.client.companyName} — ${p.status}`, path: `/projects/${p.id}` })
    }
  }

  // Search offers
  if (!entityType || entityType === 'offer') {
    const offers = await db.offer.findMany({
      where: {
        OR: [
          { number: { contains: searchTerm, mode: 'insensitive' } },
          { entityName: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
      select: { id: true, number: true, entityName: true, status: true, value: true },
      take: 5,
    })
    for (const o of offers) {
      results.push({ type: 'offer', id: o.id, name: o.number, detail: `${o.entityName} — ${o.status} — ${o.value}`, path: `/offers/${o.id}` })
    }
  }

  return { query: searchTerm, resultCount: results.length, results }
}

// ────────────────────────────────────────────
// Update Lead Status (write operation)
// ────────────────────────────────────────────

export async function updateLeadStatus(leadId: string, newStatus: string) {
  const lead = await db.lead.findUnique({
    where: { id: leadId },
    select: { id: true, companyName: true, status: true, businessLineId: true },
  })

  if (!lead) return { error: `Lead-ul cu ID "${leadId}" nu a fost găsit.` }

  const oldStatus = lead.status
  if (oldStatus === newStatus) {
    return { message: `Lead-ul "${lead.companyName}" este deja în statusul "${newStatus}".`, unchanged: true }
  }

  await db.lead.update({
    where: { id: leadId },
    data: { status: newStatus },
  })

  // Activity log
  await db.activity.create({
    data: {
      businessLineId: lead.businessLineId,
      userId: 'ai-copilot',
      userName: 'AI Copilot',
      action: 'status_changed',
      entityType: 'lead',
      entityId: lead.id,
      entityName: lead.companyName,
      leadId: lead.id,
      details: { oldStatus, newStatus } as any,
    },
  })

  return {
    success: true,
    leadName: lead.companyName,
    oldStatus,
    newStatus,
    message: `Statusul lead-ului "${lead.companyName}" a fost schimbat din "${oldStatus}" în "${newStatus}".`,
  }
}

// ────────────────────────────────────────────
// Generate Summary Report
// ────────────────────────────────────────────

export async function generateSummaryReport(scope?: string) {
  // Gather all key metrics
  const stats = await queryDashboardStats(scope && scope !== 'all' ? scope : undefined)
  const revenueData = await queryRevenueHistory()
  const overdueData = await queryInvoices('restanta')

  // Active offers pipeline
  const offersData = await queryOffers('active')

  // Hot leads
  const hotLeads = await queryLeads(undefined, 70)

  return {
    title: `Raport Executiv — ${new Date().toLocaleDateString('ro-RO', { year: 'numeric', month: 'long', day: 'numeric' })}`,
    scope: scope || 'all',
    kpis: {
      clientiActivi: stats.totalClients,
      proiecteActive: stats.activeProjects,
      mrr: stats.mrr,
      venitLunar: stats.monthlyRevenue,
      leaduriDeschise: stats.openLeads,
      rataConversie: stats.conversionRate,
    },
    alerte: {
      facturiRestante: {
        count: overdueData.overdueCount,
        total: overdueData.overdueAmount,
        topFacturi: overdueData.invoices.slice(0, 3),
      },
      leaduriFierbinti: {
        count: hotLeads.hotCount,
        topLeads: hotLeads.leads.slice(0, 3),
      },
      oferteActive: {
        count: offersData.total,
        valoare: offersData.totalValue,
      },
    },
    trendVenituri: revenueData.trend,
  }
}

// ════════════════════════════════════════════
// Phase 4 — CRUD Operations
// ════════════════════════════════════════════

// Helper: log activity for AI actions
async function logActivity(data: {
  businessLineId: string
  action: string
  entityType: string
  entityId: string
  entityName: string
  details?: Record<string, unknown>
  leadId?: string
  clientId?: string
  projectId?: string
  offerId?: string
  contractId?: string
}) {
  await db.activity.create({
    data: {
      ...data,
      userId: 'ai-copilot',
      userName: 'AI Copilot',
      details: data.details as any,
    },
  })
}

// ── Client CRUD ──

export async function createClient(data: {
  companyName: string; contactPerson: string; email: string; businessLine: string
  phone?: string; website?: string; status?: string; entityType?: string; notes?: string
}) {
  const blId = await resolveBusinessLine(data.businessLine)
  if (!blId) return { error: `Business line "${data.businessLine}" nu există. Opțiuni: agency, fudly, climaticpro` }

  const bl = await db.businessLine.findUnique({ where: { id: blId }, select: { config: true } })
  const config = bl?.config as Record<string, unknown> | null
  const entityTypes = config?.entityTypes as Array<{ id: string }> | undefined
  const entityType = data.entityType || entityTypes?.[0]?.id || 'clients'

  const client = await db.client.create({
    data: {
      businessLineId: blId,
      entityType,
      companyName: data.companyName,
      contactPerson: data.contactPerson,
      email: data.email,
      phone: data.phone || null,
      website: data.website || null,
      status: data.status || 'prospect',
      notes: data.notes || null,
    },
  })

  await logActivity({ businessLineId: blId, action: 'created', entityType: 'client', entityId: client.id, entityName: client.companyName, clientId: client.id })

  return { success: true, id: client.id, name: client.companyName, status: client.status, message: `Clientul "${client.companyName}" a fost creat cu succes.` }
}

export async function updateClient(clientId: string, field: string, value: string) {
  const client = await db.client.findUnique({ where: { id: clientId }, select: { id: true, companyName: true, businessLineId: true } })
  if (!client) return { error: `Clientul cu ID "${clientId}" nu a fost găsit.` }

  const allowedFields = ['status', 'contactPerson', 'email', 'phone', 'website', 'notes', 'companyName', 'industry', 'address']
  if (!allowedFields.includes(field)) return { error: `Câmpul "${field}" nu poate fi actualizat. Câmpuri permise: ${allowedFields.join(', ')}` }

  const oldValue = (client as any)[field]
  await db.client.update({ where: { id: clientId }, data: { [field]: value } })
  await logActivity({ businessLineId: client.businessLineId, action: 'updated', entityType: 'client', entityId: client.id, entityName: client.companyName, clientId: client.id, details: { field, oldValue, newValue: value } })

  return { success: true, name: client.companyName, field, oldValue, newValue: value, message: `Câmpul "${field}" al clientului "${client.companyName}" a fost actualizat la "${value}".` }
}

export async function deleteClient(clientId: string) {
  const client = await db.client.findUnique({ where: { id: clientId }, select: { id: true, companyName: true, businessLineId: true, _count: { select: { projects: true, invoices: true } } } })
  if (!client) return { error: `Clientul cu ID "${clientId}" nu a fost găsit.` }
  if (client._count.projects > 0 || client._count.invoices > 0) return { error: `Clientul "${client.companyName}" nu poate fi șters — are ${client._count.projects} proiecte și ${client._count.invoices} facturi asociate.` }

  await db.client.update({ where: { id: clientId }, data: { deletedAt: new Date(), status: 'inactiv' } })
  await logActivity({ businessLineId: client.businessLineId, action: 'deleted', entityType: 'client', entityId: client.id, entityName: client.companyName, clientId: client.id })

  return { success: true, name: client.companyName, message: `Clientul "${client.companyName}" a fost dezactivat (soft delete).` }
}

// ── Lead CRUD ──

export async function createLead(data: {
  companyName: string; contactPerson: string; email: string; businessLine: string
  source?: string; value?: number; probability?: number; phone?: string; notes?: string; priority?: string; city?: string
}) {
  const blId = await resolveBusinessLine(data.businessLine)
  if (!blId) return { error: `Business line "${data.businessLine}" nu există.` }

  const bl = await db.businessLine.findUnique({ where: { id: blId }, select: { config: true } })
  const config = bl?.config as Record<string, unknown> | null
  const entityTypes = config?.entityTypes as Array<{ id: string }> | undefined
  const entityType = entityTypes?.[0]?.id || 'clients'

  const lead = await db.lead.create({
    data: {
      businessLineId: blId,
      entityType,
      companyName: data.companyName,
      contactPerson: data.contactPerson,
      email: data.email,
      phone: data.phone || null,
      source: data.source || 'manual',
      value: data.value || 0,
      probability: data.probability || 10,
      priority: data.priority || 'medium',
      status: 'nou',
      notes: data.notes || null,
      city: data.city || null,
    },
  })

  await logActivity({ businessLineId: blId, action: 'created', entityType: 'lead', entityId: lead.id, entityName: lead.companyName, leadId: lead.id })

  return { success: true, id: lead.id, name: lead.companyName, message: `Lead-ul "${lead.companyName}" a fost creat cu succes.` }
}

export async function updateLead(leadId: string, field: string, value: string | number) {
  const lead = await db.lead.findUnique({ where: { id: leadId }, select: { id: true, companyName: true, businessLineId: true } })
  if (!lead) return { error: `Lead-ul cu ID "${leadId}" nu a fost găsit.` }

  const allowedFields = ['status', 'probability', 'priority', 'value', 'notes', 'contactPerson', 'email', 'phone', 'source', 'nextAction', 'assignedTo', 'city']
  if (!allowedFields.includes(field)) return { error: `Câmpul "${field}" nu poate fi actualizat. Permise: ${allowedFields.join(', ')}` }

  const numericFields = ['probability', 'value']
  const finalValue = numericFields.includes(field) ? Number(value) : value

  await db.lead.update({ where: { id: leadId }, data: { [field]: finalValue } })
  await logActivity({ businessLineId: lead.businessLineId, action: 'updated', entityType: 'lead', entityId: lead.id, entityName: lead.companyName, leadId: lead.id, details: { field, newValue: finalValue } })

  return { success: true, name: lead.companyName, field, newValue: finalValue, message: `Câmpul "${field}" al lead-ului "${lead.companyName}" a fost actualizat.` }
}

export async function deleteLead(leadId: string) {
  const lead = await db.lead.findUnique({ where: { id: leadId }, select: { id: true, companyName: true, businessLineId: true, convertedToId: true } })
  if (!lead) return { error: `Lead-ul cu ID "${leadId}" nu a fost găsit.` }
  if (lead.convertedToId) return { error: `Lead-ul "${lead.companyName}" nu poate fi șters — a fost deja convertit în client.` }

  await db.lead.update({ where: { id: leadId }, data: { deletedAt: new Date() } })
  await logActivity({ businessLineId: lead.businessLineId, action: 'deleted', entityType: 'lead', entityId: lead.id, entityName: lead.companyName, leadId: lead.id })

  return { success: true, name: lead.companyName, message: `Lead-ul "${lead.companyName}" a fost șters (soft delete).` }
}

// ── Project CRUD ──

export async function createProject(data: {
  name: string; clientId: string; businessLine: string
  budget?: number; dueDate?: string; notes?: string
}) {
  const blId = await resolveBusinessLine(data.businessLine)
  if (!blId) return { error: `Business line "${data.businessLine}" nu există.` }

  const client = await db.client.findUnique({ where: { id: data.clientId }, select: { id: true, companyName: true } })
  if (!client) return { error: `Clientul cu ID "${data.clientId}" nu a fost găsit. Caută-l cu search_entity.` }

  // Get first template from BL config
  const bl = await db.businessLine.findUnique({ where: { id: blId }, select: { config: true } })
  const config = bl?.config as Record<string, unknown> | null
  const templates = config?.projectTemplates as Array<{ id: string; name: string }> | undefined
  const template = templates?.[0]

  const project = await db.project.create({
    data: {
      businessLineId: blId,
      clientId: client.id,
      templateId: template?.id || 'default',
      name: data.name,
      status: 'planificare',
      progress: 0,
      budget: data.budget || null,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      notes: data.notes || null,
    },
  })

  await logActivity({ businessLineId: blId, action: 'created', entityType: 'project', entityId: project.id, entityName: project.name, projectId: project.id, clientId: client.id })

  return { success: true, id: project.id, name: project.name, client: client.companyName, message: `Proiectul "${project.name}" pentru ${client.companyName} a fost creat.` }
}

export async function updateProject(projectId: string, field: string, value: string | number) {
  const project = await db.project.findUnique({ where: { id: projectId }, select: { id: true, name: true, businessLineId: true, clientId: true } })
  if (!project) return { error: `Proiectul cu ID "${projectId}" nu a fost găsit.` }

  const allowedFields = ['status', 'progress', 'currentPhase', 'notes', 'name', 'assignedTo']
  if (!allowedFields.includes(field)) return { error: `Câmpul "${field}" nu poate fi actualizat. Permise: ${allowedFields.join(', ')}` }

  const numericFields = ['progress']
  let finalValue: string | number | Date = numericFields.includes(field) ? Number(value) : value
  if (field === 'dueDate') finalValue = new Date(value as string)

  await db.project.update({ where: { id: projectId }, data: { [field]: finalValue } })
  await logActivity({ businessLineId: project.businessLineId, action: 'updated', entityType: 'project', entityId: project.id, entityName: project.name, projectId: project.id, clientId: project.clientId, details: { field, newValue: finalValue } })

  return { success: true, name: project.name, field, newValue: finalValue, message: `Câmpul "${field}" al proiectului "${project.name}" a fost actualizat.` }
}

// ── Invoice CRUD ──

async function generateInvoiceNumber(direction: string): Promise<string> {
  const prefix = direction === 'emisa' ? 'FA' : 'FP'
  const year = new Date().getFullYear()
  const pattern = `${prefix}-${year}`
  const last = await db.invoice.findFirst({ where: { number: { startsWith: pattern } }, orderBy: { number: 'desc' } })
  const seq = last ? parseInt(last.number.split('-')[2]!) + 1 : 1
  return `${prefix}-${year}-${String(seq).padStart(3, '0')}`
}

export async function createInvoice(data: {
  clientId: string; businessLine: string; amount: number; dueDate: string
  type?: string; direction?: string; currency?: string; notes?: string
  items?: { description: string; quantity: number; unitPrice: number; total: number }[]
}) {
  const blId = await resolveBusinessLine(data.businessLine)
  if (!blId) return { error: `Business line "${data.businessLine}" nu există.` }

  const client = await db.client.findUnique({ where: { id: data.clientId }, select: { id: true, companyName: true } })
  if (!client) return { error: `Clientul cu ID "${data.clientId}" nu a fost găsit.` }

  const direction = data.direction || 'emisa'
  const number = await generateInvoiceNumber(direction)

  const invoice = await db.invoice.create({
    data: {
      number,
      businessLineId: blId,
      clientId: client.id,
      type: data.type || 'fiscala',
      direction,
      status: 'emisa',
      amount: data.amount,
      currency: data.currency || 'EUR',
      dueDate: new Date(data.dueDate),
      items: (data.items || [{ description: 'Servicii conform contract', quantity: 1, unitPrice: data.amount, total: data.amount }]) as any,
      notes: data.notes || null,
    },
  })

  await logActivity({ businessLineId: blId, action: 'created', entityType: 'invoice', entityId: invoice.id, entityName: invoice.number, clientId: client.id })

  return { success: true, id: invoice.id, number: invoice.number, client: client.companyName, amount: invoice.amount, message: `Factura ${invoice.number} (${invoice.amount} ${invoice.currency}) pentru ${client.companyName} a fost creată.` }
}

export async function updateInvoiceStatus(invoiceId: string, newStatus: string) {
  const invoice = await db.invoice.findUnique({ where: { id: invoiceId }, select: { id: true, number: true, status: true, businessLineId: true, clientId: true } })
  if (!invoice) return { error: `Factura cu ID "${invoiceId}" nu a fost găsită.` }

  const validStatuses = ['emisa', 'trimisa', 'platita', 'restanta', 'anulata']
  if (!validStatuses.includes(newStatus)) return { error: `Status invalid. Opțiuni: ${validStatuses.join(', ')}` }

  const oldStatus = invoice.status
  const updateData: Record<string, unknown> = { status: newStatus }
  if (newStatus === 'platita') updateData.paidAt = new Date()

  await db.invoice.update({ where: { id: invoiceId }, data: updateData })
  await logActivity({ businessLineId: invoice.businessLineId, action: 'status_changed', entityType: 'invoice', entityId: invoice.id, entityName: invoice.number, clientId: invoice.clientId, details: { oldStatus, newStatus } })

  return { success: true, number: invoice.number, oldStatus, newStatus, message: `Statusul facturii ${invoice.number} a fost schimbat din "${oldStatus}" în "${newStatus}".` }
}

// ── Offer CRUD ──

async function generateOfferNumber(): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `OF-${year}`
  const last = await db.offer.findFirst({ where: { number: { startsWith: prefix } }, orderBy: { number: 'desc' } })
  const seq = last ? parseInt(last.number.split('-')[2]!) + 1 : 1
  return `${prefix}-${String(seq).padStart(3, '0')}`
}

export async function createOffer(data: {
  clientId: string; businessLine: string; value: number; serviceName: string
  currency?: string; validDays?: number; notes?: string
}) {
  const blId = await resolveBusinessLine(data.businessLine)
  if (!blId) return { error: `Business line "${data.businessLine}" nu există.` }

  const client = await db.client.findUnique({ where: { id: data.clientId }, select: { id: true, companyName: true, entityType: true } })
  if (!client) return { error: `Clientul cu ID "${data.clientId}" nu a fost găsit.` }

  // Get first offer template
  const bl = await db.businessLine.findUnique({ where: { id: blId }, select: { config: true } })
  const config = bl?.config as Record<string, unknown> | null
  const offerTemplates = config?.offerTemplates as Array<{ id: string; name: string }> | undefined
  const template = offerTemplates?.[0]

  const number = await generateOfferNumber()
  const validUntil = new Date()
  validUntil.setDate(validUntil.getDate() + (data.validDays || 30))

  const offer = await db.offer.create({
    data: {
      number,
      businessLineId: blId,
      entityType: client.entityType || 'clients',
      clientId: client.id,
      entityName: client.companyName,
      templateId: template?.id || 'default',
      templateName: template?.name || 'Default',
      status: 'draft',
      value: data.value,
      currency: data.currency || 'EUR',
      validUntil,
      blocks: [{ type: 'pricing', title: data.serviceName, items: [{ name: data.serviceName, price: data.value }] }] as any,
      createdBy: 'ai-copilot',
    },
  })

  await logActivity({ businessLineId: blId, action: 'created', entityType: 'offer', entityId: offer.id, entityName: offer.number, offerId: offer.id, clientId: client.id })

  return { success: true, id: offer.id, number: offer.number, client: client.companyName, value: offer.value, message: `Oferta ${offer.number} (${offer.value} ${offer.currency}) pentru ${client.companyName} a fost creată ca draft.` }
}

export async function updateOfferStatus(offerId: string, newStatus: string) {
  const offer = await db.offer.findUnique({ where: { id: offerId }, select: { id: true, number: true, status: true, businessLineId: true, clientId: true } })
  if (!offer) return { error: `Oferta cu ID "${offerId}" nu a fost găsită.` }

  const validStatuses = ['draft', 'trimisa', 'vizualizata', 'acceptata', 'respinsa', 'expirata']
  if (!validStatuses.includes(newStatus)) return { error: `Status invalid. Opțiuni: ${validStatuses.join(', ')}` }

  const oldStatus = offer.status
  await db.offer.update({ where: { id: offerId }, data: { status: newStatus } })
  await logActivity({ businessLineId: offer.businessLineId, action: 'status_changed', entityType: 'offer', entityId: offer.id, entityName: offer.number, offerId: offer.id, clientId: offer.clientId || undefined, details: { oldStatus, newStatus } })

  return { success: true, number: offer.number, oldStatus, newStatus, message: `Statusul ofertei ${offer.number} a fost schimbat din "${oldStatus}" în "${newStatus}".` }
}

// ── Campaign CRUD ──

export async function createCampaign(data: {
  name: string; businessLine: string; channel: string; segmentId?: string; templateId: string
  scheduledAt?: string
}) {
  const blId = await resolveBusinessLine(data.businessLine)
  if (!blId) return { error: `Business line "${data.businessLine}" nu există.` }

  // Validate template exists
  const template = await db.marketingTemplate.findUnique({ where: { id: data.templateId }, select: { id: true, name: true } })
  if (!template) return { error: `Template-ul cu ID "${data.templateId}" nu a fost găsit. Caută template-uri disponibile.` }

  const campaign = await db.marketingCampaign.create({
    data: {
      businessLineId: blId,
      name: data.name,
      channel: data.channel || 'email',
      campaignType: 'outbound',
      segmentId: data.segmentId || null,
      templateId: template.id,
      status: data.scheduledAt ? 'scheduled' : 'draft',
      scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
    },
  })

  return { success: true, id: campaign.id, name: campaign.name, status: campaign.status, message: `Campania "${campaign.name}" a fost creată ca ${campaign.status}.` }
}

export async function updateCampaignStatus(campaignId: string, newStatus: string) {
  const campaign = await db.marketingCampaign.findUnique({ where: { id: campaignId }, select: { id: true, name: true, status: true } })
  if (!campaign) return { error: `Campania cu ID "${campaignId}" nu a fost găsită.` }

  const validStatuses = ['draft', 'scheduled', 'running', 'paused', 'completed']
  if (!validStatuses.includes(newStatus)) return { error: `Status invalid. Opțiuni: ${validStatuses.join(', ')}` }

  const oldStatus = campaign.status
  await db.marketingCampaign.update({ where: { id: campaignId }, data: { status: newStatus } })

  return { success: true, name: campaign.name, oldStatus, newStatus, message: `Statusul campaniei "${campaign.name}" a fost schimbat din "${oldStatus}" în "${newStatus}".` }
}

export async function deleteCampaign(campaignId: string) {
  const campaign = await db.marketingCampaign.findUnique({ where: { id: campaignId }, select: { id: true, name: true, totalSent: true } })
  if (!campaign) return { error: `Campania cu ID "${campaignId}" nu a fost găsită.` }
  if (campaign.totalSent > 0) return { error: `Campania "${campaign.name}" nu poate fi ștearsă — are ${campaign.totalSent} mesaje trimise. Schimbă statusul în "completed" sau "paused".` }

  // Delete associated campaign leads first
  await db.campaignLead.deleteMany({ where: { campaignId } })
  await db.marketingCampaign.delete({ where: { id: campaignId } })

  return { success: true, name: campaign.name, message: `Campania "${campaign.name}" a fost ștearsă.` }
}

// ─── AI Copilot — Context Builder (Phase 2) ───
// Builds page-aware context string injected into the system prompt.
// Now uses live Prisma data instead of @repo/mock-data.

import { db } from '@repo/db'

/**
 * Build a compressed context string for the current page.
 * Queries live DB data. Keeps under ~1500 tokens to leave room for conversation.
 */
export async function buildCopilotContext(pathname: string): Promise<string> {
  const pageName = getPageName(pathname)
  const globalSnapshot = await getGlobalSnapshot()
  const pageData = await getPageSpecificData(pathname)

  return `Utilizatorul se află pe pagina: **${pageName}** (${pathname})

### Snapshot Global (date reale din baza de date)
${globalSnapshot}

### Date relevante pentru pagina curentă
${pageData}

### Funcții disponibile (tools)
Ai acces la următoarele funcții pe care le poți apela:
- get_dashboard_stats(business_line?) — KPIs globale sau per BL
- get_clients(business_line?, status?) — lista clienți
- get_leads(business_line?, min_probability?) — pipeline lead-uri
- get_projects(status?) — proiecte
- get_offers(status?) — oferte comerciale
- get_invoices(status?) — facturi
- get_revenue_history() — venituri pe ultimele 6 luni
- get_marketing_stats(business_line) — KPIs marketing
- search_entity(query, entity_type?) — caută clienți/lead-uri/proiecte/oferte
- navigate_to(path, reason?) — navighează utilizatorul la o pagină
- update_lead_status(lead_id, new_status) — schimbă statusul unui lead
- generate_summary_report(scope?) — generează raport executiv complet

Folosește aceste funcții pentru a obține date precise înainte de a răspunde.
Datele sunt REALE din baza de date PostgreSQL.`
}

function getPageName(pathname: string): string {
  const pageNames: Record<string, string> = {
    '/': 'Dashboard',
    '/crm': 'CRM — Overview',
    '/crm/clienti': 'CRM — Clienți',
    '/crm/lead-uri': 'CRM — Pipeline Lead-uri',
    '/offers': 'Oferte',
    '/offers/new': 'Ofertă Nouă',
    '/finance': 'Financiar',
    '/projects': 'Proiecte',
    '/contracts': 'Contracte',
    '/marketing': 'Marketing',
    '/marketing/campaigns': 'Marketing — Campanii',
    '/marketing/templates': 'Marketing — Template-uri',
    '/marketing/segments': 'Marketing — Segmente',
    '/marketing/pipeline': 'Marketing — Pipeline',
    '/settings': 'Setări',
    '/hr': 'Resurse Umane',
    '/reports': 'Rapoarte',
    '/wiki': 'Wiki',
    '/communications': 'Comunicări',
    '/automations': 'Automatizări',
    '/documents': 'Documente',
  }
  // Handle dynamic routes like /crm/clienti/[id]
  for (const [key, name] of Object.entries(pageNames)) {
    if (pathname === key) return name
  }
  if (pathname.startsWith('/crm/clienti/')) return 'CRM — Detalii Client'
  if (pathname.startsWith('/crm/lead-uri/')) return 'CRM — Detalii Lead'
  if (pathname.startsWith('/projects/')) return 'Detalii Proiect'
  if (pathname.startsWith('/offers/') && pathname.endsWith('/edit')) return 'Editare Ofertă'
  if (pathname.startsWith('/offers/')) return 'Detalii Ofertă'
  if (pathname.startsWith('/contracts/')) return 'Detalii Contract'
  if (pathname.startsWith('/marketing')) return 'Marketing'
  if (pathname.startsWith('/settings')) return 'Setări'
  return pathname
}

async function getGlobalSnapshot(): Promise<string> {
  try {
    const [
      totalClients,
      activeProjects,
      openLeads,
      overdueInvoices,
      activeRetainers,
    ] = await Promise.all([
      db.client.count({ where: { status: 'activ' } }),
      db.project.count({ where: { status: { in: ['in_lucru', 'planificare'] } } }),
      db.lead.count({ where: { status: { notIn: ['convertit', 'pierdut'] }, deletedAt: null } }),
      db.invoice.findMany({ where: { status: 'restanta' }, select: { amount: true } }),
      db.retainer.findMany({ where: { status: 'activ' }, select: { amount: true, billingCycle: true } }),
    ])

    let mrr = 0
    for (const ret of activeRetainers) {
      mrr += ret.billingCycle === 'trimestrial' ? ret.amount / 3 : ret.amount
    }

    const overdueAmount = overdueInvoices.reduce((s, i) => s + i.amount, 0)

    return `- Clienți activi: ${totalClients}
- Proiecte active: ${activeProjects}
- MRR: ${Math.round(mrr)} EUR
- Lead-uri deschise: ${openLeads}
- Facturi restante: ${overdueInvoices.length} (${Math.round(overdueAmount)} EUR)`
  } catch (err) {
    console.error('[Copilot Context] Error in getGlobalSnapshot:', err)
    return '- Eroare la încărcarea datelor globale. Folosește funcțiile (tools) pentru date precise.'
  }
}

async function getPageSpecificData(pathname: string): Promise<string> {
  try {
    if (pathname === '/' || pathname === '') {
      return await getDashboardContext()
    }
    if (pathname.startsWith('/crm/lead-uri')) {
      return await getLeadsContext()
    }
    if (pathname.startsWith('/crm')) {
      return await getClientsContext()
    }
    if (pathname.startsWith('/offers')) {
      return await getOffersContext()
    }
    if (pathname.startsWith('/finance')) {
      return await getFinanceContext()
    }
    if (pathname.startsWith('/projects')) {
      return await getProjectsContext()
    }
    if (pathname.startsWith('/marketing')) {
      return await getMarketingContext()
    }
    return 'Nu există date specifice suplimentare pentru această pagină. Folosește funcțiile disponibile pentru a obține informații.'
  } catch (err) {
    console.error('[Copilot Context] Error in getPageSpecificData:', err)
    return 'Eroare la încărcarea datelor specifice paginii. Folosește funcțiile (tools) pentru date precise.'
  }
}

async function getDashboardContext(): Promise<string> {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

  const [monthInvoices, activeOffers, projectsInProgress] = await Promise.all([
    db.invoice.findMany({
      where: { issuedAt: { gte: startOfMonth, lte: endOfMonth }, direction: 'emisa', status: { not: 'anulata' } },
      select: { amount: true, businessLineId: true },
    }),
    db.offer.count({ where: { status: { in: ['draft', 'trimisa', 'vizualizata'] } } }),
    db.project.count({ where: { status: 'in_lucru' } }),
  ])

  const monthRevenue = monthInvoices.reduce((s, i) => s + i.amount, 0)

  return `Dashboard-ul central arată o privire de ansamblu a afacerii.
- Venituri luna curentă: ${Math.round(monthRevenue)} EUR
- Oferte active: ${activeOffers}
- Proiecte în lucru: ${projectsInProgress}`
}

async function getClientsContext(): Promise<string> {
  const [activeCount, totalCount, byBL] = await Promise.all([
    db.client.count({ where: { status: 'activ' } }),
    db.client.count(),
    db.client.groupBy({
      by: ['businessLineId'],
      where: { status: 'activ' },
      _count: { id: true },
    }),
  ])

  const allBLs = await db.businessLine.findMany({ select: { id: true, slug: true } })
  const blMap = new Map(allBLs.map((bl) => [bl.id, bl.slug]))
  const breakdown = byBL.map((g) => `${blMap.get(g.businessLineId) || '?'}: ${g._count.id}`).join(', ')

  return `Pagina CRM arată toți clienții companiei.
- Clienți activi: ${activeCount} (${breakdown})
- Total clienți (incl. inactivi): ${totalCount}`
}

async function getLeadsContext(): Promise<string> {
  const [totalLeads, hotLeads, pipelineValue] = await Promise.all([
    db.lead.count({ where: { deletedAt: null } }),
    db.lead.count({ where: { probability: { gte: 70 }, deletedAt: null } }),
    db.lead.aggregate({ where: { deletedAt: null }, _sum: { value: true } }),
  ])

  return `Pipeline-ul de lead-uri.
- Total lead-uri: ${totalLeads}
- Lead-uri fierbinți (>70%): ${hotLeads}
- Valoare pipeline: ${Math.round(pipelineValue._sum.value || 0)} EUR`
}

async function getOffersContext(): Promise<string> {
  const [activeOffers, acceptedOffers, totalOffers, activeValue] = await Promise.all([
    db.offer.count({ where: { status: { in: ['draft', 'trimisa', 'vizualizata'] } } }),
    db.offer.count({ where: { status: 'acceptata' } }),
    db.offer.count(),
    db.offer.aggregate({ where: { status: { in: ['draft', 'trimisa', 'vizualizata'] } }, _sum: { value: true } }),
  ])

  return `Pagina de oferte comerciale.
- Oferte active: ${activeOffers} — pipeline: ${Math.round(activeValue._sum.value || 0)} EUR
- Oferte acceptate: ${acceptedOffers}
- Total oferte: ${totalOffers}`
}

async function getFinanceContext(): Promise<string> {
  // Auto-detect overdue
  await db.invoice.updateMany({
    where: { status: { in: ['emisa', 'trimisa'] }, dueDate: { lt: new Date() }, paidAt: null },
    data: { status: 'restanta' },
  })

  const [overdueData, paidData, totalInvoices, mrrData] = await Promise.all([
    db.invoice.aggregate({ where: { status: 'restanta' }, _sum: { amount: true }, _count: { id: true } }),
    db.invoice.aggregate({ where: { status: 'platita' }, _sum: { amount: true }, _count: { id: true } }),
    db.invoice.count(),
    db.retainer.aggregate({ where: { status: 'activ' }, _sum: { amount: true } }),
  ])

  return `Pagina financiară.
- Facturi restante: ${overdueData._count.id} — total: ${Math.round(overdueData._sum.amount || 0)} EUR
- Facturi plătite: ${paidData._count.id} — total: ${Math.round(paidData._sum.amount || 0)} EUR
- Total facturi: ${totalInvoices}
- MRR (retainere active): ~${Math.round(mrrData._sum.amount || 0)} EUR`
}

async function getProjectsContext(): Promise<string> {
  const [inLucru, totalProjects, avgProgress] = await Promise.all([
    db.project.count({ where: { status: 'in_lucru' } }),
    db.project.count(),
    db.project.aggregate({ where: { status: 'in_lucru' }, _avg: { progress: true } }),
  ])

  return `Pagina proiecte.
- Proiecte în lucru: ${inLucru}
- Progres mediu: ${Math.round(avgProgress._avg.progress || 0)}%
- Total proiecte: ${totalProjects}`
}

async function getMarketingContext(): Promise<string> {
  try {
    const [totalCampaigns, activeCampaigns, totalSegments, totalTemplates] = await Promise.all([
      db.marketingCampaign.count(),
      db.marketingCampaign.count({ where: { status: { in: ['running', 'scheduled'] } } }),
      db.marketingSegment.count(),
      db.marketingTemplate.count(),
    ])

    return `Modulul de marketing — campanii, segmente, template-uri, short links.
- Campanii totale: ${totalCampaigns} (active: ${activeCampaigns})
- Segmente: ${totalSegments}
- Template-uri: ${totalTemplates}
Folosește get_marketing_stats(business_line) pentru date detaliate per linie de business.`
  } catch {
    return 'Modulul de marketing — campanii, segmente, template-uri, short links. Folosește get_marketing_stats(business_line) pentru date detaliate.'
  }
}

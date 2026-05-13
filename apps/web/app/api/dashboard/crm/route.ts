import { NextRequest, NextResponse } from 'next/server'
import { db } from '@repo/db'

// ─── GET /api/dashboard/crm ───
// Full dashboard data: stats, activities, invoices, top clients, revenue history
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const businessLine = searchParams.get('businessLine') // slug: 'agency', 'fudly', etc.

    // Resolve business line filter
    let businessLineId: string | undefined
    if (businessLine && businessLine !== 'all') {
      const bl = await db.businessLine.findUnique({ where: { slug: businessLine } })
      if (bl) businessLineId = bl.id
    }

    const where = businessLineId ? { businessLineId } : {}

    // Current month boundaries
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

    // 6 months ago for revenue history
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)

    // ── Parallel queries ──
    const [
      activeClients,
      totalClients,
      lastMonthClients,
      allLeads,
      activeProjectsCount,
      thisMonthInvoices,
      lastMonthInvoices,
      // New queries
      recentActivities,
      overdueInvoices,
      topClientsData,
      revenueHistoryRaw,
      mrrData,
      allBusinessLines,
    ] = await Promise.all([
      // Active clients
      db.client.count({ where: { ...where, status: 'activ', deletedAt: null } }),
      // Total clients
      db.client.count({ where: { ...where, deletedAt: null } }),
      // Clients created last month
      db.client.count({
        where: { ...where, deletedAt: null, createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } },
      }),
      // All leads
      db.lead.findMany({
        where: where as any,
        select: { id: true, status: true, value: true, businessLineId: true, entityType: true },
      }),
      // Active projects count
      db.project.count({ where: { ...where, status: { in: ['in_lucru', 'activ'] } } as any }),
      // This month revenue
      db.invoice.aggregate({
        where: { ...where, direction: 'emisa', issuedAt: { gte: startOfMonth } } as any,
        _sum: { amount: true },
        _count: true,
      }),
      // Last month revenue
      db.invoice.aggregate({
        where: { ...where, direction: 'emisa', issuedAt: { gte: startOfLastMonth, lte: endOfLastMonth } } as any,
        _sum: { amount: true },
        _count: true,
      }),

      // ─── Recent Activities (last 10) ───
      db.activity.findMany({
        where: businessLineId ? { businessLineId } : {},
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true, action: true, entityType: true, entityId: true,
          entityName: true, details: true, createdAt: true, businessLineId: true,
        },
      }),

      // ─── Overdue Invoices ───
      db.invoice.findMany({
        where: {
          ...where,
          direction: 'emisa',
          status: { in: ['restanta', 'emisa', 'trimisa'] },
          dueDate: { lt: now },
          paidAt: null,
        } as any,
        include: {
          client: { select: { companyName: true } },
          businessLine: { select: { slug: true, name: true } },
        },
        orderBy: { dueDate: 'asc' },
        take: 10,
      }),

      // ─── Top Clients by invoiced amount (as MRR proxy) ───
      db.client.findMany({
        where: { ...where, status: 'activ', deletedAt: null },
        select: {
          id: true, companyName: true, status: true,
          businessLine: { select: { slug: true, name: true } },
          retainers: {
            where: { status: 'activ' },
            select: { amount: true, serviceName: true },
          },
          _count: { select: { invoices: true, projects: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),

      // ─── Revenue History (last 6 months of invoices, grouped by month) ───
      db.invoice.findMany({
        where: {
          ...where,
          direction: 'emisa',
          issuedAt: { gte: sixMonthsAgo },
        } as any,
        select: {
          amount: true, issuedAt: true,
          businessLine: { select: { slug: true } },
        },
      }),

      // ─── MRR: sum of active retainers ───
      db.retainer.aggregate({
        where: { ...where, status: 'activ' } as any,
        _sum: { amount: true },
      }),

      // All business lines for mapping
      db.businessLine.findMany({ select: { id: true, slug: true, name: true } }),
    ])

    // ── Compute stats ──
    const closedStatuses = ['castigat', 'pierdut', 'churned', 'inactiv_fz', 'suspendat_inst']
    const openLeads = allLeads.filter(l => !closedStatuses.includes(l.status))
    const wonLeads = allLeads.filter(l => l.status === 'castigat')
    const lostLeads = allLeads.filter(l => l.status === 'pierdut')
    const pipelineValue = openLeads.reduce((sum, l) => sum + (l.value || 0), 0)

    // Pipeline stages breakdown
    const stageMap: Record<string, { count: number; value: number }> = {}
    for (const lead of openLeads) {
      if (!stageMap[lead.status]) stageMap[lead.status] = { count: 0, value: 0 }
      stageMap[lead.status]!.count++
      stageMap[lead.status]!.value += lead.value || 0
    }

    const totalDecided = wonLeads.length + lostLeads.length
    const conversionRate = totalDecided > 0 ? Math.round((wonLeads.length / totalDecided) * 1000) / 10 : 0

    // Revenue
    const monthlyRevenue = thisMonthInvoices._sum.amount || 0
    const lastMonthRevenue = lastMonthInvoices._sum.amount || 0
    const revenueTrend = lastMonthRevenue > 0
      ? Math.round(((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 * 10) / 10
      : 0

    // Client trend
    const newClientsThisMonth = await db.client.count({
      where: { ...where, deletedAt: null, createdAt: { gte: startOfMonth } },
    })
    const clientsTrend = lastMonthClients > 0
      ? Math.round(((newClientsThisMonth - lastMonthClients) / lastMonthClients) * 100 * 10) / 10
      : 0

    // Leads trend
    const leadsThisMonth = await db.lead.count({
      where: { ...where, createdAt: { gte: startOfMonth } } as any,
    })
    const leadsLastMonth = await db.lead.count({
      where: { ...where, createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } } as any,
    })
    const leadsTrend = leadsLastMonth > 0
      ? Math.round(((leadsThisMonth - leadsLastMonth) / leadsLastMonth) * 100 * 10) / 10
      : 0

    // MRR
    const mrr = mrrData._sum.amount || 0

    // ── Format activities for frontend ──
    const activityTypeMap: Record<string, string> = {
      'created_client': 'client_nou', 'created_lead': 'lead_nou', 'created_project': 'proiect_start',
      'created_invoice': 'factura_emisa', 'status_changed_invoice': 'factura_platita',
      'created_contract': 'contract_semnat', 'status_changed_lead': 'lead_pierdut',
      'created_offer': 'contract_semnat',
    }

    const formattedActivities = recentActivities.map(a => {
      const details = a.details as any || {}
      const typeKey = `${a.action}_${a.entityType}`
      let mappedType = activityTypeMap[typeKey] || 'client_nou'

      // Refine type based on details
      if (a.entityType === 'invoice' && details.newStatus === 'platita') mappedType = 'factura_platita'
      if (a.entityType === 'lead' && details.newStatus === 'pierdut') mappedType = 'lead_pierdut'
      if (a.entityType === 'lead' && a.action === 'created') mappedType = 'lead_nou'

      // Build description
      let description = a.entityName
      if (details.newStatus) description += ` → ${details.newStatus}`
      if (details.field) description += ` (${details.field})`

      const bl = allBusinessLines.find(b => b.id === a.businessLineId)

      return {
        id: a.id,
        type: mappedType,
        title: `${a.entityType === 'client' ? 'Client' : a.entityType === 'lead' ? 'Lead' : a.entityType === 'project' ? 'Proiect' : a.entityType === 'invoice' ? 'Factură' : a.entityType === 'contract' ? 'Contract' : a.entityType === 'offer' ? 'Ofertă' : a.entityType.charAt(0).toUpperCase() + a.entityType.slice(1)} ${a.action === 'created' ? 'nou' : a.action === 'status_changed' ? (a.entityType === 'invoice' && details.newStatus === 'platita' ? 'plătită' : details.newStatus || 'actualizat') : a.action}`,
        description,
        timestamp: a.createdAt.toISOString(),
        businessLine: bl?.slug || '',
      }
    })

    // ── Format overdue invoices ──
    const formattedOverdue = overdueInvoices.map(inv => ({
      id: inv.id,
      number: inv.number,
      amount: inv.amount,
      currency: inv.currency,
      dueDate: inv.dueDate.toISOString(),
      clientName: inv.client.companyName,
      businessLine: inv.businessLine.slug,
    }))

    // ── Top 5 Clients by MRR (retainer sum) ──
    const topClients = topClientsData
      .map(c => ({
        id: c.id,
        companyName: c.companyName,
        businessLine: c.businessLine.slug,
        monthlyRevenue: c.retainers.reduce((s, r) => s + r.amount, 0),
        services: c.retainers.map(r => r.serviceName),
        invoiceCount: c._count.invoices,
        projectCount: c._count.projects,
      }))
      .sort((a, b) => b.monthlyRevenue - a.monthlyRevenue)
      .slice(0, 5)

    // ── Revenue History (last 6 months) ──
    const monthNames = ['Ian', 'Feb', 'Mar', 'Apr', 'Mai', 'Iun', 'Iul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const revenueHistory: { month: string; revenue: number; agency: number; fudly: number }[] = []

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthKey = `${monthNames[d.getMonth()]} ${d.getFullYear()}`
      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1)
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59)

      let agency = 0, fudly = 0, total = 0
      for (const inv of revenueHistoryRaw) {
        const invDate = new Date(inv.issuedAt)
        if (invDate >= monthStart && invDate <= monthEnd) {
          total += inv.amount
          if (inv.businessLine.slug === 'fudly') fudly += inv.amount
          else agency += inv.amount
        }
      }
      revenueHistory.push({ month: monthKey, revenue: total, agency, fudly })
    }

    return NextResponse.json({
      data: {
        stats: {
          activeClients,
          totalClients,
          monthlyRevenue,
          mrr,
          openLeads: openLeads.length,
          activeProjects: activeProjectsCount,
          pipelineValue,
          conversionRate,
          clientsTrend,
          revenueTrend,
          leadsTrend,
        },
        pipeline: stageMap,
        recentActivities: formattedActivities,
        overdueInvoices: formattedOverdue,
        topClients,
        revenueHistory,
      },
    })
  } catch (error: any) {
    console.error('[API] GET /api/dashboard/crm error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

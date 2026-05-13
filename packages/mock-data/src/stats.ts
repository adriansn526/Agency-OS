import type { DashboardStats } from './types'

export const dashboardStats: DashboardStats = {
  totalClients: 33,
  activeProjects: 11,
  monthlyRevenue: 53625,
  mrr: 30250,
  openLeads: 27,
  conversionRate: 28.5,
  clientsTrend: 15,
  revenueTrend: 12,
  leadsTrend: 8,
}

export const agencyStats: DashboardStats = {
  totalClients: 12,
  activeProjects: 7,
  monthlyRevenue: 36800,
  mrr: 29400,
  openLeads: 11,
  conversionRate: 23.5,
  clientsTrend: 12.4,
  revenueTrend: 8.7,
  leadsTrend: -3.2,
}

export const fudlyStats: DashboardStats = {
  totalClients: 8,
  activeProjects: 2,
  monthlyRevenue: 425,
  mrr: 425,
  openLeads: 5,
  conversionRate: 60,
  clientsTrend: 25,
  revenueTrend: 18,
  leadsTrend: 15,
  churnRate: 4.2,
  ltv: 890,
}

export const climaticproStats: DashboardStats = {
  totalClients: 13,
  activeProjects: 2,
  monthlyRevenue: 16400,
  mrr: 0,
  openLeads: 7,
  conversionRate: 45,
  clientsTrend: 30,
  revenueTrend: 22,
  leadsTrend: 12,
  profitNet: 3200,
  instalariLuna: 8,
}

export const revenueHistory = [
  { month: 'Nov 2025', revenue: 32400, agency: 27900, fudly: 500, climaticpro: 4000 },
  { month: 'Dec 2025', revenue: 34100, agency: 28600, fudly: 500, climaticpro: 5000 },
  { month: 'Ian 2026', revenue: 39800, agency: 31100, fudly: 700, climaticpro: 8000 },
  { month: 'Feb 2026', revenue: 44500, agency: 33900, fudly: 600, climaticpro: 10000 },
  { month: 'Mar 2026', revenue: 49900, agency: 35200, fudly: 700, climaticpro: 14000 },
  { month: 'Apr 2026', revenue: 53625, agency: 36800, fudly: 425, climaticpro: 16400 },
]

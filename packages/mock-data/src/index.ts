export * from './types'
export * from './business-lines'
export { clients } from './clients'
export { clientsFudly } from './clients-fudly'
export { clientsFinalClimaticPRO, instalatoriClimaticPRO, furnizoriClimaticPRO } from './clients-climaticpro'
export { leads } from './leads'
export { leadsFudly } from './leads-fudly'
export { leadsClimaticPRO } from './leads-climaticpro'
export { projects } from './projects'
export { invoices } from './invoices'
export { retainers } from './retainers'
export { activities } from './activities'
export { offers } from './offers'
export { serviceCatalog } from './service-catalog'
export { users, currentUser } from './users'
export { dashboardStats, agencyStats, fudlyStats, climaticproStats, revenueHistory } from './stats'
export { companySettings, contractSettings } from './company-settings'
export { contractTemplates } from './contract-templates'
export { sowTemplates } from './sow-templates'
// v8: Service-Aware Dashboards
export { getProjectKpis, getProjectTimeseries, getProjectKeywords, getProjectCampaigns, getPositionDistribution } from './mock-kpi-data'
// v8: Communication Hub
export { communicationHistory, communicationTemplates, getClientCommunications, getTemplatesByChannel, getCommunicationStats } from './mock-communications'

// ─── Merged helpers ─────────────────────────────
import { clients } from './clients'
import { clientsFudly } from './clients-fudly'
import { clientsFinalClimaticPRO, instalatoriClimaticPRO, furnizoriClimaticPRO } from './clients-climaticpro'
import { leads } from './leads'
import { leadsFudly } from './leads-fudly'
import { leadsClimaticPRO } from './leads-climaticpro'

/** All clients merged across all business lines */
export const allClients = [
  ...clients,
  ...clientsFudly,
  ...clientsFinalClimaticPRO,
  ...instalatoriClimaticPRO,
  ...furnizoriClimaticPRO,
]

/** All leads merged across all business lines */
export const allLeads = [...leads, ...leadsFudly, ...leadsClimaticPRO]

/** Filter any entity array by business line */
export function filterByBusinessLine<T extends { businessLine: string }>(
  data: T[],
  lineId: string | 'all'
): T[] {
  if (lineId === 'all') return data
  return data.filter((item) => item.businessLine === lineId)
}

/** Filter by business line AND entity type */
export function filterByEntity<T extends { businessLine: string; entityType: string }>(
  data: T[],
  lineId: string | 'all',
  etId?: string | 'all'
): T[] {
  let result = lineId === 'all' ? data : data.filter((item) => item.businessLine === lineId)
  if (etId && etId !== 'all') {
    result = result.filter((item) => item.entityType === etId)
  }
  return result
}

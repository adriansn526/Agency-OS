export type ProjectDashboardVariant = 'webdev' | 'seo' | 'ads' | 'generic'
export type CardVisibility = 'internal' | 'client' | 'both'

export interface ProjectCardConfig {
  id: string
  visibility: CardVisibility
  fieldsVisibility?: Record<string, CardVisibility>
}

export interface ProjectTypeConfig {
  templateIds: string[]
  dashboardVariant: ProjectDashboardVariant
  cards: ProjectCardConfig[]
}

export const PROJECT_TYPES_CONFIG: ProjectTypeConfig[] = [
  {
    // TODO: consolidare pe un singur templateId canonic + migrare proiecte existente (ex: doar 'website')
    templateIds: ['website', 'dev_template'],
    dashboardVariant: 'webdev',
    cards: [
      { id: 'quick-links', visibility: 'both' }, // Staging/Production are both, Admin/Git/Drive are internal inside the card
      { id: 'pipeline', visibility: 'both' },
      { id: 'lighthouse', visibility: 'both' },
      { id: 'infrastructure', visibility: 'internal' },
      { id: 'domains-ssl', visibility: 'both', fieldsVisibility: { dnsProvider: 'internal' } },
      { id: 'internal-notes', visibility: 'internal' },
      { id: 'changelog', visibility: 'both' }
    ]
  },
  {
    templateIds: ['seo_project', 'seo_programmatic'],
    dashboardVariant: 'seo',
    cards: [
      { id: 'gsc-overview', visibility: 'both' },
      { id: 'top-keywords', visibility: 'both' },
      { id: 'top-pages', visibility: 'both' }
    ]
  },
  {
    templateIds: ['ads_campaign', 'linkedin_campaign', 'instagram_campaign', 'facebook_campaign', 'tiktok_campaign'],
    dashboardVariant: 'ads',
    cards: [
      { id: 'ads-overview', visibility: 'both' },
      { id: 'campaigns-table', visibility: 'both' },
      { id: 'search-terms', visibility: 'both' }
    ]
  }
]

/**
 * Returns the resolved dashboard variant based on the template ID.
 */
export function getDashboardVariant(templateId: string | null | undefined): ProjectDashboardVariant {
  if (!templateId) return 'generic'
  const config = PROJECT_TYPES_CONFIG.find(c => c.templateIds.includes(templateId))
  return config?.dashboardVariant || 'generic'
}

/**
 * Returns the resolved cards config for a given template ID.
 */
export function getCardsConfig(templateId: string | null | undefined): ProjectCardConfig[] {
  if (!templateId) return []
  const config = PROJECT_TYPES_CONFIG.find(c => c.templateIds.includes(templateId))
  return config?.cards || []
}

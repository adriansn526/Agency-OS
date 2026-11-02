import { db } from '@repo/db'
import { getKeywordVolumes } from '@/lib/integrations/google-ads'
import { estimateKd } from '@/lib/seo/proposals-kd'

export const MAX_TERMS = 8
const GEO = ['geoTargetConstants/2642'] // Romania
const LANG = 'languageConstants/1032' // Romanian

export function cleanTerms(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const out: string[] = []
  for (const t of raw) {
    const s = String(t ?? '').replace(/\s+/g, ' ').trim().slice(0, 80)
    if (s.length >= 2 && !out.some(o => o.toLowerCase() === s.toLowerCase())) out.push(s)
    if (out.length >= MAX_TERMS) break
  }
  return out
}

/** Keyword Planner only needs an account to run under; KEYWORD_PLANNER_CUSTOMER_ID pins one, otherwise the first client with Google Ads. */
async function plannerCustomer(): Promise<string | null> {
  if (process.env.KEYWORD_PLANNER_CUSTOMER_ID) return process.env.KEYWORD_PLANNER_CUSTOMER_ID
  const c = await db.client.findFirst({ where: { googleAdsCustomerId: { not: null } }, select: { googleAdsCustomerId: true } })
  return c?.googleAdsCustomerId ?? null
}

/** Monthly searches in Romania per term (Google Ads Keyword Planner, free). A term Google has no figure for is absent. */
export async function volumesFor(terms: string[]): Promise<Record<string, number>> {
  const customer = await plannerCustomer()
  if (!customer || !terms.length) return {}
  const v = await getKeywordVolumes(customer, terms, { geoTargetConstants: GEO, language: LANG })
  const out: Record<string, number> = {}
  for (const t of terms) {
    const n = v[t] ?? v[t.toLowerCase()]
    if (typeof n === 'number') out[t] = n
  }
  return out
}

/** Estimated KD per term from the SERP top 10 (about 0.002 USD per term). A term whose SERP request failed is absent. */
export async function kdFor(terms: string[]): Promise<Record<string, number>> {
  return Object.fromEntries(await estimateKd(terms))
}

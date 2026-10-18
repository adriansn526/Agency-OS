import type { ActionByKind } from './actions'

/** What applies when no rule matches. Safe by design: free, one firm, charged only when the firm accepts. */
export const DEFAULT_ACTIONS: ActionByKind = {
  pricing: { amountRon: 0, freeFirstN: 0 },
  routing: { mode: 'single', maxFirms: 1, maxAcceptances: 1, selection: 'nearest', minReviews: 0, minRating: 0 },
  billing: { chargeAt: 'acceptance' },
  recommendation: { minReviews: 5, minRating: 4.5, requireVerified: true },
}


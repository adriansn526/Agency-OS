/** A firm's plan: "abonament" (until planUntil, when set) or the free plan. */
export interface PlanLike { plan: string; planUntil: Date | null }
export const planActive = (e: PlanLike, now = new Date()) => e.plan === 'abonament' && (!e.planUntil || e.planUntil > now)

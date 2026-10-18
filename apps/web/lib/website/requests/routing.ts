/** Pure parts of request routing: who receives a general request, what a firm may see before accepting. */
import type { RoutingAction } from '../rules/actions'
import { norm } from '../rules/conditions'

export interface Candidate { id: string; city: string | null; ratingAvg: number | null; ratingCount: number; lastDeliveryAt: Date | null }

const byRating = (a: Candidate, b: Candidate) => (b.ratingAvg ?? 0) - (a.ratingAvg ?? 0) || b.ratingCount - a.ratingCount
const stable = (a: Candidate, b: Candidate) => (a.id < b.id ? -1 : 1)

/** Firms that pass the rule's review filters, ordered by its selection mode, cut to maxFirms. */
export function pickFirms(cands: Candidate[], a: Pick<RoutingAction, 'maxFirms' | 'selection'> & { minReviews?: number; minRating?: number }, city: string | null): Candidate[] {
  const ok = cands.filter((c) => c.ratingCount >= (a.minReviews ?? 0) && (c.ratingAvg ?? 0) >= (a.minRating ?? 0))
  const here = (c: Candidate) => !!city && !!c.city && norm(c.city) === norm(city)
  const cmp =
    a.selection === 'round_robin' ? (x: Candidate, y: Candidate) => (x.lastDeliveryAt?.getTime() ?? 0) - (y.lastDeliveryAt?.getTime() ?? 0)
    : a.selection === 'rating' ? byRating
    : (x: Candidate, y: Candidate) => Number(here(y)) - Number(here(x)) || byRating(x, y)
  return [...ok].sort((x, y) => cmp(x, y) || stable(x, y)).slice(0, a.maxFirms)
}

/** Description shown before a firm accepts: contact details the customer typed into the text are hidden, length is capped. */
export function teaserText(description: string, max = 220): string {
  const masked = description
    .replace(/[^\s@]+@[^\s@]+\.[A-Za-z]{2,}/g, '[email ascuns]')
    .replace(/(?:\+?\d[\s.\-()]*){7,}/g, '[telefon ascuns]')
    .replace(/\s+/g, ' ').trim()
  return masked.length > max ? masked.slice(0, max - 1).trimEnd() + '…' : masked
}

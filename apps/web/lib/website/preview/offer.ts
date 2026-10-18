/**
 * The commercial offer a firm sees before accepting, generated from the editable rules (pricing, routing, billing) and the founding programme.
 * Nothing here is hard-coded: change a rule in the UI and the sentence on the accept screen changes with it.
 */
import { db } from '@repo/db'
import { resolveRule } from '../rules/engine'
import type { Facts, RuleKind, RuleLike } from '../rules/types'
import type { BillingAction, PricingAction, RoutingAction } from '../rules/actions'
import { founderOffer, foundingConfig } from '../founding/service'

export interface Offer {
  /** One short sentence per point, ready to show. */
  lines: string[]
  /** Machine-readable copy of what was shown (stored with the acceptance). */
  terms: { amountRon: number; freeFirstN: number; chargeAt: BillingAction['chargeAt']; maxFirms: number; founderAmountRon: number | null }
}

const ron = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(2).replace('.', ',')} lei`

/** Pure: builds the sentences. `founder` is the price that would apply with a founding place (null when no such place or no difference). */
export function offerLines(pricing: PricingAction, routing: RoutingAction, billing: BillingAction, founder: { pricing: PricingAction; text: string } | null): string[] {
  const out: string[] = ['Listarea și pagina firmei sunt gratuite. Nu plătiți nimic acum.']
  const when = billing.chargeAt === 'delivery' ? 'când primiți o cerere' : 'doar când acceptați o cerere'
  const price = (p: PricingAction) => (p.amountRon === 0 ? null : `${ron(p.amountRon)} / cerere${p.freeFirstN > 0 ? `, primele ${p.freeFirstN} fiind gratuite` : ''}`)
  const p = price(pricing)
  out.push(p ? `Cererile de ofertă: ${p}. Se taxează ${when}.` : `Cererile de ofertă sunt gratuite în această perioadă.`)
  if (routing.mode === 'multi') out.push(`Fiecare cerere ajunge la cel mult ${routing.maxFirms} firme.`)
  if (founder) {
    const fp = price(founder.pricing)
    out.push(fp && fp !== p ? `Ca partener fondator: ${fp}. ${founder.text}` : founder.text)
  }
  return out
}

export async function buildOffer(lineId: string, entry: { county: string | null; city: string | null; data: unknown }): Promise<Offer> {
  const [rows, channel] = await Promise.all([
    db.websiteRule.findMany({ where: { businessLineId: lineId, kind: { in: ['pricing', 'routing', 'billing'] } } }),
    db.websiteChannel.findUnique({ where: { businessLineId: lineId }, select: { config: true } }),
  ])
  const like = rows.map((r): RuleLike => ({ id: r.id, kind: r.kind as RuleKind, name: r.name, priority: r.priority, isActive: r.isActive, conditions: r.conditions as never, action: r.action, validFrom: r.validFrom, validTo: r.validTo, createdAt: r.createdAt }))
  const facts = (founding: boolean): Facts => ({ county: entry.county ?? undefined, city: entry.city ?? undefined, founding })
  const at = (f: boolean) => ({ pricing: resolveRule('pricing', facts(f), like).action, routing: resolveRule('routing', facts(f), like).action, billing: resolveRule('billing', facts(f), like).action })
  const std = at(false)
  const cfg = foundingConfig(channel?.config)
  const text = await founderOffer(lineId, entry, cfg)
  const fo = text ? at(true) : null
  const lines = offerLines(std.pricing, std.routing, std.billing, fo ? { pricing: fo.pricing, text } : null)
  return { lines, terms: { amountRon: std.pricing.amountRon, freeFirstN: std.pricing.freeFirstN, chargeAt: std.billing.chargeAt, maxFirms: std.routing.maxFirms, founderAmountRon: fo ? fo.pricing.amountRon : null } }
}

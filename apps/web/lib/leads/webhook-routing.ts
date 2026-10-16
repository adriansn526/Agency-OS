/**
 * Where a webhook lead lands.
 *
 * An API key belongs to a Client, but the site it is installed on can be the storefront of a
 * different business line (e.g. the intraconstruct.ro key lives on the "Advanced Systems" client,
 * while the leads belong to the IntraConstruct line). So the target line is resolved from the key's
 * domain first (BusinessLine.domain), and only falls back to the client's own line.
 *
 * The entity type may be requested by the site, but only among types the resolved line defines.
 * The initial status is the first stage of that type's pipeline (Lead.status stores the stage key).
 */

export interface RoutableEntityType { id: string; pipeline: { key: string }[] }
export interface RoutableLine { id: string; domain: string | null; config: unknown }

export interface WebhookTarget {
  businessLineId: string
  entityType: string
  status: string
  /** How the line was chosen, for logs. */
  via: 'domain' | 'client'
}

export const normalizeDomain = (d: string | null | undefined): string =>
  (d ?? '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '')

function entityTypesOf(line: RoutableLine | undefined): RoutableEntityType[] {
  const raw = (line?.config as { entityTypes?: unknown } | null)?.entityTypes
  if (!Array.isArray(raw)) return []
  return raw
    .filter((e): e is { id: string; pipeline?: unknown } => !!e && typeof (e as { id?: unknown }).id === 'string')
    .map((e) => ({
      id: e.id,
      pipeline: Array.isArray(e.pipeline)
        ? e.pipeline.filter((s): s is { key: string } => !!s && typeof (s as { key?: unknown }).key === 'string')
        : [],
    }))
}

export function resolveWebhookTarget(input: {
  keyDomain: string
  client: { businessLineId: string; entityType: string }
  lines: RoutableLine[]
  requestedEntityType?: string
}): WebhookTarget {
  const domain = normalizeDomain(input.keyDomain)
  const byDomain = domain ? input.lines.find((l) => normalizeDomain(l.domain) === domain) : undefined
  const line = byDomain ?? input.lines.find((l) => l.id === input.client.businessLineId)
  const businessLineId = line?.id ?? input.client.businessLineId
  const types = entityTypesOf(line)

  const requested = input.requestedEntityType?.trim()
  const chosen =
    (requested && types.find((t) => t.id === requested)) ||
    types.find((t) => t.id === input.client.entityType) ||
    types[0]

  return {
    businessLineId,
    // Without a readable config keep the previous behaviour (client's type, status "nou").
    entityType: chosen?.id ?? input.client.entityType,
    status: chosen?.pipeline[0]?.key ?? 'nou',
    via: byDomain ? 'domain' : 'client',
  }
}

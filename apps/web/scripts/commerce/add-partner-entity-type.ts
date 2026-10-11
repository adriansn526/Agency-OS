/**
 * One-off, idempotent: adds the "Service partener" CRM type (pipeline prospect → contactat → în discuții → acceptat → refuzat) to the
 * eCaroseria business line, so partner prospects found through Google get their own tab instead of being hidden or mixed with customers.
 *
 *   npx tsx --env-file=.env.local scripts/commerce/add-partner-entity-type.ts [--dry-run]
 */
import { db } from '@repo/db'
import { PARTNER_ENTITY_TYPE, PARTNER_PIPELINE } from '../../lib/commerce/partners/lead-sync'

async function main() {
  const bl = await db.businessLine.findUnique({ where: { slug: 'ecaroseria' }, select: { id: true, config: true } })
  if (!bl) throw new Error('Business line ecaroseria not found')
  const cfg = (bl.config ?? {}) as { entityTypes?: Array<{ id: string }> }
  const types = Array.isArray(cfg.entityTypes) ? cfg.entityTypes : []
  if (types.some((t) => t.id === PARTNER_ENTITY_TYPE)) { console.log('already present — nothing to do'); return }
  const entry = {
    id: PARTNER_ENTITY_TYPE, icon: '🔧', name: 'Service partener', namePlural: 'Service-uri partenere', financialFlow: 'expense',
    pipeline: PARTNER_PIPELINE, customFields: [{ key: 'vopsitorie', type: 'text', label: 'Vopsitorie' }],
  }
  if (process.argv.includes('--dry-run')) { console.log('would add:', JSON.stringify(entry)); return }
  // jsonb append, so concurrent edits of other config keys are not overwritten
  await db.$executeRaw`
    UPDATE "BusinessLine"
    SET config = jsonb_set(COALESCE(config, '{}'::jsonb), '{entityTypes}', COALESCE(config->'entityTypes', '[]'::jsonb) || ${JSON.stringify(entry)}::jsonb)
    WHERE id = ${bl.id}`
  console.log('added entity type', PARTNER_ENTITY_TYPE)
}
main().then(() => process.exit(0)).catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1) })

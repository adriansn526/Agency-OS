/**
 * Editing of a business line's entity types and their pipelines (BusinessLine.config.entityTypes).
 *
 * Rules that protect existing data:
 *  - a pipeline stage's `key` is its identity (Lead.status stores it): keys are never renamed, only label/colour/order change
 *  - removing a stage that leads still sit in requires a target stage (`moves`); those leads are moved in the same transaction
 *  - an entity type that leads or clients still use cannot be deleted, and the last entity type of a line stays
 *  - each change locks the line row, re-reads the config and replaces only what it edits (no lost updates)
 */
import { z } from 'zod'
import { db, Prisma, businessLineConfigSchema, entityTypeSchema } from '@repo/db'

export class ConfigError extends Error {
  constructor(message: string, readonly status = 400, readonly details?: unknown) { super(message) }
}

const key = z.string().regex(/^[a-z0-9_]{1,40}$/, 'Cheie invalidă (litere mici, cifre, _)')
export const stageSchema = z.object({ key, label: z.string().trim().min(1).max(60), color: z.string().trim().min(1).max(20) })
export const fieldSchema = z.object({
  key, label: z.string().trim().min(1).max(60),
  type: z.enum(['text', 'number', 'select', 'date', 'rating']),
  options: z.array(z.string().trim().min(1).max(80)).max(50).optional(),
})
const base = {
  name: z.string().trim().min(1).max(60),
  namePlural: z.string().trim().min(1).max(60),
  icon: z.string().trim().min(1).max(8),
  financialFlow: z.enum(['income', 'expense', 'both']),
  customFields: z.array(fieldSchema).max(60).refine((f) => new Set(f.map((x) => x.key)).size === f.length, 'Chei de câmp duplicate'),
}
export const pipelineSchema = z.array(stageSchema).min(1, 'Minim o etapă').max(30).refine((p) => new Set(p.map((s) => s.key)).size === p.length, 'Chei de etapă duplicate')

export const createSchema = z.object({ id: z.string().regex(/^[a-z0-9_]{2,40}$/).optional(), ...base, pipeline: pipelineSchema })
export const patchSchema = z.object({
  name: base.name.optional(), namePlural: base.namePlural.optional(), icon: base.icon.optional(), financialFlow: base.financialFlow.optional(),
  customFields: base.customFields.optional(), pipeline: pipelineSchema.optional(),
  /** removed stage key -> stage key (of the new pipeline) its leads move to */
  moves: z.record(z.string(), z.string()).optional(),
})

export const slugKey = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40)

type Tx = Prisma.TransactionClient
async function withLockedConfig<T>(lineId: string, fn: (tx: Tx, config: z.infer<typeof businessLineConfigSchema>) => Promise<{ config: z.infer<typeof businessLineConfigSchema>; result: T }>): Promise<T> {
  return db.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<{ config: unknown }[]>`SELECT config FROM "BusinessLine" WHERE id = ${lineId} FOR UPDATE`
    if (!rows[0]) throw new ConfigError('Linia nu există', 404)
    const parsed = businessLineConfigSchema.safeParse(rows[0].config)
    if (!parsed.success) throw new ConfigError('Configurația liniei este invalidă și nu poate fi editată automat', 422)
    const out = await fn(tx, parsed.data)
    await tx.businessLine.update({ where: { id: lineId }, data: { config: out.config as unknown as Prisma.InputJsonValue } })
    return out.result
  }, { timeout: 30_000 })
}

/** Leads per entity type and status, so the UI can show what each stage holds. */
export async function leadCounts(lineIds?: string[]) {
  const rows = await db.lead.groupBy({ by: ['businessLineId', 'entityType', 'status'], where: lineIds ? { businessLineId: { in: lineIds } } : undefined, _count: { _all: true } })
  const out: Record<string, Record<string, Record<string, number>>> = {}
  for (const r of rows) ((out[r.businessLineId] ??= {})[r.entityType] ??= {})[r.status] = r._count._all
  return out
}

export async function createEntityType(lineId: string, raw: unknown) {
  const input = createSchema.parse(raw)
  return withLockedConfig(lineId, async (tx, config) => {
    const id = input.id ?? (slugKey(input.namePlural) || 'entitate')
    if (config.entityTypes.some((e) => e.id === id)) throw new ConfigError(`Există deja un tip cu id „${id}”`, 409)
    const et = entityTypeSchema.parse({ id, name: input.name, namePlural: input.namePlural, icon: input.icon, financialFlow: input.financialFlow, pipeline: input.pipeline, customFields: input.customFields })
    return { config: { ...config, entityTypes: [...config.entityTypes, et] }, result: et }
  })
}

export async function updateEntityType(lineId: string, etId: string, raw: unknown) {
  const patch = patchSchema.parse(raw)
  return withLockedConfig(lineId, async (tx, config) => {
    const cur = config.entityTypes.find((e) => e.id === etId)
    if (!cur) throw new ConfigError('Tipul de entitate nu există', 404)
    let moved = 0
    if (patch.pipeline) {
      const next = new Set(patch.pipeline.map((s) => s.key))
      const removed = cur.pipeline.map((s) => s.key).filter((k) => !next.has(k))
      if (removed.length) {
        const groups = await tx.lead.groupBy({ by: ['status'], where: { businessLineId: lineId, entityType: etId, status: { in: removed } }, _count: { _all: true } })
        for (const g of groups) {
          const target = patch.moves?.[g.status]
          if (!target) throw new ConfigError(`Etapa „${g.status}” are ${g._count._all} lead-uri; alege etapa în care se mută`, 409, { stage: g.status, count: g._count._all })
          if (!next.has(target)) throw new ConfigError(`Etapa țintă „${target}” nu există în pipeline-ul nou`, 400)
        }
        for (const g of groups) {
          const r = await tx.lead.updateMany({ where: { businessLineId: lineId, entityType: etId, status: g.status }, data: { status: patch.moves![g.status]! } })
          moved += r.count
        }
      }
    }
    const updated = entityTypeSchema.parse({
      ...cur,
      ...(patch.name !== undefined && { name: patch.name }), ...(patch.namePlural !== undefined && { namePlural: patch.namePlural }),
      ...(patch.icon !== undefined && { icon: patch.icon }), ...(patch.financialFlow !== undefined && { financialFlow: patch.financialFlow }),
      ...(patch.customFields !== undefined && { customFields: patch.customFields }), ...(patch.pipeline !== undefined && { pipeline: patch.pipeline }),
    })
    return { config: { ...config, entityTypes: config.entityTypes.map((e) => (e.id === etId ? updated : e)) }, result: { entityType: updated, movedLeads: moved } }
  })
}

export async function deleteEntityType(lineId: string, etId: string) {
  return withLockedConfig(lineId, async (tx, config) => {
    if (!config.entityTypes.some((e) => e.id === etId)) throw new ConfigError('Tipul de entitate nu există', 404)
    if (config.entityTypes.length === 1) throw new ConfigError('Linia trebuie să păstreze cel puțin un tip de entitate', 409)
    const [leads, clients] = await Promise.all([
      tx.lead.count({ where: { businessLineId: lineId, entityType: etId } }),
      tx.client.count({ where: { businessLineId: lineId, entityType: etId } }),
    ])
    if (leads || clients) throw new ConfigError(`Tipul este folosit de ${leads} lead-uri și ${clients} clienți; nu poate fi șters`, 409, { leads, clients })
    return { config: { ...config, entityTypes: config.entityTypes.filter((e) => e.id !== etId) }, result: { ok: true } }
  })
}

/** Admin operations on website rules. Scoped to one business line; callers are admin-guarded. */
import { db, Prisma } from '@repo/db'
import { z } from 'zod'
import { AdminError } from '../admin/errors'
import { assertLine } from '../admin/service'
import { conditionsSchema, DEFAULT_MAX_PRICE_RON, parseAction } from './actions'
import { resolveRule } from './engine'
import { FIELD_RE, RULE_KINDS, type Facts, type RuleKind, type RuleLike } from './types'

const MAX_RULES_PER_KIND = 100
const PAGE_SIZE = 30

const date = z.union([z.string().datetime({ offset: true }), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]).nullish().transform((v) => (v ? new Date(v) : null))
const kindEnum = z.enum(RULE_KINDS)

const ruleBody = {
  name: z.string().trim().min(1).max(80),
  priority: z.number().int().min(0).max(100_000),
  isActive: z.boolean(),
  conditions: conditionsSchema,
  action: z.unknown(),
  validFrom: date, validTo: date,
}
const createSchema = z.object({ kind: kindEnum, ...ruleBody, priority: ruleBody.priority.optional(), isActive: ruleBody.isActive.default(true), conditions: ruleBody.conditions.default([]) })
const patchSchema = z.object(ruleBody).partial()

/** Facts for the simulator and for real evaluations: whitelisted keys, scalar or list values. */
export const factsSchema = z.record(
  z.string().regex(FIELD_RE, 'Fapt necunoscut'),
  z.union([z.string().max(200), z.number(), z.boolean(), z.array(z.string().max(200)).max(50), z.null()]),
).refine((o) => Object.keys(o).length <= 40, 'Prea multe fapte')

type RuleRow = Awaited<ReturnType<typeof db.websiteRule.findFirstOrThrow>>
const toLike = (r: RuleRow): RuleLike => ({
  id: r.id, kind: r.kind as RuleKind, name: r.name, priority: r.priority, isActive: r.isActive,
  conditions: r.conditions as never, action: r.action, validFrom: r.validFrom, validTo: r.validTo, createdAt: r.createdAt,
})
const snapshot = (r: RuleRow) => ({ name: r.name, priority: r.priority, isActive: r.isActive, conditions: r.conditions, action: r.action, validFrom: r.validFrom, validTo: r.validTo })

export async function getLimits(lineId: string) {
  const ch = await db.websiteChannel.findUnique({ where: { businessLineId: lineId }, select: { config: true } })
  const cfg = (ch?.config ?? {}) as { maxPriceRon?: unknown }
  return { maxPriceRon: typeof cfg.maxPriceRon === 'number' && cfg.maxPriceRon > 0 ? cfg.maxPriceRon : DEFAULT_MAX_PRICE_RON }
}

async function audit(tx: Prisma.TransactionClient, lineId: string, userId: string | null, a: { ruleId: string | null; kind: string; action: 'create' | 'update' | 'delete' | 'reorder'; before?: unknown; after?: unknown }) {
  await tx.websiteRuleAudit.create({
    data: { businessLineId: lineId, ruleId: a.ruleId, kind: a.kind, action: a.action, userId, beforeData: (a.before ?? undefined) as Prisma.InputJsonValue | undefined, afterData: (a.after ?? undefined) as Prisma.InputJsonValue | undefined },
  })
}

export async function listRules(lineId: string, kind?: string) {
  await assertLine(lineId)
  const k = kind ? kindEnum.safeParse(kind) : null
  if (k && !k.success) throw new AdminError('Tip de regulă necunoscut', 400)
  const rows = await db.websiteRule.findMany({ where: { businessLineId: lineId, ...(k?.success ? { kind: k.data } : {}) }, orderBy: [{ kind: 'asc' }, { priority: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }] })
  return { limits: await getLimits(lineId), items: rows }
}

export async function createRule(lineId: string, userId: string | null, raw: unknown) {
  await assertLine(lineId)
  const input = createSchema.parse(raw)
  const action = parseAction(input.kind, input.action, await getLimits(lineId))
  if (input.validFrom && input.validTo && input.validTo <= input.validFrom) throw new AdminError('Data de sfârșit trebuie să fie după cea de început', 422)

  return db.$transaction(async (tx) => {
    // serialise concurrent writers of the same line so the limit and the default priority are exact
    await tx.$queryRaw`SELECT id FROM "BusinessLine" WHERE id = ${lineId} FOR UPDATE`
    const existing = await tx.websiteRule.findMany({ where: { businessLineId: lineId, kind: input.kind }, select: { priority: true } })
    if (existing.length >= MAX_RULES_PER_KIND) throw new AdminError(`Maxim ${MAX_RULES_PER_KIND} de reguli pe tip`, 409)
    const priority = input.priority ?? (existing.length ? Math.max(...existing.map((r) => r.priority)) + 10 : 10)
    const row = await tx.websiteRule.create({
      data: { businessLineId: lineId, kind: input.kind, name: input.name, priority, isActive: input.isActive, conditions: input.conditions as unknown as Prisma.InputJsonValue, action: action as Prisma.InputJsonValue, validFrom: input.validFrom, validTo: input.validTo, createdBy: userId, updatedBy: userId },
    })
    await audit(tx, lineId, userId, { ruleId: row.id, kind: row.kind, action: 'create', after: snapshot(row) })
    return row
  })
}

export async function updateRule(lineId: string, id: string, userId: string | null, raw: unknown) {
  await assertLine(lineId)
  const input = patchSchema.parse(raw)
  return db.$transaction(async (tx) => {
    const before = await tx.websiteRule.findFirst({ where: { id, businessLineId: lineId } })
    if (!before) throw new AdminError('Regula nu există', 404)
    // the kind never changes, so the action is always validated against the rule's own kind
    const action = input.action !== undefined ? parseAction(before.kind as RuleKind, input.action, await getLimits(lineId)) : undefined
    const validFrom = input.validFrom !== undefined ? input.validFrom : before.validFrom
    const validTo = input.validTo !== undefined ? input.validTo : before.validTo
    if (validFrom && validTo && validTo <= validFrom) throw new AdminError('Data de sfârșit trebuie să fie după cea de început', 422)
    const row = await tx.websiteRule.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}), ...(input.priority !== undefined ? { priority: input.priority } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        ...(input.conditions !== undefined ? { conditions: input.conditions as unknown as Prisma.InputJsonValue } : {}),
        ...(action !== undefined ? { action: action as Prisma.InputJsonValue } : {}),
        ...(input.validFrom !== undefined ? { validFrom: input.validFrom } : {}), ...(input.validTo !== undefined ? { validTo: input.validTo } : {}),
        updatedBy: userId,
      },
    })
    await audit(tx, lineId, userId, { ruleId: id, kind: row.kind, action: 'update', before: snapshot(before), after: snapshot(row) })
    return row
  })
}

export async function deleteRule(lineId: string, id: string, userId: string | null) {
  await assertLine(lineId)
  await db.$transaction(async (tx) => {
    const before = await tx.websiteRule.findFirst({ where: { id, businessLineId: lineId } })
    if (!before) throw new AdminError('Regula nu există', 404)
    await tx.websiteRule.delete({ where: { id } })
    await audit(tx, lineId, userId, { ruleId: id, kind: before.kind, action: 'delete', before: snapshot(before) })
  })
  return { deleted: id }
}

/** `ids` must be exactly the rules of that kind, in the new order (10, 20, 30…). */
export async function reorderRules(lineId: string, userId: string | null, raw: unknown) {
  await assertLine(lineId)
  const { kind, ids } = z.object({ kind: kindEnum, ids: z.array(z.string().min(1)).max(MAX_RULES_PER_KIND) }).parse(raw)
  if (new Set(ids).size !== ids.length) throw new AdminError('Listă cu duplicate', 422)
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "BusinessLine" WHERE id = ${lineId} FOR UPDATE`
    const rows = await tx.websiteRule.findMany({ where: { businessLineId: lineId, kind }, orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }] })
    const have = new Set(rows.map((r) => r.id))
    if (rows.length !== ids.length || ids.some((i) => !have.has(i))) throw new AdminError('Lista nu conține exact regulile acestui tip (s-a modificat între timp?). Reîncarcă.', 409)
    await Promise.all(ids.map((id, i) => tx.websiteRule.update({ where: { id }, data: { priority: (i + 1) * 10, updatedBy: userId } })))
    await audit(tx, lineId, userId, { ruleId: null, kind, action: 'reorder', before: { order: rows.map((r) => r.id) }, after: { order: ids } })
    return { kind, order: ids }
  })
}

/** What would apply for a situation, and why: used by the simulator and by the delivery pipeline. */
export async function simulate(lineId: string, raw: unknown) {
  await assertLine(lineId)
  const { kind, facts, at } = z.object({ kind: kindEnum, facts: factsSchema.default({}), at: date.optional() }).parse(raw)
  const rows = await db.websiteRule.findMany({ where: { businessLineId: lineId, kind } })
  return resolveRule(kind, facts as Facts, rows.map(toLike), at ?? new Date())
}

export async function listAudit(lineId: string, q: { ruleId?: string; page?: number }) {
  await assertLine(lineId)
  const page = Math.max(1, Math.min(q.page ?? 1, 10_000))
  const where: Prisma.WebsiteRuleAuditWhereInput = { businessLineId: lineId, ...(q.ruleId ? { ruleId: q.ruleId } : {}) }
  const [total, items] = await Promise.all([
    db.websiteRuleAudit.count({ where }),
    db.websiteRuleAudit.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
  ])
  return { total, page, pageSize: PAGE_SIZE, items }
}

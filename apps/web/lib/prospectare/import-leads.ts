/**
 * Lead import from the prepared prospecting CSV: plan (read-only), apply (writes) and rollback.
 *
 * - planImport never writes. It validates the target line / entity type / status, maps and checks every row, drops rows already imported
 *   (Lead has @@unique([externalId, externalSource]), so a re-run adds nothing) and flags firms that already exist elsewhere in the CRM.
 * - applyImport inserts the planned rows in batches (createMany, skipDuplicates). Safe to re-run after an interruption.
 * - rollbackImport deletes the leads of one import source on one line, but only those nobody has touched.
 */
import fs from 'node:fs'
import { parse } from 'csv-parse/sync'
import { db, Prisma } from '@repo/db'
import { applyOverlap, mapRow, nationalPhone, type CrmOverlap, type CsvRow } from './import-mapping'

export const DEFAULT_SOURCE = 'prospectare_risco'

export interface ImportOptions {
  file: string
  /** BusinessLine.slug */
  line: string
  entityType?: string
  status?: string
  source?: string
  /** only the first N rows (testing) */
  limit?: number
}

export interface ImportPlan {
  line: { id: string; slug: string; name: string }
  entityType: string
  status: string
  source: string
  externalSources: string[]
  rowsRead: number
  toCreate: Prisma.LeadCreateManyInput[]
  skippedExisting: number
  invalid: { row: number; externalId: string; reason: string }[]
  warnings: Record<string, number>
  stats: Record<string, number>
  overlapByLine: Record<string, number>
}

const chunk = <T>(a: T[], n: number): T[][] => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, (i + 1) * n))

export function readCsv(file: string): CsvRow[] {
  if (!fs.existsSync(file)) throw new Error(`Fișierul nu există: ${file}`)
  return parse(fs.readFileSync(file, 'utf8'), { columns: true, bom: true, skip_empty_lines: true, trim: false }) as CsvRow[]
}

async function resolveTarget(o: ImportOptions) {
  const entityType = o.entityType ?? 'parteneri', status = o.status ?? 'prospect'
  const line = await db.businessLine.findUnique({ where: { slug: o.line }, select: { id: true, slug: true, name: true, config: true } })
  if (!line) throw new Error(`Linia „${o.line}” nu există`)
  const types = ((line.config as { entityTypes?: { id: string; pipeline?: { key: string }[] }[] } | null)?.entityTypes) ?? []
  const et = types.find((t) => t.id === entityType)
  if (!et) throw new Error(`Linia „${o.line}” nu are tipul „${entityType}” (are: ${types.map((t) => t.id).join(', ') || 'niciunul'})`)
  if (!(et.pipeline ?? []).some((s) => s.key === status)) throw new Error(`Tipul „${entityType}” nu are etapa „${status}” (are: ${(et.pipeline ?? []).map((s) => s.key).join(', ')})`)
  return { line: { id: line.id, slug: line.slug, name: line.name }, entityType, status }
}

export async function planImport(o: ImportOptions): Promise<ImportPlan> {
  const { line, entityType, status } = await resolveTarget(o)
  const source = o.source ?? DEFAULT_SOURCE
  let rows = readCsv(o.file)
  if (o.limit) rows = rows.slice(0, o.limit)

  const warnings: Record<string, number> = {}
  const invalid: ImportPlan['invalid'] = []
  const seen = new Set<string>()
  const mapped: { lead: Prisma.LeadCreateManyInput; keys: { phones: string[]; emails: string[]; cui: string | null } }[] = []
  rows.forEach((row, i) => {
    const r = mapRow(row, { businessLineId: line.id, entityType, status, source })
    const rowNo = i + 2 // header is row 1
    if (!r.ok) { invalid.push({ row: rowNo, externalId: row.externalId ?? '', reason: r.reason }); return }
    const k = `${r.lead.externalSource}\u0000${r.lead.externalId}`
    if (seen.has(k)) { invalid.push({ row: rowNo, externalId: r.lead.externalId!, reason: 'duplicat în fișier' }); return }
    seen.add(k)
    for (const w of r.warnings) warnings[w] = (warnings[w] ?? 0) + 1
    mapped.push({ lead: r.lead, keys: r.keys })
  })

  // already imported (same externalSource + externalId): nothing is added or changed for them
  const externalSources = [...new Set(mapped.map((m) => m.lead.externalSource!))]
  const existing = new Set<string>()
  for (const part of chunk(mapped.map((m) => m.lead.externalId!), 5000)) {
    const found = await db.lead.findMany({ where: { externalSource: { in: externalSources }, externalId: { in: part } }, select: { externalId: true, externalSource: true } })
    for (const f of found) existing.add(`${f.externalSource}\u0000${f.externalId}`)
  }
  const fresh = mapped.filter((m) => !existing.has(`${m.lead.externalSource}\u0000${m.lead.externalId}`))

  // firms that already exist elsewhere in the CRM (any line), by CUI, phone or email; earlier runs of this import do not count
  const crm = await db.lead.findMany({
    // NOT IN alone would drop leads whose externalSource is NULL (SQL three-valued logic), i.e. most of the CRM
    where: { deletedAt: null, OR: [{ externalSource: null }, { externalSource: { notIn: externalSources } }] },
    select: { id: true, entityType: true, cui: true, phone: true, phone2: true, phone3: true, email: true, email2: true, businessLine: { select: { slug: true } } },
  })
  const byCui = new Map<string, number[]>(), byPhone = new Map<string, number[]>(), byEmail = new Map<string, number[]>()
  const add = (m: Map<string, number[]>, k: string | null | undefined, i: number) => { if (k) (m.get(k) ?? m.set(k, []).get(k)!).push(i) }
  crm.forEach((l, i) => {
    add(byCui, l.cui?.replace(/^0+/, ''), i)
    for (const p of [l.phone, l.phone2, l.phone3]) add(byPhone, nationalPhone(p), i)
    for (const e of [l.email, l.email2]) add(byEmail, e && e.includes('@') ? e.trim().toLowerCase() : null, i)
  })
  const overlapByLine: Record<string, number> = {}
  for (const m of fresh) {
    const hits = new Map<number, Set<string>>()
    const note = (idxs: number[] | undefined, how: string) => idxs?.forEach((i) => (hits.get(i) ?? hits.set(i, new Set()).get(i)!).add(how))
    note(m.keys.cui ? byCui.get(m.keys.cui.replace(/^0+/, '')) : undefined, 'cui')
    for (const p of m.keys.phones) note(byPhone.get(p), 'telefon')
    for (const e of m.keys.emails) note(byEmail.get(e), 'email')
    const overlaps: CrmOverlap[] = [...hits].map(([i, how]) => ({ leadId: crm[i]!.id, linie: crm[i]!.businessLine.slug, tip: crm[i]!.entityType, potrivire: [...how].sort().join('+') }))
    applyOverlap(m.lead, overlaps)
    for (const l of new Set(overlaps.map((x) => x.linie))) overlapByLine[l] = (overlapByLine[l] ?? 0) + 1
  }

  const cf = (m: (typeof fresh)[number]) => m.lead.customFields as Record<string, any>
  const stats: Record<string, number> = {
    fara_contact: fresh.filter((m) => cf(m).fara_contact === 'da').length,
    suprapunere_crm: fresh.filter((m) => cf(m).suprapunere_crm === 'da').length,
    email_na: fresh.filter((m) => m.lead.email === 'N/A').length,
    contactPerson_na: fresh.filter((m) => m.lead.contactPerson === 'N/A').length,
    fara_telefon: fresh.filter((m) => !m.lead.phone).length,
    cu_mobil: fresh.filter((m) => cf(m).are_mobil === 'da').length,
    cu_email: fresh.filter((m) => m.lead.email !== 'N/A').length,
    contact_partajat: fresh.filter((m) => cf(m).contact_partajat === 'da').length,
    pagini_aurii: fresh.filter((m) => cf(m).pagini_aurii === 'da').length,
    fonduri_digitalizare: fresh.filter((m) => cf(m).fonduri_digitalizare === 'da').length,
  }
  return { line, entityType, status, source, externalSources, rowsRead: rows.length, toCreate: fresh.map((m) => m.lead), skippedExisting: mapped.length - fresh.length, invalid, warnings, stats, overlapByLine }
}

/** Compact, printable summary (no row data except three samples). */
export function summarize(p: ImportPlan) {
  return {
    tinta: { linie: `${p.line.name} (${p.line.slug})`, tip: p.entityType, etapa: p.status, source: p.source, externalSource: p.externalSources },
    randuri_citite: p.rowsRead, de_creat: p.toCreate.length, deja_importate_sarite: p.skippedExisting, invalide: p.invalid.length,
    avertismente: p.warnings, statistici: p.stats, suprapuneri_pe_linie: p.overlapByLine,
    invalide_exemple: p.invalid.slice(0, 20),
    exemple: p.toCreate.slice(0, 3),
  }
}

/** Writing needs --confirm-count equal to what the dry run announced: a wrong file, line or filter cannot slip through. */
export function checkConfirm(planned: number, confirm: string | undefined): void {
  if (confirm === undefined) throw new Error(`Pentru scriere adaugă --confirm-count=${planned} (numărul anunțat de rularea de probă).`)
  if (!/^\d+$/.test(confirm) || Number(confirm) !== planned) throw new Error(`--confirm-count=${confirm} nu corespunde planului (${planned} de creat). Nu s-a scris nimic.`)
}

export async function applyImport(p: ImportPlan, o: { batchSize?: number; onProgress?: (done: number, total: number) => void } = {}) {
  let created = 0
  for (const part of chunk(p.toCreate, o.batchSize ?? 500)) {
    const r = await db.lead.createMany({ data: part, skipDuplicates: true })
    created += r.count
    o.onProgress?.(created, p.toCreate.length)
  }
  return { created, planned: p.toCreate.length }
}

export interface RollbackResult { found: number; deletable: number; touched: number; deleted: number; touchedReasons: Record<string, number> }

/** Deletes the untouched leads of one import. A lead counts as touched when it has campaigns, communications, activities, was converted,
 *  edited (notes, owner, next action), moved to another stage, opted out, or modified after creation. */
export async function rollbackImport(o: { line: string; source: string; externalSource?: string; status?: string; apply: boolean }): Promise<RollbackResult> {
  const where: Prisma.LeadWhereInput = { businessLine: { slug: o.line }, source: o.source, ...(o.externalSource ? { externalSource: o.externalSource } : { externalSource: { not: null } }) }
  const rows = await db.lead.findMany({
    where,
    select: { id: true, createdAt: true, updatedAt: true, status: true, notes: true, assignedTo: true, nextAction: true, convertedToId: true, optOut: true,
              _count: { select: { campaignLeads: true, communications: true, activities: true } } },
  })
  const touchedReasons: Record<string, number> = {}
  const why = (r: (typeof rows)[number]): string | null => {
    if (r._count.campaignLeads) return 'campanii'
    if (r._count.communications) return 'comunicări'
    if (r._count.activities) return 'activități'
    if (r.convertedToId) return 'convertit'
    if (r.notes || r.assignedTo || r.nextAction) return 'editat (note/responsabil/acțiune)'
    if (r.optOut) return 'opt-out'
    if (o.status && r.status !== o.status) return 'etapă schimbată'
    if (r.updatedAt.getTime() - r.createdAt.getTime() > 5000) return 'modificat după creare'
    return null
  }
  const deletable: string[] = []
  for (const r of rows) {
    const w = why(r)
    if (w) touchedReasons[w] = (touchedReasons[w] ?? 0) + 1
    else deletable.push(r.id)
  }
  let deleted = 0
  if (o.apply) for (const part of chunk(deletable, 1000)) deleted += (await db.lead.deleteMany({ where: { id: { in: part } } })).count
  return { found: rows.length, deletable: deletable.length, touched: rows.length - deletable.length, deleted, touchedReasons }
}

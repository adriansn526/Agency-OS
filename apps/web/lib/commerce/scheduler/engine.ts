/**
 * In-app scheduler for the commerce jobs. State lives in the database; the process only wakes up every 30 s and runs what is due.
 *
 *  - master switch (CommerceSchedulerState.enabled) and a per-job switch, both OFF until someone turns them on in /commerce/schedules
 *  - one run of a job at a time across ALL processes: the lock is an UPDATE … WHERE "runningSince" IS NULL (stale after timeout + 5 min)
 *  - no catch-up storms: after a run the next time is computed from "now"; a due run that is later than the job's grace period
 *    (server was restarting/down) is recorded as "missed" and skipped
 *  - manual runs ("Rulează acum" / "Dry-run") use the same lock and never move the schedule
 */
import { randomUUID } from 'node:crypto'
import { db, Prisma } from '@repo/db'
import { sendSyncAlert } from '../sync/alerts'
import { JOBS, type JobDef, type JobResult } from './jobs'
import { ScheduleSchema, describeSchedule, nextRun, type Schedule } from './schedule'

export const INSTANCE_ID = `${process.pid}-${randomUUID().slice(0, 8)}`
const TICK_MS = 30_000
const ALIVE_MS = 90_000
const STALE_EXTRA_MS = 5 * 60_000

export class SchedulerError extends Error {
  constructor(message: string, readonly status = 400) { super(message) }
}

export interface Deps { jobs?: Record<string, JobDef>; now?: () => Date; alert?: typeof sendSyncAlert }
const reg = (d?: Deps) => d?.jobs ?? JOBS
const clock = (d?: Deps) => (d?.now ?? (() => new Date()))()

// ─── state & seeding ───

export async function ensureState() {
  await db.commerceSchedulerState.upsert({ where: { id: 'main' }, update: {}, create: { id: 'main', enabled: false } })
  return db.commerceSchedulerState.findUniqueOrThrow({ where: { id: 'main' } })
}

/** Registered jobs get a row the first time they are seen (disabled, default schedule). Never overwrites a configured row. */
export async function ensureJobs(d?: Deps) {
  for (const def of Object.values(reg(d))) {
    await db.commerceScheduledJob.upsert({ where: { key: def.key }, update: {}, create: { key: def.key, schedule: def.defaultSchedule as unknown as Prisma.InputJsonValue, enabled: false } })
  }
}

export async function setSchedulerEnabled(enabled: boolean) {
  await ensureState()
  await db.commerceSchedulerState.update({ where: { id: 'main' }, data: { enabled } })
}

function parseSchedule(raw: unknown, def: JobDef): Schedule {
  const p = ScheduleSchema.safeParse(raw)
  return p.success ? p.data : def.defaultSchedule
}

export async function updateJob(key: string, input: { enabled?: boolean; schedule?: unknown }, d?: Deps) {
  const def = reg(d)[key]
  if (!def) throw new SchedulerError('Job necunoscut', 404)
  await ensureJobs(d)
  const row = await db.commerceScheduledJob.findUniqueOrThrow({ where: { key } })
  const data: Prisma.CommerceScheduledJobUpdateInput = {}
  let schedule = parseSchedule(row.schedule, def)
  if (input.schedule !== undefined) {
    const p = ScheduleSchema.safeParse(input.schedule)
    if (!p.success) throw new SchedulerError(p.error.issues.map((i) => i.message).join('; '))
    schedule = p.data
    data.schedule = schedule as unknown as Prisma.InputJsonValue
  }
  const enabled = input.enabled ?? row.enabled
  if (input.enabled !== undefined) data.enabled = input.enabled
  // The next run is always recomputed from now when something that affects it changes
  if (input.enabled !== undefined || input.schedule !== undefined) data.nextRunAt = enabled ? nextRun(schedule, clock(d)) : null
  await db.commerceScheduledJob.update({ where: { key }, data })
}

// ─── running ───

async function claim(key: string, opts: { scheduled: boolean; staleMs: number; now: Date }): Promise<boolean> {
  const stale = new Date(opts.now.getTime() - opts.staleMs)
  const rows = await db.$queryRaw<Array<{ id: string }>>`
    UPDATE "CommerceScheduledJob" SET "runningSince" = ${opts.now}, "runningBy" = ${INSTANCE_ID}, "updatedAt" = now()
    WHERE key = ${key} AND ("runningSince" IS NULL OR "runningSince" < ${stale})
      AND (${!opts.scheduled}::boolean OR (enabled AND "nextRunAt" <= ${opts.now}))
    RETURNING id`
  return rows.length > 0
}

const withTimeout = <T>(p: Promise<T>, ms: number) =>
  new Promise<T>((resolve, reject) => { const t = setTimeout(() => reject(new Error(`Jobul a depășit timpul maxim (${Math.round(ms / 60_000)} min)`)), ms); p.then((v) => { clearTimeout(t); resolve(v) }, (e) => { clearTimeout(t); reject(e) }) })

/** Runs a job whose lock is already held by this process, records the run, releases the lock. */
async function execute(def: JobDef, o: { trigger: 'schedule' | 'manual'; dryRun: boolean; by: string | null }, d?: Deps): Promise<JobResult> {
  const run = await db.commerceScheduledJobRun.create({ data: { jobKey: def.key, trigger: o.trigger, dryRun: o.dryRun, startedBy: o.by } })
  const t0 = Date.now()
  let result: JobResult
  try { result = await withTimeout(def.run({ dryRun: o.dryRun }), def.timeoutMs) }
  catch (e) { result = { status: 'failed', summary: {}, error: e instanceof Error ? e.message : String(e) } }
  const dur = Date.now() - t0
  try {
    await db.commerceScheduledJobRun.update({ where: { id: run.id }, data: { status: result.status, finishedAt: new Date(), durationMs: dur, summary: result.summary as Prisma.InputJsonValue, error: result.error ? result.error.slice(0, 1500) : null } })
    const row = await db.commerceScheduledJob.findUnique({ where: { key: def.key } })
    const data: Prisma.CommerceScheduledJobUpdateInput = {
      runningSince: null, runningBy: null, lastRunAt: new Date(t0), lastStatus: result.status, lastDurationMs: dur,
      lastSummary: { ...result.summary, dryRun: o.dryRun, trigger: o.trigger } as Prisma.InputJsonValue, lastError: result.error ? result.error.slice(0, 1500) : null,
    }
    if (o.trigger === 'schedule' && row?.enabled) data.nextRunAt = nextRun(parseSchedule(row.schedule, def), clock(d))
    await db.commerceScheduledJob.update({ where: { key: def.key }, data })
  } finally {
    // The lock must never outlive the run, whatever happened while recording it
    await db.commerceScheduledJob.updateMany({ where: { key: def.key, runningBy: INSTANCE_ID }, data: { runningSince: null, runningBy: null } }).catch(() => undefined)
  }
  if (o.trigger === 'schedule' && result.status === 'failed') {
    await (d?.alert ?? sendSyncAlert)({ severity: 'medium', title: `programare eșuată: ${def.label}`, lines: [result.error ?? 'eroare necunoscută'] }).catch(() => false)
  }
  return result
}

let inTick = false

/** One scheduler pass: heartbeat, then run every enabled job that is due (sequentially). Returns the keys it ran. */
export async function tick(d?: Deps): Promise<string[]> {
  if (inTick) return []
  inTick = true
  const ran: string[] = []
  try {
    const state = await ensureState()
    await db.commerceSchedulerState.update({ where: { id: 'main' }, data: { heartbeatAt: new Date(), instanceId: INSTANCE_ID } })
    if (!state.enabled) return ran
    await ensureJobs(d)
    const now = clock(d)
    const due = await db.commerceScheduledJob.findMany({ where: { enabled: true, nextRunAt: { lte: now }, key: { in: Object.keys(reg(d)) } }, orderBy: { nextRunAt: 'asc' } })
    for (const row of due) {
      const def = reg(d)[row.key]!
      const late = now.getTime() - row.nextRunAt!.getTime()
      if (late > def.graceMs) {
        await db.commerceScheduledJobRun.create({ data: { jobKey: def.key, trigger: 'schedule', status: 'missed', startedAt: now, finishedAt: now, durationMs: 0, summary: { dueAt: row.nextRunAt!.toISOString(), lateMinutes: Math.round(late / 60_000) } } })
        await db.commerceScheduledJob.update({ where: { key: def.key }, data: { nextRunAt: nextRun(parseSchedule(row.schedule, def), now), lastStatus: 'missed' } })
        continue
      }
      if (!(await claim(def.key, { scheduled: true, staleMs: def.timeoutMs + STALE_EXTRA_MS, now }))) continue
      await execute(def, { trigger: 'schedule', dryRun: false, by: null }, d)
      ran.push(def.key)
    }
  } catch (e) {
    console.error('[scheduler] tick failed:', e instanceof Error ? e.message : e)
  } finally { inTick = false }
  return ran
}

const inFlight = new Set<Promise<unknown>>()

/** "Rulează acum" / "Dry-run": starts in the background; refuses if the job is already running. */
export async function runNow(key: string, o: { dryRun: boolean; by: string | null }, d?: Deps): Promise<{ started: true }> {
  const def = reg(d)[key]
  if (!def) throw new SchedulerError('Job necunoscut', 404)
  if (o.dryRun && !def.supportsDryRun) throw new SchedulerError('Jobul nu are dry-run')
  await ensureJobs(d)
  if (!(await claim(key, { scheduled: false, staleMs: def.timeoutMs + STALE_EXTRA_MS, now: clock(d) }))) throw new SchedulerError('Jobul rulează deja', 409)
  const p = execute(def, { trigger: 'manual', dryRun: o.dryRun, by: o.by }, d).catch((e) => console.error('[scheduler] manual run failed:', e instanceof Error ? e.message : e)).finally(() => inFlight.delete(p))
  inFlight.add(p)
  return { started: true }
}

/** Test helper: wait for background manual runs. */
export async function settleManualRuns() { await Promise.allSettled([...inFlight]) }

// ─── overview for the admin page ───

export async function getOverview(d?: Deps) {
  const state = await ensureState()
  await ensureJobs(d)
  const defs = reg(d)
  const [rows, runs] = await Promise.all([
    db.commerceScheduledJob.findMany({ where: { key: { in: Object.keys(defs) } } }),
    db.commerceScheduledJobRun.findMany({ orderBy: { startedAt: 'desc' }, take: 40 }),
  ])
  const now = clock(d).getTime()
  return {
    scheduler: {
      enabled: state.enabled, heartbeatAt: state.heartbeatAt, alive: !!state.heartbeatAt && now - state.heartbeatAt.getTime() < ALIVE_MS,
      instanceId: state.instanceId,
    },
    jobs: Object.values(defs).map((def) => {
      const r = rows.find((x) => x.key === def.key)!
      const schedule = parseSchedule(r.schedule, def)
      return {
        key: def.key, label: def.label, description: def.description, supportsDryRun: def.supportsDryRun,
        enabled: r.enabled, schedule, scheduleText: describeSchedule(schedule), nextRunAt: r.enabled ? r.nextRunAt : null,
        lastRunAt: r.lastRunAt, lastStatus: r.lastStatus, lastDurationMs: r.lastDurationMs, lastSummary: r.lastSummary, lastError: r.lastError,
        running: !!r.runningSince && now - r.runningSince.getTime() < def.timeoutMs + STALE_EXTRA_MS,
      }
    }),
    runs: runs.map((r) => ({ id: r.id, jobKey: r.jobKey, label: defs[r.jobKey]?.label ?? r.jobKey, trigger: r.trigger, dryRun: r.dryRun, status: r.status, startedAt: r.startedAt, durationMs: r.durationMs, summary: r.summary, error: r.error })),
  }
}

/** Which integration secrets are configured (never their values). */
export function connectionStatus(env = process.env) {
  const has = (k: string) => !!env[k] && env[k]!.length > 0
  return [
    { key: 'COMMERCE_FTP_PASSWORD', label: 'Parolă FTP furnizor', ok: has('COMMERCE_FTP_PASSWORD'), usedBy: 'Sincronizare preț și stoc' },
    { key: 'GOOGLE_MAPS_API_KEY', label: 'Cheie Google Maps / Places', ok: has('GOOGLE_MAPS_API_KEY'), usedBy: 'Căutare service-uri, coordonate' },
    { key: 'NOMINATIM_USER_AGENT', label: 'User-Agent OpenStreetMap', ok: has('NOMINATIM_USER_AGENT'), usedBy: 'Geocodare adrese (recomandat)' },
    { key: 'TELEGRAM_BOT_TOKEN', label: 'Telegram (alerte)', ok: has('TELEGRAM_BOT_TOKEN') && has('TELEGRAM_CHAT_ID'), usedBy: 'Alerte la eșec' },
  ]
}

// ─── lifecycle ───

/** Starts the 30 s loop once per process. Production only (dev servers never run jobs); SCHEDULER_DISABLED=1 is the env kill switch. */
export function startScheduler(): boolean {
  const g = globalThis as unknown as { __commerceScheduler?: NodeJS.Timeout }
  if (g.__commerceScheduler) return false
  const prod = process.env.NODE_ENV === 'production' || process.env.SCHEDULER_FORCE === '1'
  if (!prod || process.env.SCHEDULER_DISABLED === '1') return false
  setTimeout(() => void tick(), 20_000).unref()
  g.__commerceScheduler = setInterval(() => void tick(), TICK_MS)
  g.__commerceScheduler.unref()
  console.log(`[scheduler] started (${INSTANCE_ID}); jobs run only when enabled in /commerce/schedules`)
  return true
}

/** Run with: npx tsx --test lib/commerce/scheduler/__tests__/*.test.ts */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ScheduleSchema, describeSchedule, nextRun, timesOfDay, zonedToUtc, type Schedule } from '../schedule'

const sch = (o: unknown) => ScheduleSchema.parse(o)
const iso = (d: Date | null) => d?.toISOString() ?? null
const ALL = [1, 2, 3, 4, 5, 6, 7]

test('times mode: next fixed time, same day or next day (Romania is UTC+3 in summer)', () => {
  const s = sch({ mode: 'times', days: ALL, times: ['13:30', '15:30'] })
  assert.equal(iso(nextRun(s, new Date('2026-07-10T09:00:00Z'))), '2026-07-10T10:30:00.000Z') // 13:30 EEST
  assert.equal(iso(nextRun(s, new Date('2026-07-10T10:30:00Z'))), '2026-07-10T12:30:00.000Z') // strictly after → 15:30
  assert.equal(iso(nextRun(s, new Date('2026-07-10T13:00:00Z'))), '2026-07-11T10:30:00.000Z')
})
test('interval mode produces the window; weekdays are respected', () => {
  const s = sch({ mode: 'interval', days: ALL, everyHours: 2, from: '05:00', to: '13:00' })
  assert.deepEqual(timesOfDay(s), ['05:00', '07:00', '09:00', '11:00', '13:00'])
  const wk = sch({ mode: 'times', days: [1, 2, 3, 4, 5], times: ['13:30'] })
  assert.equal(iso(nextRun(wk, new Date('2026-07-10T11:00:00Z'))), '2026-07-13T10:30:00.000Z') // Fri 14:00 local → Monday
  assert.equal(iso(nextRun(wk, new Date('2026-07-11T08:00:00Z'))), '2026-07-13T10:30:00.000Z') // Saturday → Monday
})
test('winter time: UTC+2', () => {
  const s = sch({ mode: 'times', days: ALL, times: ['06:15'] })
  assert.equal(iso(nextRun(s, new Date('2026-12-01T00:00:00Z'))), '2026-12-01T04:15:00.000Z')
})
test('DST: autumn fall-back (2026-10-25) runs once, spring gap (2027-03-28 03:30 does not exist) is skipped', () => {
  const s = sch({ mode: 'times', days: ALL, times: ['03:30'] })
  const first = nextRun(s, new Date('2026-10-24T22:00:00Z'))!
  const second = nextRun(s, first)!
  assert.ok(first.getTime() < new Date('2026-10-25T03:00:00Z').getTime())
  assert.equal(second.toISOString().slice(0, 10) === '2026-10-25', false, 'only one run on the repeated hour')
  const spring = nextRun(s, new Date('2027-03-27T12:00:00Z'))!
  assert.notEqual(spring.toISOString().slice(0, 10), '2027-03-28') // the nonexistent 03:30 is skipped that day
  assert.equal(zonedToUtc(2027, 3, 28, 3, 30), null)
  assert.ok(zonedToUtc(2027, 3, 28, 4, 30) != null)
  // runs before/after the change keep the wall-clock time
  const w = sch({ mode: 'times', days: ALL, times: ['05:00'] })
  // clocks go back at 04:00 EEST (01:00Z) → 05:00 local on the 25th is already winter time (UTC+2)
  assert.equal(iso(nextRun(w, new Date('2026-10-24T12:00:00Z'))), '2026-10-25T03:00:00.000Z')
  assert.equal(iso(nextRun(w, new Date('2026-10-23T12:00:00Z'))), '2026-10-24T02:00:00.000Z') // the day before: still summer (UTC+3)
})
test('validation: bad times, empty days, window order, hours range', () => {
  assert.throws(() => sch({ mode: 'times', days: ALL, times: ['25:00'] }))
  assert.throws(() => sch({ mode: 'times', days: [], times: ['05:00'] }))
  assert.throws(() => sch({ mode: 'times', days: [8], times: ['05:00'] }))
  assert.throws(() => sch({ mode: 'interval', days: ALL, everyHours: 2, from: '13:00', to: '05:00' }))
  assert.throws(() => sch({ mode: 'interval', days: ALL, everyHours: 0, from: '05:00', to: '13:00' }))
  assert.throws(() => sch({ mode: 'weekly', days: ALL }))
  const ok = sch({ mode: 'times', days: [3, 1, 3], times: ['13:30', '05:00', '05:00'] })
  assert.deepEqual([ok.days, (ok as Extract<Schedule, { mode: 'times' }>).times], [[1, 3], ['05:00', '13:30']])
})
test('describeSchedule is readable', () => {
  assert.equal(describeSchedule(sch({ mode: 'times', days: ALL, times: ['06:15'] })), 'zilnic, la 06:15 (ora României)')
  assert.equal(describeSchedule(sch({ mode: 'times', days: [1, 2, 3, 4, 5], times: ['13:30', '15:30'] })), 'Luni–Vineri, la 13:30, 15:30 (ora României)')
  assert.equal(describeSchedule(sch({ mode: 'interval', days: ALL, everyHours: 2, from: '05:00', to: '13:00' })), 'zilnic, la fiecare 2 ore, 05:00–13:00 (ora României)')
})

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dayKey, fmtTimer, monthGrid, OUTCOMES, quickCallbacks, telHref, toLocalInput } from '../call-utils'

test('tel links: national and international Romanian numbers become +40…; junk gives none', () => {
  assert.equal(telHref('0730 808 101'), 'tel:+40730808101'); assert.equal(telHref('+40730808101'), 'tel:+40730808101'); assert.equal(telHref('0040730808101'), 'tel:+40730808101'); assert.equal(telHref('40730808101'), 'tel:+40730808101')
  for (const bad of [null, undefined, '', 'N/A', '123', '07308']) assert.equal(telHref(bad as never), null, String(bad))
})
test('timer format', () => { assert.equal(fmtTimer(0), '00:00'); assert.equal(fmtTimer(65), '01:05'); assert.equal(fmtTimer(3725), '62:05') })
test('quick callbacks are in the future, at 10:00, on weekdays', () => {
  for (const base of ['2026-11-02T08:00:00', '2026-11-05T15:00:00', '2026-11-06T11:00:00', '2026-11-07T09:00:00', '2026-11-08T09:00:00']) {
    const now = new Date(base)
    for (const c of quickCallbacks(now)) { assert.ok(c.at > now, `${base} ${c.label}`); assert.equal(c.at.getHours(), 10); assert.ok(![0, 6].includes(c.at.getDay()), `${base} ${c.label} falls on a weekend`) }
  }
  assert.equal(dayKey(quickCallbacks(new Date('2026-11-06T11:00:00'))[0]!.at), '2026-11-09')   // Friday → tomorrow is Saturday → Monday
})
test('datetime-local value round-trips local time', () => { const d = new Date(2026, 10, 3, 9, 5); assert.equal(toLocalInput(d), '2026-11-03T09:05'); assert.equal(+new Date(toLocalInput(d)), +d) })
test('month grid: Monday-first weeks covering the whole month, no empty trailing week', () => {
  const g = monthGrid(2026, 10)   // November 2026 starts on a Sunday
  assert.equal(g[0]![0]!.date.getDay(), 1); assert.ok(g.every((w) => w.length === 7))
  const days = g.flat().filter((c) => c.inMonth).map((c) => c.date.getDate()); assert.deepEqual(days, Array.from({ length: 30 }, (_, i) => i + 1))
  assert.ok(g.length >= 5 && g.length <= 6); assert.ok(g[g.length - 1]!.some((c) => c.inMonth))
  assert.equal(monthGrid(2026, 1).length, 5)   // February 2026 fits in 5 weeks
})
test('the outcomes offered match the ones the server accepts', () => { assert.deepEqual(OUTCOMES.map((o) => o.value), ['nu_raspunde', 'interesat', 'revin', 'refuza', 'numar_gresit']) })

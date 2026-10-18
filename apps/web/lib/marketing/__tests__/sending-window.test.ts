import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_WINDOW, describeWindow, parseSendingWindow, sendingWindowSchema, withinWindow } from '../sending-window'

// 2026-11-02 is a Monday; Bucharest is UTC+2 in November
const at = (iso: string) => new Date(iso)
test('default window: Mon–Fri 9–18 Bucharest (edges included/excluded)', () => {
  assert.equal(withinWindow(at('2026-11-02T06:59:00Z')), false)   // 08:59
  assert.equal(withinWindow(at('2026-11-02T07:00:00Z')), true)    // 09:00
  assert.equal(withinWindow(at('2026-11-02T15:59:00Z')), true)    // 17:59
  assert.equal(withinWindow(at('2026-11-02T16:00:00Z')), false)   // 18:00
  assert.equal(withinWindow(at('2026-11-07T10:00:00Z')), false)   // Saturday
  assert.equal(withinWindow(at('2026-11-08T10:00:00Z')), false)   // Sunday
})
test('custom window: Saturday mornings and a late finish', () => {
  const w = { days: [1, 2, 3, 4, 5, 6], from: 8, to: 20 }
  assert.equal(withinWindow(at('2026-11-07T07:00:00Z'), w), true); assert.equal(withinWindow(at('2026-11-08T07:00:00Z'), w), false)
  assert.equal(withinWindow(at('2026-11-02T17:59:00Z'), w), true); assert.equal(withinWindow(at('2026-11-02T18:00:00Z'), w), false)
})
test('daylight saving: summer time is UTC+3', () => {
  assert.equal(withinWindow(at('2026-07-06T06:00:00Z')), true)    // Monday 09:00 EEST
  assert.equal(withinWindow(at('2026-07-06T05:59:00Z')), false)
})
test('parse: invalid or missing settings fall back to the default; days are sorted and de-duplicated', () => {
  for (const bad of [null, undefined, {}, { days: [], from: 9, to: 18 }, { days: [1], from: 18, to: 9 }, { days: [8], from: 9, to: 18 }, 'x']) assert.deepEqual(parseSendingWindow(bad), DEFAULT_WINDOW)
  assert.deepEqual(parseSendingWindow({ days: [5, 1, 1, 3], from: 10, to: 12 }), { days: [1, 3, 5], from: 10, to: 12 })
  assert.equal(sendingWindowSchema.safeParse({ days: [1], from: 9, to: 9 }).success, false)
})
test('describe reads naturally and matches the old default text', () => {
  assert.equal(describeWindow(DEFAULT_WINDOW), 'luni–vineri, între 9:00 și 18:00')
  assert.equal(describeWindow({ days: [1, 2, 3, 4, 5, 6], from: 8, to: 20 }), 'luni–sâmbătă, între 8:00 și 20:00')
  assert.equal(describeWindow({ days: [1, 3, 5], from: 9, to: 12 }), 'luni, miercuri, vineri, între 9:00 și 12:00')
  assert.equal(describeWindow({ days: [1, 2, 4, 5], from: 9, to: 12 }), 'luni și marți, joi și vineri, între 9:00 și 12:00')
  assert.equal(describeWindow({ days: [1, 2, 3, 4, 5, 6, 7], from: 0, to: 24 }), 'în fiecare zi, între 0:00 și 24:00')
})

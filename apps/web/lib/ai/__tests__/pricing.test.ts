import { test } from 'node:test'
import assert from 'node:assert/strict'
import { costUsd, normalizeModel, priceFor, FALLBACK_PRICE } from '../pricing'

const close = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`)

test('flash price steps up on 2027-01-01', () => {
  assert.deepEqual(priceFor('gemini-3.8-flash', 0, new Date('2026-12-31T23:59:59Z')), { input: 0.75, output: 3.75 })
  assert.deepEqual(priceFor('gemini-3.8-flash', 0, new Date('2027-01-01T00:00:00Z')), { input: 1.5, output: 7.5 })
})

test('thinking tokens are billed as output (measured run: 344 in, 4492 out, 1544 thinking = $0.0229)', () => {
  const c = costUsd('gemini-3.8-flash', { promptTokens: 344, completionTokens: 4492, thinkingTokens: 1544 }, new Date('2026-11-01'))
  close(c, (344 * 0.75 + (4492 + 1544) * 3.75) / 1e6)
  assert.ok(c > costUsd('gemini-3.8-flash', { promptTokens: 344, completionTokens: 4492 }, new Date('2026-11-01')))
})

test('pro model has a long-prompt tier', () => {
  assert.deepEqual(priceFor('gemini-3.1-pro-preview', 1000), { input: 2, output: 12 })
  assert.deepEqual(priceFor('gemini-3.1-pro-preview', 250_000), { input: 4, output: 18 })
})

test('unknown models fall back to the most expensive rates (never under-bill)', () => {
  assert.deepEqual(priceFor('some-new-model'), FALLBACK_PRICE)
})

test('retired models are redirected, current ones untouched', () => {
  assert.equal(normalizeModel('gemini-2.5-flash'), 'gemini-3.8-flash')
  assert.equal(normalizeModel('gemini-2.5-pro'), 'gemini-3.1-pro-preview')
  assert.equal(normalizeModel('gemini-3.8-flash'), 'gemini-3.8-flash')
  assert.equal(normalizeModel(undefined), undefined)
})

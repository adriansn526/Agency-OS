/** Run with: npx tsx --test lib/website/admin/__tests__/*.test.ts */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DataValidationError, validateEntryData, validateFieldDefs, type CollectionField } from '../entry-data'
import { slugify, uniqueSlug } from '../slug'
import { normalizeWebsite } from '../url'

const fields: CollectionField[] = [
  { key: 'cui', label: 'CUI', type: 'text', required: true },
  { key: 'angajati', label: 'Angajați', type: 'number' },
  { key: 'plan', label: 'Plan', type: 'select', options: ['Gratuit', 'PRO'] },
  { key: 'fondat', label: 'Fondat', type: 'date' },
  { key: 'scor', label: 'Scor', type: 'rating' },
  { key: 'servicii', label: 'Servicii', type: 'list' },
]

test('valid data is coerced and unknown keys are dropped', () => {
  const out = validateEntryData(fields, { cui: ' RO123 ', angajati: '12,5', plan: 'PRO', fondat: '2020-05-01', scor: '4', servicii: 'Zidărie; Tencuieli\nIzolații', evil: '<script>' })
  assert.deepEqual(out, { cui: 'RO123', angajati: 12.5, plan: 'PRO', fondat: '2020-05-01', scor: 4, servicii: ['Zidărie', 'Tencuieli', 'Izolații'] })
})

test('every problem is reported together', () => {
  try {
    validateEntryData(fields, { angajati: 'mulți', plan: 'Platinum', fondat: '01.05.2020', scor: 9 })
    assert.fail('should have thrown')
  } catch (e) {
    assert.ok(e instanceof DataValidationError)
    assert.equal(e.issues.length, 5) // cui required + 4 invalid
  }
})

test('empty optional values are omitted, empty required values fail', () => {
  assert.deepEqual(validateEntryData([{ key: 'a', label: 'A', type: 'text' }], { a: '' }), {})
  assert.throws(() => validateEntryData(fields, { cui: '' }), DataValidationError)
  assert.deepEqual(validateEntryData([{ key: 'a', label: 'A', type: 'text' }], 'not an object'), {})
})

test('long text and oversized lists are rejected', () => {
  assert.throws(() => validateEntryData([{ key: 'a', label: 'A', type: 'text' }], { a: 'x'.repeat(2001) }), DataValidationError)
  assert.throws(() => validateEntryData([{ key: 'l', label: 'L', type: 'list' }], { l: Array.from({ length: 51 }, (_, i) => `i${i}`) }), DataValidationError)
})

test('field definitions: keys, duplicates, select options, filterable types', () => {
  assert.deepEqual(validateFieldDefs(fields), [])
  const bad = validateFieldDefs([
    { key: 'Bad Key', label: 'x', type: 'text' },
    { key: 'a', label: 'A', type: 'select' },
    { key: 'a', label: 'A2', type: 'number', filterable: true },
  ] as CollectionField[])
  assert.equal(bad.length, 4) // invalid key, select without options, duplicate key, number not filterable
})

test('slugify folds Romanian diacritics and punctuation', () => {
  assert.equal(slugify('Țesătoria "Ștefan" & Fiii SRL'), 'tesatoria-stefan-si-fiii-srl')
  assert.equal(slugify('  Construcții Ăștia  '), 'constructii-astia')
  assert.equal(slugify('!!!'), 'intrare')
  assert.ok(slugify('a'.repeat(200)).length <= 80)
})

test('uniqueSlug appends the first free suffix', async () => {
  const taken = new Set(['delta', 'delta-2'])
  assert.equal(await uniqueSlug('delta', async (s) => taken.has(s)), 'delta-3')
  assert.equal(await uniqueSlug('alfa', async (s) => taken.has(s)), 'alfa')
})

test('normalizeWebsite accepts typed addresses and rejects junk', () => {
  assert.equal(normalizeWebsite('exemplu.ro'), 'https://exemplu.ro')
  assert.equal(normalizeWebsite(' http://www.delta.ro/ '), 'http://www.delta.ro')
  assert.equal(normalizeWebsite('https://delta.ro/contact'), 'https://delta.ro/contact')
  for (const bad of ['', '   ', null, undefined, 'fara spatii.ro nu', 'javascript:alert(1)', 'localhost', 'ftp://x.ro']) assert.equal(normalizeWebsite(bad as string), null, String(bad))
})

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isWip, WIP_CLEARED, WIP_FIELD, WIP_KEY, withWipField } from '../wip'
import { validateEntryData } from '../../admin/entry-data'

test('only the value "da" means in construction', () => {
  assert.equal(isWip({ in_constructie: 'da' }), true)
  for (const d of [{ in_constructie: 'nu' }, {}, null, undefined, 'da', { in_constructie: true }, { in_constructie: 'DA' }]) assert.equal(isWip(d), false)
})
test('the tick is a system field of the content collections only', () => {
  const own = [{ key: 'serviciu', label: 'S', type: 'text' as const }]
  for (const k of ['preturi', 'servicii', 'ghiduri']) assert.ok(withWipField(k, own).some((f) => f.key === WIP_KEY), k)
  for (const k of ['companii', 'proiecte', 'pagini']) assert.deepEqual(withWipField(k, own), own)
  const defined = [...own, WIP_FIELD]
  assert.equal(withWipField('preturi', defined), defined) // a collection that defines it is left alone
})
test('the field is kept by data validation: set, cleared and rejected values', () => {
  const f = withWipField('preturi', [])
  assert.deepEqual(validateEntryData(f, { in_constructie: 'da' }), { in_constructie: 'da' })
  assert.deepEqual(validateEntryData(f, { in_constructie: WIP_CLEARED }), { in_constructie: 'nu' })
  assert.deepEqual(validateEntryData(f, {}), {})
  assert.throws(() => validateEntryData(f, { in_constructie: 'poate' }))
  assert.deepEqual(validateEntryData([], { in_constructie: 'da' }), {}) // without the system field the key would be dropped: that is why it is added
})

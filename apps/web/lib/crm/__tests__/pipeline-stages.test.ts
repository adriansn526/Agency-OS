import { test } from 'node:test'
import assert from 'node:assert/strict'
import { stagesFor } from '../pipeline-stages'

const clienti = { id: 'clienti', pipeline: [{ key: 'contactat', label: 'Contactat' }, { key: 'calificat', label: 'Calificat' }, { key: 'castigat', label: 'Câștigat' }] }
const parteneri = { id: 'parteneri', pipeline: [{ key: 'prospect', label: 'Prospect' }, { key: 'contactat', label: 'Contactat' }, { key: 'in_discutii', label: 'În discuții' }, { key: 'activ', label: 'Activ' }] }

test('a specific type shows exactly its own pipeline', () => {
  assert.deepEqual(stagesFor([clienti, parteneri], 'parteneri').map((s) => s.key), ['prospect', 'contactat', 'in_discutii', 'activ'])
  assert.deepEqual(stagesFor([clienti, parteneri], 'clienti').map((s) => s.key), ['contactat', 'calificat', 'castigat'])
})
test('"Toate" shows the union, a shared key once, so partners in "in_discutii" are not hidden', () => {
  assert.deepEqual(stagesFor([clienti, parteneri], 'all').map((s) => s.key), ['contactat', 'calificat', 'castigat', 'prospect', 'in_discutii', 'activ'])
  assert.deepEqual(stagesFor([clienti, parteneri], undefined).map((s) => s.key), ['contactat', 'calificat', 'castigat', 'prospect', 'in_discutii', 'activ'])
})
test('unknown type falls back to the union; no types gives nothing (the page then uses its default pipeline)', () => {
  assert.equal(stagesFor([clienti, parteneri], 'nu-exista').length, 6)
  assert.deepEqual(stagesFor(undefined, 'all'), []); assert.deepEqual(stagesFor([{ id: 'x' }], 'x'), [])
})

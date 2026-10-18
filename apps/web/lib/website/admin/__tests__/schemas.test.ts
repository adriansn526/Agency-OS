import { test } from 'node:test'
import assert from 'node:assert/strict'
import { entryCreate, entryPatch } from '../schemas'

test('creating an entry needs only a collection and a title; plan defaults to gratuit', () => {
  const r = entryCreate.parse({ collectionId: 'c', title: 'Firma X' })
  assert.deepEqual([r.plan, r.planUntil, r.status, r.verified], ['gratuit', null, 'draft', false])
  assert.equal(entryCreate.safeParse({ collectionId: 'c', title: 'Firma X', plan: 'platinum' }).success, false)
  assert.deepEqual(entryCreate.parse({ collectionId: 'c', title: 'Firma X', plan: 'abonament', planUntil: '2027-01-01T00:00:00Z' }).planUntil, new Date('2027-01-01T00:00:00Z'))
})
test('patching accepts any subset, including plan alone', () => assert.equal(entryPatch.parse({ plan: 'abonament' }).plan, 'abonament'))

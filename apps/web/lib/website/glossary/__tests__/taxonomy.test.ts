import { test } from 'node:test'
import assert from 'node:assert/strict'
import { categoriesFor, CATEGORIES, taxonomyProblems } from '../taxonomy'

test('taxonomy is consistent', () => assert.deepEqual(taxonomyProblems(), []))
test('speciality labels map to categories; unknown ones to nothing', () => {
  assert.deepEqual(categoriesFor('Instalații sanitare, termice, climatizare'), ['instalatii-sanitare', 'instalatii-termice', 'climatizare'])
  assert.deepEqual(categoriesFor(' Demolări '), ['demolari'])
  assert.deepEqual(categoriesFor('Ceva necunoscut'), [])
  assert.deepEqual(categoriesFor(undefined), [])
})
test('slugs are url-safe', () => { for (const c of CATEGORIES) assert.match(c.slug, /^[a-z0-9-]{2,60}$/) })

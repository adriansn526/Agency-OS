import { test } from 'node:test'
import assert from 'node:assert/strict'
import { describeSource } from '../source'

test('a plain page has no source', () => {
  assert.deepEqual(describeSource('/preturi/zugravit'), { page: '/preturi/zugravit', source: null, medium: null, campaign: null, content: null, ref: null, label: null })
})
test('UTM parameters are read back; the label is the UTM source', () => {
  const s = describeSource('/preturi/zugravit?utm_source=hidropro&utm_medium=referral&utm_campaign=pas-urmator&utm_content=hidroizolatie-baie&ref=hidropro.ro')!
  assert.equal(s.page, '/preturi/zugravit'); assert.equal(s.source, 'hidropro'); assert.equal(s.medium, 'referral'); assert.equal(s.campaign, 'pas-urmator'); assert.equal(s.content, 'hidroizolatie-baie'); assert.equal(s.ref, 'hidropro.ro'); assert.equal(s.label, 'hidropro')
})
test('without UTM the referring site is the label', () => { assert.equal(describeSource('/lucrari/instalatii-termice?ref=tubovent.ro')!.label, 'tubovent.ro') })
test('empty, missing or odd values do not break it', () => {
  assert.equal(describeSource(null), null); assert.equal(describeSource(''), null); assert.equal(describeSource('   '), null)
  assert.equal(describeSource('?utm_source=x')!.page, '/'); assert.equal(describeSource('?utm_source=x')!.label, 'x')
  assert.equal(describeSource('/x?utm_source=')!.label, null)
})

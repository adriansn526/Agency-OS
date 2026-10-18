import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseIdentifier, LINK_TOKEN_RE, SESSION_TOKEN_RE } from '../auth'
import { profilePatch } from '../profile'

test('identifiers: emails are lower-cased, phones become national numbers, junk is rejected', () => {
  assert.deepEqual(parseIdentifier(' Office@Firma.RO '), { kind: 'email', value: 'office@firma.ro' })
  assert.deepEqual(parseIdentifier('0730 808 101'), { kind: 'phone', value: '0730808101' })
  assert.deepEqual(parseIdentifier('+40730808101'), { kind: 'phone', value: '0730808101' })
  for (const bad of ['', 'abc', 'a@b', '12345', 'x'.repeat(300), null, undefined, 42]) assert.equal(parseIdentifier(bad), null, String(bad))
})
test('token shapes', () => {
  assert.match('pl_' + 'a'.repeat(43), LINK_TOKEN_RE); assert.match('ps_' + 'A1_-'.repeat(10) + 'abc', SESSION_TOKEN_RE)
  assert.doesNotMatch('pl_short', LINK_TOKEN_RE); assert.doesNotMatch('ps_' + 'a'.repeat(43), LINK_TOKEN_RE)
})
test('profile patch: only whitelisted fields, strict, categories from the taxonomy, website normalised', () => {
  const ok = profilePatch.parse({ summary: ' Firmă serioasă ', websiteUrl: 'firma.ro', servicii: ['instalatii-sanitare', 'climatizare'], certificari: ['ANRE'] })
  assert.equal(ok.summary, 'Firmă serioasă'); assert.equal(ok.websiteUrl, 'https://firma.ro')
  for (const bad of [{ title: 'Alt nume' }, { cui: '1' }, { status: 'published' }, { logoUrl: 'https://x' }, { servicii: ['inexistent'] }, { websiteUrl: 'nu e un site' }, { email: 'x' }, { certificari: [''] }, { servicii: new Array(13).fill('demolari') }])
    assert.equal(profilePatch.safeParse(bad).success, false, JSON.stringify(bad))
})

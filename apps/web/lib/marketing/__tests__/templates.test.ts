import { test } from 'node:test'
import assert from 'node:assert/strict'
import { TEMPLATES } from '../../../scripts/marketing/seed-partner-templates'
import { hasDraftMarker } from '../dispatch'
import { PREVIEW_VARIABLES } from '../../website/preview/campaign'

const KNOWN = new Set(['company_name', 'companyName', 'contact_name', 'contactPerson', 'city', 'county', 'phone', 'email', 'unique_code', 'bl_name', 'link', ...PREVIEW_VARIABLES])

test('partner templates only use variables the campaign engine fills', () => {
  for (const t of TEMPLATES) for (const m of t.body.matchAll(/\{\{(\w+)\}\}/g)) assert.ok(KNOWN.has(m[1]!), `${t.name}: {{${m[1]}}}`)
})
test('the email draft cannot be sent as is; the SMS fits one message and promises nothing unconfirmed', () => {
  const email = TEMPLATES.find((t) => t.channel === 'email')!, sms = TEMPLATES.find((t) => t.channel === 'sms')!
  assert.equal(hasDraftMarker(email.body), true)
  assert.ok(email.body.includes('{{unsubscribe_link}}') && email.body.includes('confidentialitate'))   // art. 14 notice and opt-out are part of the message
  assert.equal(hasDraftMarker(sms.body), false)
  const filled = sms.body.replace('{{company_name}}', 'FIRMA EXEMPLU SRL').replace('{{preview_link}}', 'https://intraconstruct.ro/p/AbC12xYz9k').replace('{{preview_expires}}', '16.11.2026')
  assert.ok(filled.length <= 160, `SMS has ${filled.length} characters`); assert.ok(/^[\x20-\x7E]*$/.test(filled), 'GSM-safe: no diacritics')
  assert.ok(!/exclusiv|garant|gratuit/i.test(sms.body))
})

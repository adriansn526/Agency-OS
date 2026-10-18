import { test } from 'node:test'
import assert from 'node:assert/strict'
import { hasDraftMarker, fillSubject, textToHtml, withinSendingWindow } from '../dispatch'

test('text becomes safe html: escaped, links made clickable, blank lines are paragraphs', () => {
  const h = textToHtml('Salut <b>Ion</b> & "echipa"\nrând doi\n\nVezi https://intraconstruct.ro/p/AbC12xYz9k, apoi răspunde.')
  assert.equal(h, '<p>Salut &lt;b&gt;Ion&lt;/b&gt; &amp; &quot;echipa&quot;<br>rând doi</p>\n<p>Vezi <a href="https://intraconstruct.ro/p/AbC12xYz9k">https://intraconstruct.ro/p/AbC12xYz9k</a>, apoi răspunde.</p>')
  assert.ok(!textToHtml('<script>alert(1)</script>').includes('<script'))
  assert.ok(!textToHtml('javascript:alert(1)').includes('href'))
})
test('subject: variables filled, whitespace collapsed, empty subject has a default', () => {
  assert.equal(fillSubject('Pagina {{company_name}}  în {{county}}', { companyName: 'MONTREPCOM SRL', county: 'Mureș' }), 'Pagina MONTREPCOM SRL în Mureș')
  assert.equal(fillSubject('Pagina {{companyName}} din {{city}}', { companyName: null, city: null }), 'Pagina din')
  assert.equal(fillSubject(null, {}), 'IntraConstruct')
})
test('sending window: weekdays 9–18 Bucharest time, across the DST change', () => {
  const at = (iso: string) => withinSendingWindow(new Date(iso))
  assert.equal(at('2026-10-19T07:00:00Z'), true)    // Mon 10:00 (UTC+3, summer time)
  assert.equal(at('2026-10-19T05:59:00Z'), false)   // Mon 08:59
  assert.equal(at('2026-10-19T14:59:00Z'), true)    // Mon 17:59
  assert.equal(at('2026-10-19T15:00:00Z'), false)   // Mon 18:00
  assert.equal(at('2026-10-24T08:00:00Z'), false)   // Saturday
  assert.equal(at('2026-10-25T08:00:00Z'), false)   // Sunday (clocks go back that night)
  assert.equal(at('2026-10-26T07:30:00Z'), true)    // Mon 09:30 (UTC+2, winter time)
  assert.equal(at('2026-10-26T06:30:00Z'), false)   // Mon 08:30 winter
})

test('unfinished template spots are detected', () => {
  assert.equal(hasDraftMarker('Oferta: [DE COMPLETAT: preț]'), true); assert.equal(hasDraftMarker('ofertă [de completat]'), true)
  assert.equal(hasDraftMarker('Salut {{company_name}}'), false)
})

test('outreach with a preview link is blocked until the legal documents are declared published', async () => {
  const { assertOutreachAllowed, OutreachBlocked } = await import('../../website/preview/campaign')
  assert.throws(() => assertOutreachAllowed({}), OutreachBlocked)
  assert.throws(() => assertOutreachAllowed({ OUTREACH_LEGAL_READY: '0' }), OutreachBlocked)
  assert.doesNotThrow(() => assertOutreachAllowed({ OUTREACH_LEGAL_READY: '1' }))
})

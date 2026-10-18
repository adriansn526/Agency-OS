import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dayKey, fmtTimer, monthGrid, OUTCOMES, quickCallbacks, telHref, toLocalInput } from '../call-utils'

test('tel links: national and international Romanian numbers become +40…; junk gives none', () => {
  assert.equal(telHref('0730 808 101'), 'tel:+40730808101'); assert.equal(telHref('+40730808101'), 'tel:+40730808101'); assert.equal(telHref('0040730808101'), 'tel:+40730808101'); assert.equal(telHref('40730808101'), 'tel:+40730808101')
  for (const bad of [null, undefined, '', 'N/A', '123', '07308']) assert.equal(telHref(bad as never), null, String(bad))
})
test('timer format', () => { assert.equal(fmtTimer(0), '00:00'); assert.equal(fmtTimer(65), '01:05'); assert.equal(fmtTimer(3725), '62:05') })
test('quick callbacks are in the future, at 10:00, on weekdays', () => {
  for (const base of ['2026-11-02T08:00:00', '2026-11-05T15:00:00', '2026-11-06T11:00:00', '2026-11-07T09:00:00', '2026-11-08T09:00:00']) {
    const now = new Date(base)
    for (const c of quickCallbacks(now)) { assert.ok(c.at > now, `${base} ${c.label}`); assert.equal(c.at.getHours(), 10); assert.ok(![0, 6].includes(c.at.getDay()), `${base} ${c.label} falls on a weekend`) }
  }
  assert.equal(dayKey(quickCallbacks(new Date('2026-11-06T11:00:00'))[0]!.at), '2026-11-09')   // Friday → tomorrow is Saturday → Monday
})
test('datetime-local value round-trips local time', () => { const d = new Date(2026, 10, 3, 9, 5); assert.equal(toLocalInput(d), '2026-11-03T09:05'); assert.equal(+new Date(toLocalInput(d)), +d) })
test('month grid: Monday-first weeks covering the whole month, no empty trailing week', () => {
  const g = monthGrid(2026, 10)   // November 2026 starts on a Sunday
  assert.equal(g[0]![0]!.date.getDay(), 1); assert.ok(g.every((w) => w.length === 7))
  const days = g.flat().filter((c) => c.inMonth).map((c) => c.date.getDate()); assert.deepEqual(days, Array.from({ length: 30 }, (_, i) => i + 1))
  assert.ok(g.length >= 5 && g.length <= 6); assert.ok(g[g.length - 1]!.some((c) => c.inMonth))
  assert.equal(monthGrid(2026, 1).length, 5)   // February 2026 fits in 5 weeks
})
test('the outcomes offered match the ones the server accepts', () => { assert.deepEqual(OUTCOMES.map((o) => o.value), ['nu_raspunde', 'interesat', 'revin', 'refuza', 'numar_gresit']) })

import { companyProfile, phoneTag } from '../call-utils'
test('companyProfile: builds facts, people, signals and phone tags from lead + details; skips what is missing', () => {
  const lead = {
    companyName: 'X', caenDescription: 'Lucrări de instalații', caenCode: '4322', cui: '123', employees: 12, revenue: 2500000, foundedYear: 2004, website: 'https://www.x.ro/', email: 'N/A', contactPerson: 'N/A', companyStatus: 'Funcțiune',
    customFields: { pilot: 'da', suprapunere_crm: 'da', suprapunere_crm_linii: 'agency', detalii: {
      forma_juridica: 'SRL', benzi: { vechime: '20+ ani', angajati: '10-49 (mică)' }, an_financiar: 2023, profit_net: 14233, inactiv_fiscal: true,
      persoane: [{ nume: 'Voinea Victoria', roluri: ['Administrator', 'Director General'] }],
      emailuri: [{ email: 'office@x.ro' }], telefoane: [{ numar: '0722752842', tip: 'mobil', partajat_cu: 1 }, { numar: '0245620750', tip: 'fix', partajat_cu: 0 }],
      etichete: { pagini_aurii: [{ url: 'https://paginiaurii.ro/x' }], fonduri_digitalizare: [{ program: 'Digitalizare IMM', ajutor_ron: 203581 }] } } },
  }
  const p = companyProfile(lead)
  const f = (l: string) => p.facts.find((x) => x.label === l)
  assert.equal(f('Angajați')?.value, '12 · 10-49 (mică)'); assert.match(f('Cifra de afaceri')!.value, /2\.?500\.?000 lei \(2023\)/); assert.equal(f('Website')?.value, 'x.ro'); assert.equal(f('Website')?.href, 'https://www.x.ro/')
  assert.equal(f('Email')?.value, 'office@x.ro'); assert.equal(f('Atenție')?.warn, true)
  assert.deepEqual(p.people, [{ name: 'Voinea Victoria', role: 'Administrator, Director General' }])
  assert.deepEqual(p.signals.map((x) => x.label), ['Pagini Aurii', 'Fonduri digitalizare', 'Există și în CRM'])
  assert.equal(phoneTag(p.phoneTags, '0722 752 842'), 'mobil · partajat cu 1 firmă'); assert.equal(phoneTag(p.phoneTags, '+40245620750'), 'fix'); assert.equal(phoneTag(p.phoneTags, '0700000000'), '')
  const bare = companyProfile({ companyName: 'Y', contactPerson: 'Ion Pop', contactRole: 'Director', customFields: null })
  assert.deepEqual([bare.facts.length, bare.people, bare.signals.length], [0, [{ name: 'Ion Pop', role: 'Director' }], 0])
})

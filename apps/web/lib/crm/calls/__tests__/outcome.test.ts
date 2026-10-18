import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CallInputError, planCall, type LeadState } from '../outcome'

const PIPE = ['prospect', 'contactat', 'in_discutii', 'onboarding', 'activ', 'refuzat']
const NOW = new Date('2026-11-03T08:30:00Z')
const lead = (o: Partial<LeadState> = {}): LeadState => ({ status: 'prospect', optOut: false, customFields: {}, nextAction: null, nextActionDate: null, ...o })
const later = new Date('2026-11-05T09:00:00Z')

test('interested → "în discuții"; the outcome, date and consents are recorded on the lead', () => {
  const p = planCall(lead(), { outcome: 'interesat', consentSms: 'da', consentEmail: 'nu', notes: ' Vrea să vadă pagina ' }, PIPE, NOW)
  assert.equal(p.status, 'in_discutii'); assert.deepEqual(p.statusChange, { from: 'prospect', to: 'in_discutii' }); assert.equal(p.optOut, undefined)
  assert.deepEqual(p.customFields, { rezultat_apel: 'Interesat', data_apel: '2026-11-03', acord_sms: 'da', acord_email: 'nu' })
  assert.deepEqual(p.call, { subject: 'Apel: Interesat', body: 'Vrea să vadă pagina', callResult: 'Interesat', durationMin: null })
})
test('"I will call back" needs a date; it sets the next action and moves the lead to "contactat"', () => {
  assert.throws(() => planCall(lead(), { outcome: 'revin' }, PIPE, NOW), CallInputError)
  const p = planCall(lead(), { outcome: 'revin', callbackAt: later }, PIPE, NOW)
  assert.equal(p.status, 'contactat'); assert.equal(p.nextAction, 'Apel: revin'); assert.equal(p.nextActionDate, later)
})
test('no answer keeps the stage; an optional retry date is stored; without one nothing is scheduled', () => {
  const a = planCall(lead(), { outcome: 'nu_raspunde' }, PIPE, NOW); assert.equal(a.status, undefined); assert.equal(a.nextAction, null); assert.equal(a.customFields.rezultat_apel, 'Nu răspunde')
  const b = planCall(lead(), { outcome: 'nu_raspunde', callbackAt: later }, PIPE, NOW); assert.equal(b.nextAction, 'Apel: reîncerc'); assert.equal(b.nextActionDate, later)
})
test('refusing on the phone ends contact: "refuzat" and opt-out; no callback may be set', () => {
  const p = planCall(lead({ status: 'contactat' }), { outcome: 'refuza' }, PIPE, NOW)
  assert.equal(p.status, 'refuzat'); assert.equal(p.optOut, true)
  assert.throws(() => planCall(lead(), { outcome: 'refuza', callbackAt: later }, PIPE, NOW), CallInputError)
  assert.throws(() => planCall(lead(), { outcome: 'numar_gresit', callbackAt: later }, PIPE, NOW), CallInputError)
})
test('wrong number changes no stage and does not opt anyone out', () => {
  const p = planCall(lead(), { outcome: 'numar_gresit', notes: 'altă firmă' }, PIPE, NOW); assert.equal(p.status, undefined); assert.equal(p.optOut, undefined)
})
test('the stage only moves forward, and customers are never touched', () => {
  assert.equal(planCall(lead({ status: 'in_discutii' }), { outcome: 'revin', callbackAt: later }, PIPE, NOW).status, undefined)   // contactat is behind in_discutii
  assert.equal(planCall(lead({ status: 'in_discutii' }), { outcome: 'interesat' }, PIPE, NOW).status, undefined)                   // already there
  for (const status of ['onboarding', 'activ']) { const p = planCall(lead({ status }), { outcome: 'refuza' }, PIPE, NOW); assert.equal(p.status, undefined); assert.equal(p.optOut, undefined) }
  assert.equal(planCall(lead({ status: 'refuzat' }), { outcome: 'interesat' }, PIPE, NOW).status, undefined)                        // a refusal is not silently undone
  assert.equal(planCall(lead(), { outcome: 'interesat' }, ['prospect', 'contactat'], NOW).status, undefined)                        // a pipeline without that stage is left alone
})
test('a finished call clears the old callback but keeps unrelated next actions', () => {
  const cb = lead({ nextAction: 'Apel: revin', nextActionDate: later })
  const done = planCall(cb, { outcome: 'interesat' }, PIPE, NOW); assert.equal(done.nextAction, null); assert.equal(done.nextActionDate, null)
  const other = lead({ nextAction: 'Trimite contract', nextActionDate: later })
  const kept = planCall(other, { outcome: 'interesat' }, PIPE, NOW); assert.equal(kept.nextAction, 'Trimite contract'); assert.equal(kept.nextActionDate, later)
})
test('callback dates must be valid and in the future; duration is rounded up to minutes', () => {
  assert.throws(() => planCall(lead(), { outcome: 'revin', callbackAt: new Date('2026-11-01T09:00:00Z') }, PIPE, NOW), /în viitor/)
  assert.throws(() => planCall(lead(), { outcome: 'revin', callbackAt: new Date('x') }, PIPE, NOW), /validă/)
  assert.throws(() => planCall(lead(), { outcome: 'nope' as never }, PIPE, NOW), /necunoscut/)
  assert.equal(planCall(lead(), { outcome: 'interesat', durationSec: 20 }, PIPE, NOW).call.durationMin, 1); assert.equal(planCall(lead(), { outcome: 'interesat', durationSec: 190 }, PIPE, NOW).call.durationMin, 3)
  assert.equal(planCall(lead(), { outcome: 'interesat', durationSec: 0 }, PIPE, NOW).call.durationMin, null)
})
test('the date of the call is the Bucharest date, even late in the evening UTC', () => {
  assert.equal(planCall(lead(), { outcome: 'interesat' }, PIPE, new Date('2026-11-03T22:30:00Z')).customFields.data_apel, '2026-11-04')
})

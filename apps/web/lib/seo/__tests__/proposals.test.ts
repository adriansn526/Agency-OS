import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildProposal, totals, suggestProposals, EST_CTR } from '../proposals'

test('validates and totals', () => {
    const p = buildProposal({ mainTerm: ' fals intelectual ', mainVolume: 720, longTails: [{ term: 'uz de fals', volume: 480 }, 'fals intelectual', { term: 'Uz de fals' }] }) as any
    assert.equal(p.mainTerm, 'fals intelectual')
    assert.deepEqual(p.longTails, [{ term: 'uz de fals', volume: 480 }])
    assert.deepEqual(totals(p), { volume: 1200, clicks: Math.round(1200 * EST_CTR) })
})
test('rejects empty main term and bad status', () => {
    assert.ok('error' in (buildProposal({ mainTerm: '' }) as any))
    assert.ok('error' in (buildProposal({ mainTerm: 'x', status: 'zzz' }) as any))
})
test('keeps prior values on partial update', () => {
    const a = buildProposal({ mainTerm: 'furt', mainVolume: 100, longTails: ['furt calificat'] }) as any
    const b = buildProposal({ status: 'in_lucru' }, a) as any
    assert.equal(b.id, a.id); assert.equal(b.longTails.length, 1); assert.equal(b.status, 'in_lucru')
})
test('groups by law article and drops covered ones', () => {
    const out = suggestProposals([
      { keyword: 'art 335 cod penal', volume: 1000, competitor: 'a.ro' },
      { keyword: 'articolul 335 alin 2', volume: 480, competitor: 'b.ro' },
      { keyword: 'uz de fals', volume: 480 },
      { keyword: 'uzul de fals', volume: 480 },
      { keyword: 'art 208 cod penal', volume: 480 },
      { keyword: 'rar', volume: 10 },
    ], ['hartuirea art 208'])
    assert.deepEqual(out.map(o => o.mainTerm), ['art 335 cod penal', 'uz de fals'])
    assert.equal(out[0]!.longTails[0]!.term, 'articolul 335 alin 2')
    assert.equal(out[1]!.longTails.length, 1)
})

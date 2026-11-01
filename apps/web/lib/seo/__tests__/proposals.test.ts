import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildProposal, totals, suggestProposals, kdFromRanks, EST_CTR } from '../proposals'

test('validates and totals', () => {
    const p = buildProposal({ mainTerm: ' fals intelectual ', mainVolume: 720, longTails: [{ term: 'uz de fals', volume: 480 }, 'fals intelectual', { term: 'Uz de fals' }] }) as any
    assert.equal(p.mainTerm, 'fals intelectual')
    assert.deepEqual(p.longTails, [{ term: 'uz de fals', volume: 480 }])
    assert.deepEqual(totals(p), { volume: 1200, clicks: Math.round(1200 * EST_CTR), kd: null })
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

test('article KD is the volume-weighted average of terms that have KD', () => {
  const p = buildProposal({ mainTerm: 'a', mainVolume: 900, mainKd: 40, longTails: [{ term: 'b', volume: 100, kd: 20 }, { term: 'c', volume: 5000 }] }) as any
  assert.equal(p.mainKd, 40); assert.equal(p.longTails[1].kd, undefined)
  assert.equal(totals(p).kd, 38)
  assert.equal(totals({ mainVolume: 0, mainKd: 10, longTails: [{ term: 'x', volume: 0, kd: 30 }] }).kd, 20)
  assert.equal((buildProposal({ mainTerm: 'a', mainKd: 250, longTails: [{ term: 'z', kd: -5 }] }) as any).mainKd, 100)
})

test('kdFromRanks scales the mean top-10 domain rank to 0-100', () => {
  assert.equal(kdFromRanks([]), null)
  assert.equal(kdFromRanks([476, 476, 335, 610, 96]), 40)
  assert.equal(kdFromRanks([1000, 1000]), 100)
  assert.equal(kdFromRanks([0, 0]), 0)
})

test('KD helpers fill only missing terms and can reset', async () => {
  const { applyKd, clearKd, termsNeedingKd } = await import('../proposals-kd')
  const a = buildProposal({ mainTerm: 'a', mainVolume: 10, mainKd: 5, longTails: [{ term: 'b', volume: 1, kd: 7 }, { term: 'c', volume: 2 }] }) as any
  assert.deepEqual(termsNeedingKd([a]), ['c'])
  const filled = applyKd([a], new Map([['c', 33], ['a', 99]]))[0]!
  assert.equal(filled.longTails[1]!.kd, 33); assert.equal(filled.mainKd, 99)
  const cleared = clearKd([filled])[0]!
  assert.equal(cleared.mainKd, undefined); assert.ok(cleared.longTails.every(t => !('kd' in t)))
  assert.deepEqual(termsNeedingKd([cleared]), ['a', 'b', 'c'])
})

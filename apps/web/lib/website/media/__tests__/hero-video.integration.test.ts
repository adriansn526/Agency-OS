/** Needs CALLS_TEST_DATABASE_URL = a SCRATCH database with the full schema (truncates tables). ffmpeg must be installed. */
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { parseLayout } from '../../layout/blocks'

test('hero fields: valid choices are kept, defaults and empty values are dropped, unknown choices are rejected', () => {
  const ok = parseLayout([{ type: 'hero', props: { bg: 'video', overlay: '25', height: 'l', align: 'center', color: 'trust', secondaryLabel: 'Vezi lucrările', secondaryTarget: 'proiecte', headline: 'X' } }])
  assert.ok(ok.ok); if (ok.ok) assert.deepEqual(ok.layout.blocks[0]!.props, { bg: 'video', overlay: '25', height: 'l', align: 'center', color: 'trust', secondaryLabel: 'Vezi lucrările', secondaryTarget: 'proiecte', headline: 'X' })
  const empty = parseLayout([{ type: 'hero', props: { bg: '', overlay: '', secondaryLabel: '' } }]); assert.ok(empty.ok && Object.keys(empty.layout.blocks[0]!.props).length === 0)
  for (const bad of [{ bg: 'iframe' }, { overlay: '99' }, { height: 'xl' }, { secondaryTarget: 'https://evil.example' }, { bg: 5 }, { videoUrl: 'https://x/y.mp4' }]) assert.equal(parseLayout([{ type: 'hero', props: bad }]).ok, false, JSON.stringify(bad))
})

const URL_ = process.env.CALLS_TEST_DATABASE_URL
const skip = !URL_
if (URL_) process.env.DATABASE_URL = URL_
let db: any, S: typeof import('../service'), mp4: Buffer
const objects = new Map<string, { size: number; type: string }>()
const store = { async put(key: string, body: Buffer, type: string) { objects.set(key, { size: body.length, type }) }, async remove(key: string) { objects.delete(key) }, publicUrl: (k: string) => `https://cdn.test/${k}`, keyFromUrl: (u?: string | null) => (u && u.startsWith('https://cdn.test/') ? u.slice('https://cdn.test/'.length) : null) }

before(async () => {
  if (skip) return
  const d = mkdtempSync(path.join(tmpdir(), 'hv-')); try { const f = path.join(d, 'a.mp4'); execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'testsrc=duration=2:size=640x360:rate=25', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', f]); mp4 = readFileSync(f) } finally { rmSync(d, { recursive: true, force: true }) }
  ;({ db } = await import('@repo/db')); S = await import('../service')
  await db.$executeRawUnsafe(`TRUNCATE "WebsiteMedia","WebsiteEntry","WebsiteCollection","WebsiteChannel","BusinessLine" CASCADE`)
  await db.businessLine.create({ data: { id: 'bl', slug: 'bl', name: 'bl', icon: 'x', color: '#000', config: {} } })
  await db.websiteCollection.create({ data: { id: 'c', businessLineId: 'bl', key: 'companii', name: 'C', namePlural: 'C', fields: [] } })
  for (const id of ['e1', 'e2']) await db.websiteEntry.create({ data: { id, businessLineId: 'bl', collectionId: 'c', slug: id, title: id, status: 'preview', data: {} } })
})
after(async () => { if (db) await db.$disconnect() })

test('uploading stores a video and a poster as two private-to-the-entry media rows; the gallery is untouched', { skip }, async () => {
  await db.websiteMedia.create({ data: { entryId: 'e1', kind: 'image', storageKey: 'k', url: 'https://cdn.test/g.webp' } })
  const r = await S.uploadHeroVideo('bl', 'e1', mp4, { store })
  assert.match(r.video, /^https:\/\/cdn\.test\/website\/bl\/e1\/hero-[0-9a-f]+\.mp4$/); assert.match(r.poster, /hero-poster-[0-9a-f]+\.webp$/)
  assert.deepEqual([...objects.values()].map((o) => o.type).sort(), ['image/webp', 'video/mp4'])
  const info = await S.getHeroVideo('e1'); assert.deepEqual([info?.url, info?.posterUrl, info?.width], [r.video, r.poster, 640])
  assert.equal(await db.websiteMedia.count({ where: { entryId: 'e1', kind: 'image' } }), 1)
  assert.equal(await S.getHeroVideo('e2'), null)
})
test('a new upload replaces the old files (rows and objects)', { skip }, async () => {
  const before = await S.getHeroVideo('e1'); const r = await S.uploadHeroVideo('bl', 'e1', mp4, { store })
  assert.notEqual(r.video, before!.url); assert.equal(objects.size, 2); assert.equal(await db.websiteMedia.count({ where: { entryId: 'e1', kind: 'file' } }), 2); assert.equal((await S.getHeroVideo('e1'))!.url, r.video)
})
test('a bad file changes nothing; other entries and other lines are out of reach; clearing removes everything', { skip }, async () => {
  const keep = (await S.getHeroVideo('e1'))!.url
  await assert.rejects(S.uploadHeroVideo('bl', 'e1', Buffer.from('not a video at all, just text'.repeat(10)), { store }), /Format neacceptat/)
  assert.equal((await S.getHeroVideo('e1'))!.url, keep); assert.equal(objects.size, 2)
  await assert.rejects(S.uploadHeroVideo('other', 'e1', mp4, { store }), /nu există/)
  assert.deepEqual(await S.clearHeroVideo('bl', 'e1', store), { removed: 2 }); assert.equal(objects.size, 0); assert.equal(await S.getHeroVideo('e1'), null)
})

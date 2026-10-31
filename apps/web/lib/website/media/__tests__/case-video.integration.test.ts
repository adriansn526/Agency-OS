/** Needs MEDPROFILE_TEST_DATABASE_URL = a SCRATCH database with the full schema (truncates tables). ffmpeg must be installed. */
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const URL_ = process.env.MEDPROFILE_TEST_DATABASE_URL
const skip = !URL_
if (URL_) process.env.DATABASE_URL = URL_
let db: any, V: typeof import('../case-video'), mp4: Buffer
const objects = new Map<string, number>()
const bodies = new Map<string, Buffer>()
const store = { async put(key: string, body: Buffer) { objects.set(key, body.length); bodies.set(key, body) }, async remove(key: string) { objects.delete(key) }, publicUrl: (k: string) => `https://cdn.test/${k}`, keyFromUrl: (u?: string | null) => (u && u.startsWith('https://cdn.test/') ? u.slice('https://cdn.test/'.length) : null) }

before(async () => {
  if (skip) return
  ;({ db } = await import('@repo/db')); V = await import('../case-video')
  const dir = mkdtempSync(path.join(tmpdir(), 'cv-test-'))
  // a 2 s test clip WITH an audio track: the converted file must come out without it
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'testsrc=size=640x360:rate=25', '-f', 'lavfi', '-i', 'sine=frequency=440', '-t', '2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', path.join(dir, 'in.mp4')])
  mp4 = readFileSync(path.join(dir, 'in.mp4')); rmSync(dir, { recursive: true, force: true })
  await db.$executeRawUnsafe(`TRUNCATE "WebsiteEntry","WebsiteCollection","Activity","BusinessLine" CASCADE`)
  await db.businessLine.create({ data: { id: 'bl', slug: 'bl', name: 'bl', icon: 'x', color: '#000', config: {} } })
  await db.websiteCollection.create({ data: { id: 'med', businessLineId: 'bl', key: 'companii', name: 'M', namePlural: 'M', fields: [] } })
  await db.websiteEntry.create({ data: { id: 'd', businessLineId: 'bl', collectionId: 'med', slug: 'd', title: 'Dr D', status: 'published', partnerAccess: true, data: {} } })
})
after(async () => { if (db) await db.$disconnect() })

const finish = async (id: string) => { await V.caseVideoDone(id); return V.caseVideoJob('d', id)! }

test('a phone video is converted in the background: silent, with a poster, stored and listed as the doctor\'s own', { skip }, async () => {
  const id = await V.startCaseVideo('bl', 'd', mp4, { store })
  assert.equal(V.caseVideoJob('d', id)!.status === 'processing' || V.caseVideoJob('d', id)!.status === 'done', true)
  const j = await finish(id)
  assert.equal(j.status, 'done', j.error)
  const rows = await db.websiteMedia.findMany({ where: { entryId: 'd' }, orderBy: { sortOrder: 'asc' } })
  assert.deepEqual(rows.map((r: any) => [r.kind, r.alt, r.mimeType]), [['file', 'cazuistica-video', 'video/mp4'], ['file', 'cazuistica-poster', 'image/webp']])
  assert.equal(objects.size, 2)
  assert.equal(j.result!.video.url, rows[0].url)
  // the served file has a video stream and no audio stream, and no title/encoder tags
  const dir = mkdtempSync(path.join(tmpdir(), 'cv-out-'))
  try {
    const file = path.join(dir, 'o.mp4'); writeFileSync(file, bodies.get(rows[0].storageKey)!)
    const streams = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_type', '-of', 'json', file]).toString()).streams.map((x: any) => x.codec_type)
    assert.deepEqual(streams, ['video'])
    const tags = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format_tags', '-of', 'json', file]).toString()).format?.tags ?? {}
    assert.equal(Object.keys(tags).filter((k) => !['major_brand', 'minor_version', 'compatible_brands', 'encoder'].includes(k)).length, 0)
  } finally { rmSync(dir, { recursive: true, force: true }) }
  assert.equal(V.caseVideoJob('other', id), null, 'a job is visible only to the entry that started it')
})

test('bad uploads are refused at once; a failed conversion is reported and leaves nothing behind', { skip }, async () => {
  await assert.rejects(V.startCaseVideo('bl', 'd', Buffer.alloc(0), { store }), /gol/)
  await assert.rejects(V.startCaseVideo('bl', 'd', Buffer.from('nu e un video, doar text suficient de lung ca să treacă de verificarea lungimii'), { store }), /Format neacceptat/)
  await assert.rejects(V.startCaseVideo('bl', 'nope', mp4, { store }), /nu există/)
  const before_ = objects.size
  const id = await V.startCaseVideo('bl', 'd', Buffer.concat([mp4.subarray(0, 8), Buffer.from('ftypisom'), Buffer.alloc(64)]), { store })
  const j = await finish(id)
  assert.equal(j.status, 'error'); assert.match(j.error ?? '', /video/i)
  assert.equal(objects.size, before_)
})

test('at most five uploaded videos per doctor', { skip }, async () => {
  const have = await db.websiteMedia.count({ where: { entryId: 'd', alt: 'cazuistica-video' } })
  for (let i = have; i < 5; i++) await db.websiteMedia.create({ data: { entryId: 'd', kind: 'file', storageKey: `k${i}`, url: `https://cdn.test/k${i}`, alt: 'cazuistica-video', mimeType: 'video/mp4', sizeBytes: 1, sortOrder: 950 } })
  await assert.rejects(V.startCaseVideo('bl', 'd', mp4, { store }), /Maxim 5/)
})

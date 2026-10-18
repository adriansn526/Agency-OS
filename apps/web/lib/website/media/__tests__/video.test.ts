import { test, before } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { sniffVideo, transcodeHeroVideo, VIDEO_LIMITS } from '../video'

let mp4: Buffer, webm: Buffer, long: Buffer
const gen = (dir: string, name: string, args: string[]) => { const f = path.join(dir, name); execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', ...args, f]); return readFileSync(f) }
before(() => {
  const d = mkdtempSync(path.join(tmpdir(), 'vt-'))
  try {
    mp4 = gen(d, 'a.mp4', ['-i', 'testsrc=duration=3:size=1920x1080:rate=25', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=3', '-shortest', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-metadata', 'title=SECRET-TITLE'])
    webm = gen(d, 'b.webm', ['-i', 'testsrc=duration=2:size=640x360:rate=25', '-c:v', 'libvpx', '-b:v', '300k'])
    long = gen(d, 'c.mp4', ['-i', 'testsrc=duration=30:size=320x180:rate=10', '-c:v', 'libx264', '-pix_fmt', 'yuv420p'])
  } finally { rmSync(d, { recursive: true, force: true }) }
})

const info = (b: Buffer) => { const d = mkdtempSync(path.join(tmpdir(), 'vp-')); try { const f = path.join(d, 'x.mp4'); writeFileSync(f, b); return JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_type,codec_name,width:format=duration,tags', '-of', 'json', f]).toString()) } finally { rmSync(d, { recursive: true, force: true }) } }

test('sniffVideo reads the type from the bytes', () => {
  assert.equal(sniffVideo(mp4), 'mp4'); assert.equal(sniffVideo(webm), 'webm'); assert.equal(sniffVideo(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>')), null); assert.equal(sniffVideo(Buffer.alloc(8)), null)
})
test('a Full HD mp4 with sound and a title becomes a silent 1280 px H.264 video without metadata, plus a WebP poster', async () => {
  const r = await transcodeHeroVideo(mp4)
  assert.ok(r.width <= VIDEO_LIMITS.outWidth && r.width === 1280 && r.height === 720); assert.ok(r.seconds >= 2.5 && r.seconds <= 3.5); assert.ok(r.video.length < VIDEO_LIMITS.maxOutputBytes)
  const i = info(r.video); const types = i.streams.map((s: any) => s.codec_type); assert.deepEqual(types, ['video']); assert.equal(i.streams[0].codec_name, 'h264'); assert.ok(!JSON.stringify(i).includes('SECRET-TITLE'))
  assert.equal(r.poster.subarray(0, 4).toString(), 'RIFF'); assert.equal(r.poster.subarray(8, 12).toString(), 'WEBP'); assert.ok(r.posterWidth <= 1600)
})
test('webm is accepted and converted to mp4', async () => { const r = await transcodeHeroVideo(webm); assert.equal(sniffVideo(r.video), 'mp4'); assert.equal(r.width, 640) })
test('a 30 s clip is trimmed to 20 s', async () => { const r = await transcodeHeroVideo(long); assert.ok(r.seconds <= 20.5 && r.seconds >= 19) })
test('garbage, fake extensions, empty and oversized files are refused with a clear error', async () => {
  await assert.rejects(transcodeHeroVideo(Buffer.alloc(0)), /gol/)
  await assert.rejects(transcodeHeroVideo(Buffer.from('<?php echo 1; ?>'.repeat(10))), /Format neacceptat/)
  await assert.rejects(transcodeHeroVideo(Buffer.concat([Buffer.from([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70]), Buffer.from('mp42'.repeat(30))])), /video valid|procesat/)
  await assert.rejects(transcodeHeroVideo(Buffer.alloc(VIDEO_LIMITS.maxUploadBytes + 1, 1)), /depășește/)
})

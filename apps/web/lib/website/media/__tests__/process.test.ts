import { test } from 'node:test'
import assert from 'node:assert/strict'
import sharp from 'sharp'
import { LIMITS, processImage, sniffImage } from '../process'
import { publicBase, spacesStore } from '../storage'

const png = (w: number, h: number) => sharp({ create: { width: w, height: h, channels: 4, background: { r: 200, g: 30, b: 30, alpha: 0.5 } } }).png().toBuffer()
const jpgWithExif = () => sharp({ create: { width: 400, height: 200, channels: 3, background: '#336699' } }).withExif({ IFD0: { Copyright: 'secret-owner' } }).jpeg().toBuffer()

test('sniff identifies images from bytes, not names', async () => {
  assert.equal(sniffImage(await png(10, 10)), 'png')
  assert.equal(sniffImage(await jpgWithExif()), 'jpeg')
  assert.equal(sniffImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')), null)
  assert.equal(sniffImage(Buffer.from('%PDF-1.7 .......')), null)
  assert.equal(sniffImage(Buffer.alloc(4)), null)
})

test('images become WebP, are downscaled but never enlarged, and keep transparency for logos', async () => {
  const big = await processImage(await png(3000, 1500), 'logo')
  assert.equal(big.mime, 'image/webp'); assert.equal(big.width, LIMITS.logo.maxSide); assert.equal(big.height, 400)
  const small = await processImage(await png(120, 60), 'logo')
  assert.deepEqual([small.width, small.height], [120, 60])
  const meta = await sharp(small.buffer).metadata()
  assert.equal(meta.format, 'webp'); assert.equal(meta.hasAlpha, true)
})

test('EXIF metadata is stripped', async () => {
  const out = await processImage(await jpgWithExif(), 'image')
  assert.equal((await sharp(out.buffer).metadata()).exif, undefined)
  assert.equal(out.buffer.includes(Buffer.from('secret-owner')), false)
})

test('SVG, text disguised as an image, empty and oversized files are refused with the right status', async () => {
  const status = async (b: Buffer, k: 'logo' | 'cover' | 'image') => processImage(b, k).then(() => 0, (e) => e.status)
  assert.equal(await status(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'), 'logo'), 415)
  assert.equal(await status(Buffer.from('not an image at all'), 'image'), 415)
  assert.equal(await status(Buffer.alloc(0), 'image'), 422)
  assert.equal(await status(Buffer.alloc(LIMITS.logo.maxBytes + 1), 'logo'), 413)
  const truncated = (await png(500, 500)).subarray(0, 200)
  assert.equal(await status(truncated, 'image'), 422)
})

test('public URLs and key extraction only cover our own prefix', () => {
  const env = { SPACES_ENDPOINT: 'https://fra1.digitaloceanspaces.com', SPACES_BUCKET: 'agencyos' } as unknown as NodeJS.ProcessEnv
  assert.equal(publicBase(env), 'https://agencyos.fra1.digitaloceanspaces.com')
  assert.equal(publicBase({ ...env, SPACES_PUBLIC_BASE_URL: 'https://cdn.example.com/' } as unknown as NodeJS.ProcessEnv), 'https://cdn.example.com')
  const base = publicBase()
  assert.equal(spacesStore.keyFromUrl(`${base}/website/bl/e1/logo-ab.webp`), 'website/bl/e1/logo-ab.webp')
  assert.equal(spacesStore.keyFromUrl(`${base}/contracts/secret.pdf`), null)   // other prefixes of the bucket are never touched
  assert.equal(spacesStore.keyFromUrl('https://montrepcom.ro/logo.png'), null)  // external logos found on firm sites are never deleted
  assert.equal(spacesStore.keyFromUrl(null), null)
})

import { test } from 'node:test'
import assert from 'node:assert/strict'
import sharp from 'sharp'
import { rasterizeSvg } from '../adopt'

test('an SVG logo is rendered to PNG, scripts and all, before it can reach the bucket', async () => {
  const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="80"><script>alert(1)</script><rect width="200" height="80" fill="#c50"/></svg>')
  const png = await rasterizeSvg(svg)
  const meta = await sharp(png).metadata()
  assert.equal(meta.format, 'png'); assert.ok((meta.width ?? 0) > 0)
  assert.equal(png.includes(Buffer.from('alert')), false)
})
test('oversized SVG is refused', async () => {
  await assert.rejects(rasterizeSvg(Buffer.alloc(500_001, 'a')), /prea mare/)
})

/**
 * Copies a logo that is only linked from the firm's own website (found by logo discovery) into our bucket, so the page does not depend on
 * another site. Run after a firm accepts. Only entries whose logo is NOT already ours are touched; SVG logos are rasterised first (never stored as SVG).
 */
import sharp from 'sharp'
import { db } from '@repo/db'
import { safeFetch } from '../logo-discovery'
import { uploadEntryImage } from './service'
import { spacesStore, type ObjectStore } from './storage'

const MAX_FETCH = 2_000_000

export type AdoptResult = { entryId: string; status: 'adopted' | 'skipped-own' | 'skipped-none' | 'failed'; reason?: string; url?: string }

/** SVG → PNG buffer (rendered, so no script ever reaches the bucket). */
export async function rasterizeSvg(svg: Buffer): Promise<Buffer> {
  if (svg.length > 500_000) throw new Error('svg prea mare')
  return sharp(svg, { density: 192, limitInputPixels: 40_000_000 }).resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).png().toBuffer()
}

export async function adoptRemoteLogo(lineId: string, entryId: string, store: ObjectStore = spacesStore): Promise<AdoptResult> {
  const e = await db.websiteEntry.findFirst({ where: { id: entryId, businessLineId: lineId }, select: { logoUrl: true } })
  if (!e?.logoUrl) return { entryId, status: 'skipped-none' }
  if (store.keyFromUrl(e.logoUrl)) return { entryId, status: 'skipped-own', url: e.logoUrl }
  const got = await safeFetch(e.logoUrl, { maxBytes: MAX_FETCH, timeoutMs: 8000, accept: 'image/*' })
  if (!got) return { entryId, status: 'failed', reason: 'nu s-a putut descărca' }
  try {
    const bytes = /svg/.test(got.type) || /^\s*(<\?xml|<svg)/i.test(got.body.subarray(0, 200).toString('utf8')) ? await rasterizeSvg(got.body) : got.body
    const r = (await uploadEntryImage(lineId, entryId, 'logo', bytes, { store })) as { url: string }
    return { entryId, status: 'adopted', url: r.url }
  } catch (err) {
    return { entryId, status: 'failed', reason: err instanceof Error ? err.message : 'eroare' }
  }
}

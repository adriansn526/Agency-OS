/** Public image URLs: stored as bucket keys, turned into CDN URLs at read time (base comes from COMMERCE_IMAGES_CDN_BASE). */
let warned = false

export function cdnBase(): string | null {
  const b = process.env.COMMERCE_IMAGES_CDN_BASE?.trim().replace(/\/+$/, '')
  if (b && /^https:\/\/[^\s/]+$/.test(b)) return b
  if (!warned) { warned = true; console.error('[commerce/images] COMMERCE_IMAGES_CDN_BASE is missing or not an https origin; images are returned as null') }
  return null
}

/** https URL with every path segment percent-encoded, e.g. parts/1301/130105152_1.JPG */
export function imageUrl(key: string): string | null {
  const base = cdnBase()
  return base ? `${base}/${key.split('/').map(encodeURIComponent).join('/')}` : null
}

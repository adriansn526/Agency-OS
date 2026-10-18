/**
 * Validation and normalisation of images uploaded to the Website module.
 *
 * - The file type comes from the bytes (magic numbers), never from the name or the browser's Content-Type. SVG is refused (it can carry scripts).
 * - Every image is decoded, auto-rotated, resized and re-encoded as WebP, which also drops EXIF (GPS, camera, owner) from phone photos.
 */
import sharp from 'sharp'
import { AdminError } from '../admin/errors'

export type ImageKind = 'logo' | 'cover' | 'image'

export const LIMITS: Record<ImageKind, { maxBytes: number; maxSide: number }> = {
  logo: { maxBytes: 3_000_000, maxSide: 800 },
  cover: { maxBytes: 8_000_000, maxSide: 2400 },
  image: { maxBytes: 10_000_000, maxSide: 2000 },
}
const MAX_PIXELS = 40_000_000

/** 'jpeg' | 'png' | 'webp' | 'gif' from the first bytes, or null. */
export function sniffImage(b: Uint8Array): 'jpeg' | 'png' | 'webp' | 'gif' | null {
  if (b.length < 12) return null
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpeg'
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return 'png'
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'webp'
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) return 'gif'
  return null
}

export interface ProcessedImage { buffer: Buffer; mime: 'image/webp'; width: number; height: number; bytes: number }

export async function processImage(input: Buffer, kind: ImageKind): Promise<ProcessedImage> {
  const lim = LIMITS[kind]
  if (input.length === 0) throw new AdminError('Fișierul este gol', 422)
  if (input.length > lim.maxBytes) throw new AdminError(`Fișierul depășește ${Math.round(lim.maxBytes / 1_000_000)} MB`, 413)
  if (!sniffImage(input)) throw new AdminError('Format neacceptat. Folosește JPG, PNG, WebP sau GIF (SVG nu este permis).', 415)
  try {
    const out = await sharp(input, { limitInputPixels: MAX_PIXELS, failOn: 'error' })
      .rotate() // honour the EXIF orientation before the metadata is dropped
      .resize({ width: lim.maxSide, height: lim.maxSide, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: kind === 'logo' ? 92 : 82 })
      .toBuffer({ resolveWithObject: true })
    return { buffer: out.data, mime: 'image/webp', width: out.info.width, height: out.info.height, bytes: out.data.length }
  } catch {
    throw new AdminError('Imaginea nu poate fi citită (fișier corupt sau prea mare)', 422)
  }
}

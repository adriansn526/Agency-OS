/**
 * Manual product images: uploaded to the bucket under manual/<SKU>/ (never under parts/), then referenced in CommerceProductImage
 * with source='manual' (these always sort before imported ones). Needs a bucket key WITH write access in
 * COMMERCE_IMAGES_S3_KEY / COMMERCE_IMAGES_S3_SECRET (the import itself only reads, via rclone).
 */
import { randomBytes } from 'crypto'
import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { db } from '@repo/db'

export const MAX_MANUAL_BYTES = 8 * 1024 * 1024
export class ImageUploadError extends Error {
  constructor(message: string, public status: 400 | 404 | 413 | 503 = 400) { super(message) }
}

let client: S3Client | null = null
function s3() {
  const key = process.env.COMMERCE_IMAGES_S3_KEY, secret = process.env.COMMERCE_IMAGES_S3_SECRET
  if (!key || !secret) throw new ImageUploadError('Încărcarea de poze nu este configurată (lipsește cheia de scriere pentru bucket).', 503)
  return (client ??= new S3Client({
    region: process.env.COMMERCE_IMAGES_S3_REGION ?? 'fra1',
    endpoint: process.env.COMMERCE_IMAGES_S3_ENDPOINT ?? 'https://fra1.digitaloceanspaces.com',
    credentials: { accessKeyId: key, secretAccessKey: secret },
  }))
}
const bucket = () => process.env.COMMERCE_IMAGES_BUCKET ?? 'media-imgs'

function sniff(b: Buffer): { ext: 'jpg' | 'png' | 'webp'; type: string } | null {
  if (b.length > 12 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { ext: 'jpg', type: 'image/jpeg' }
  if (b.length > 12 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { ext: 'png', type: 'image/png' }
  if (b.length > 12 && b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP') return { ext: 'webp', type: 'image/webp' }
  return null
}

export async function addManualImage(productId: string, bytes: Buffer) {
  if (bytes.length === 0) throw new ImageUploadError('Fișierul este gol.')
  if (bytes.length > MAX_MANUAL_BYTES) throw new ImageUploadError('Fișierul depășește 8 MB.', 413)
  const kind = sniff(bytes)
  if (!kind) throw new ImageUploadError('Format neacceptat. Folosește JPEG, PNG sau WebP.')
  const product = await db.commerceProduct.findUnique({ where: { id: productId }, select: { supplierCode: true } })
  if (!product) throw new ImageUploadError('Produsul nu există.', 404)
  const client = s3() // fail early (503) if not configured

  let width: number | null = null, height: number | null = null
  try {
    const sharp = (await import('sharp')).default
    const meta = await sharp(bytes).metadata()
    width = meta.width ?? null; height = meta.height ?? null
  } catch { throw new ImageUploadError('Fișierul nu este o imagine validă.') }

  const key = `manual/${product.supplierCode}/${Date.now()}-${randomBytes(4).toString('hex')}.${kind.ext}`
  await client.send(new PutObjectCommand({ Bucket: bucket(), Key: key, Body: bytes, ContentType: kind.type, ACL: 'public-read', CacheControl: 'public, max-age=31536000' }))
  const rows = await db.$queryRaw<Array<{ id: string }>>`
    INSERT INTO "CommerceProductImage" (id, "productId", "objectKey", position, width, height, "sizeBytes", source, "createdAt", "updatedAt")
    VALUES (gen_random_uuid()::text, ${productId}, ${key}, COALESCE((SELECT max(position) + 1 FROM "CommerceProductImage" WHERE "productId" = ${productId} AND source = 'manual'), 0),
            ${width}, ${height}, ${bytes.length}, 'manual', now(), now())
    RETURNING id`
  return { id: rows[0]!.id, key, width, height }
}

/** Only manual images can be removed from the ERP; their object (under manual/) is deleted too. Imported (parts/) images are never touched. */
export async function removeManualImage(productId: string, imageId: string) {
  const rows = await db.$queryRaw<Array<{ objectKey: string }>>`
    DELETE FROM "CommerceProductImage" WHERE id = ${imageId} AND "productId" = ${productId} AND source = 'manual' AND "objectKey" LIKE 'manual/%' RETURNING "objectKey"`
  const row = rows[0]
  if (!row) throw new ImageUploadError('Poza nu există sau nu este una încărcată manual.', 404)
  try { await s3().send(new DeleteObjectCommand({ Bucket: bucket(), Key: row.objectKey })) } catch (e) { console.error('[commerce/images] could not delete object', row.objectKey, e) }
}

/** Public object storage for website images: DigitalOcean Spaces, prefix `website/`, per-object public-read (the rest of the bucket stays private). */
import { DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { BUCKET_NAME, isStorageConfigured, s3 } from '@/lib/storage/s3'
import { AdminError } from '../admin/errors'

export const PUBLIC_PREFIX = 'website/'

export interface ObjectStore {
  put(key: string, body: Buffer, contentType: string): Promise<void>
  remove(key: string): Promise<void>
  publicUrl(key: string): string
  /** The object key when `url` points into our public prefix, else null (external or foreign URLs are never deleted). */
  keyFromUrl(url: string | null | undefined): string | null
}

/** https://<bucket>.<region>.digitaloceanspaces.com, or SPACES_PUBLIC_BASE_URL (e.g. the CDN endpoint). */
export function publicBase(env: NodeJS.ProcessEnv = process.env): string {
  const custom = env.SPACES_PUBLIC_BASE_URL?.trim()
  if (custom) return custom.replace(/\/$/, '')
  const host = new URL(env.SPACES_ENDPOINT || 'https://fra1.digitaloceanspaces.com').host
  return `https://${env.SPACES_BUCKET || BUCKET_NAME}.${host}`
}

export const spacesStore: ObjectStore = {
  async put(key, body, contentType) {
    if (!s3 || !isStorageConfigured) throw new AdminError('Stocarea de fișiere nu este configurată (SPACES_*)', 503)
    if (!key.startsWith(PUBLIC_PREFIX)) throw new Error('key outside the public prefix')
    await s3.send(new PutObjectCommand({ Bucket: BUCKET_NAME, Key: key, Body: body, ContentType: contentType, ACL: 'public-read', CacheControl: 'public, max-age=31536000, immutable' }))
  },
  async remove(key) {
    if (!s3 || !isStorageConfigured || !key.startsWith(PUBLIC_PREFIX)) return
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: key }))
  },
  publicUrl: (key) => `${publicBase()}/${key}`,
  keyFromUrl(url) {
    const base = `${publicBase()}/${PUBLIC_PREFIX}`
    return url && url.startsWith(base) ? decodeURI(url.slice(publicBase().length + 1)) : null
  },
}

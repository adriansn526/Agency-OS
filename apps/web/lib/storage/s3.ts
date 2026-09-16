import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import * as fs from 'fs'
import * as path from 'path'
import { pipeline } from 'stream/promises'

// ── DigitalOcean Spaces Config ──────────────────────────────────────────
const SPACES_ENDPOINT = process.env.SPACES_ENDPOINT || ''
const SPACES_REGION = process.env.SPACES_REGION || 'fra1'
const SPACES_KEY = process.env.SPACES_KEY || ''
const SPACES_SECRET = process.env.SPACES_SECRET || ''
export const BUCKET_NAME = process.env.SPACES_BUCKET || 'agencyos'

export const isStorageConfigured = !!(SPACES_ENDPOINT && SPACES_KEY && SPACES_SECRET)

// Fallback local PRIVAT — în afara public/, accesibil doar prin API
const LOCAL_STORAGE_DIR = '/var/data/agency-os/uploads'
// Legacy path — doar pentru citire în perioada de migrare
const LEGACY_PUBLIC_DIR = path.join(process.cwd(), 'public', 'uploads')

// ── Logging la pornire ──────────────────────────────────────────────────
if (isStorageConfigured) {
  console.log(`[Storage] ✅ DigitalOcean Spaces configurat: ${SPACES_ENDPOINT} / bucket: ${BUCKET_NAME}`)
} else {
  console.warn('[Storage] ⚠️  Spaces NU e configurat! Fișierele se salvează LOCAL în', LOCAL_STORAGE_DIR)
  console.warn('[Storage] ⚠️  Setează SPACES_ENDPOINT, SPACES_KEY, SPACES_SECRET pentru storage cloud.')
}

// ── S3 Client ───────────────────────────────────────────────────────────
export const s3 = isStorageConfigured
  ? new S3Client({
      endpoint: SPACES_ENDPOINT,
      region: SPACES_REGION,
      credentials: {
        accessKeyId: SPACES_KEY,
        secretAccessKey: SPACES_SECRET,
      },
      forcePathStyle: false, // DigitalOcean Spaces folosește virtual-hosted style
    })
  : null

/**
 * Upload fișier în Spaces cu ACL private.
 * Fallback: stocare locală în /var/data/agency-os/uploads/ (cu warning explicit).
 */
export async function uploadToS3(
  key: string,
  buffer: Buffer,
  contentType: string = 'application/pdf'
): Promise<string> {
  if (s3 && isStorageConfigured) {
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ACL: 'private',
    })
    await s3.send(command)
    return key
  }

  // Fallback local PRIVAT (cu warning)
  console.warn(`[Storage] ⚠️  FALLBACK LOCAL: Salvare fișier în ${LOCAL_STORAGE_DIR}/${key}`)
  const fullPath = path.join(LOCAL_STORAGE_DIR, key)
  await fs.promises.mkdir(path.dirname(fullPath), { recursive: true })
  await fs.promises.writeFile(fullPath, buffer)
  return key
}

/**
 * Generează Signed URL cu expirare 15 minute.
 * Folosit intern de proxy route — URL-ul NU părăsește serverul.
 */
export async function getSignedDownloadUrl(key: string): Promise<string> {
  if (!s3 || !isStorageConfigured) {
    throw new Error('[Storage] Spaces nu este configurat. Setează SPACES_* variabilele.')
  }
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  })
  return getSignedUrl(s3, command, { expiresIn: 900 }) // 15 min
}

/**
 * Verifică dacă un fișier există în Spaces (HEAD request).
 */
export async function fileExistsInSpaces(key: string): Promise<boolean> {
  if (!s3 || !isStorageConfigured) return false
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET_NAME, Key: key }))
    return true
  } catch {
    return false
  }
}

/**
 * Download fișier pe disc local (pentru generare ZIP etc).
 * Ordinea de rezolvare:
 * 1. Spaces (dacă e configurat)
 * 2. Stocare locală privată (/var/data/agency-os/uploads/)
 * 3. Legacy public/ (doar tranzitoriu, pre-migrare)
 */
export async function downloadFromS3(
  key: string,
  destinationPath: string
): Promise<void> {
  // 1. Încearcă din Spaces
  if (s3 && isStorageConfigured) {
    try {
      const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      })
      const response = await s3.send(command)
      if (response.Body) {
        const fileStream = fs.createWriteStream(destinationPath)
        // @ts-ignore — Body e ReadableStream, pipeline funcționează
        await pipeline(response.Body, fileStream)
        return
      }
    } catch (err) {
      console.warn(`[Storage] Fișierul ${key} nu a fost găsit în Spaces, se caută local...`)
    }
  }

  // 2. Stocare locală privată
  const privatePath = path.join(LOCAL_STORAGE_DIR, key)
  if (fs.existsSync(privatePath)) {
    await fs.promises.copyFile(privatePath, destinationPath)
    return
  }

  // 3. Legacy public/ (tranzitoriu — se șterge după migrare)
  const legacyPath = path.join(LEGACY_PUBLIC_DIR, key)
  if (fs.existsSync(legacyPath)) {
    console.warn(`[Storage] ⚠️  Citire din LEGACY public/uploads/ — fișierul ${key} trebuie migrat!`)
    await fs.promises.copyFile(legacyPath, destinationPath)
    return
  }

  throw new Error(`[Storage] Fișierul ${key} nu a fost găsit nicăieri (Spaces / local / legacy).`)
}

/**
 * Proxy stream direct din Spaces (fără redirect).
 * Returnează body stream + content info, sau null dacă nu e găsit.
 */
export async function getFileStream(key: string): Promise<{
  body: ReadableStream | NodeJS.ReadableStream
  contentType: string
  contentLength: number
} | null> {
  // 1. Spaces
  if (s3 && isStorageConfigured) {
    try {
      const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      })
      const response = await s3.send(command)
      if (response.Body) {
        return {
          body: response.Body as any,
          contentType: response.ContentType || 'application/octet-stream',
          contentLength: response.ContentLength || 0,
        }
      }
    } catch {
      // fallthrough
    }
  }

  // 2. Local privat
  const privatePath = path.join(LOCAL_STORAGE_DIR, key)
  if (fs.existsSync(privatePath)) {
    const stat = await fs.promises.stat(privatePath)
    return {
      body: fs.createReadStream(privatePath),
      contentType: key.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream',
      contentLength: stat.size,
    }
  }

  // 3. Legacy
  const legacyPath = path.join(LEGACY_PUBLIC_DIR, key)
  if (fs.existsSync(legacyPath)) {
    console.warn(`[Storage] ⚠️  Servire din LEGACY public/uploads/ — ${key}`)
    const stat = await fs.promises.stat(legacyPath)
    return {
      body: fs.createReadStream(legacyPath),
      contentType: key.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream',
      contentLength: stat.size,
    }
  }

  return null
}

/**
 * Returnează informații despre statusul storage-ului (pentru UI setări).
 */
export function getStorageStatus(): {
  provider: 'spaces' | 'local'
  configured: boolean
  endpoint?: string
  bucket?: string
  localDir: string
} {
  return {
    provider: isStorageConfigured ? 'spaces' : 'local',
    configured: isStorageConfigured,
    endpoint: isStorageConfigured ? SPACES_ENDPOINT : undefined,
    bucket: isStorageConfigured ? BUCKET_NAME : undefined,
    localDir: LOCAL_STORAGE_DIR,
  }
}

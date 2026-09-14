import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import * as fs from 'fs'
import { pipeline } from 'stream/promises'

// Configurația S3 din Environment
const s3Config = {
  endpoint: process.env.S3_ENDPOINT || '',
  region: process.env.S3_REGION || 'eu-central-1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY || '',
    secretAccessKey: process.env.S3_SECRET_KEY || ''
  },
  forcePathStyle: true // necesar pt MinIO/R2 uneori
}

export const s3 = new S3Client(s3Config)
export const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'agency-os-bucket'

/**
 * Încarcă un buffer în S3
 */
export async function uploadToS3(key: string, buffer: Buffer, contentType: string = 'application/pdf'): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType
  })

  await s3.send(command)
  return key // Returnăm doar key-ul relativ. Fișierul NU este public, deci nu returnăm un URL public.
}

/**
 * Descarcă un fișier din S3 direct pe discul local (în /tmp)
 * Util pentru procesări batch/ZIP unde avem nevoie de fișierele fizic
 */
export async function downloadFromS3(key: string, destinationPath: string): Promise<void> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  })

  const response = await s3.send(command)
  
  if (!response.Body) {
    throw new Error(`Fișierul ${key} nu are conținut (Body missing).`)
  }

  // Cast la stream și scriere folosind pipeline (evităm memory leaks la fișiere mari)
  const fileStream = fs.createWriteStream(destinationPath)
  // @ts-ignore
  await pipeline(response.Body, fileStream)
}

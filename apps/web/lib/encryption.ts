// ═══════════════════════════════════════════════════════
// Agency-OS — AES-256 Encryption for SSH Keys
// ═══════════════════════════════════════════════════════
// Uses AES-256-GCM for encrypting sensitive data (SSH private keys)
// stored in the database.
//
// Key: process.env.ENCRYPTION_KEY (32-byte hex string)

import { createCipheriv, createDecipheriv, randomBytes } from "crypto"

const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY
  if (!key) {
    throw new Error("ENCRYPTION_KEY environment variable is not set")
  }
  // Accept hex (64 chars) or raw (32 chars)
  if (key.length === 64) return Buffer.from(key, "hex")
  if (key.length === 32) return Buffer.from(key, "utf-8")
  throw new Error("ENCRYPTION_KEY must be 32 bytes (64 hex chars or 32 raw chars)")
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns: base64(iv + authTag + ciphertext)
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(plaintext, "utf-8")
  encrypted = Buffer.concat([encrypted, cipher.final()])
  const authTag = cipher.getAuthTag()

  // Pack: IV (16) + AuthTag (16) + Ciphertext
  const packed = Buffer.concat([iv, authTag, encrypted])
  return packed.toString("base64")
}

/**
 * Decrypt a base64-encoded encrypted string.
 */
export function decrypt(encryptedBase64: string): string {
  const key = getEncryptionKey()
  const packed = Buffer.from(encryptedBase64, "base64")

  const iv = packed.subarray(0, IV_LENGTH)
  const authTag = packed.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH)
  const ciphertext = packed.subarray(IV_LENGTH + AUTH_TAG_LENGTH)

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(ciphertext)
  decrypted = Buffer.concat([decrypted, decipher.final()])
  return decrypted.toString("utf-8")
}

/**
 * Generate a random 32-byte encryption key as hex.
 * Use this to create ENCRYPTION_KEY for .env
 */
export function generateEncryptionKey(): string {
  return randomBytes(32).toString("hex")
}

import { db } from '@repo/db'
import crypto from 'crypto'

const ENCRYPTION_KEY = process.env.NEXTAUTH_SECRET || process.env.ENCRYPTION_KEY || 'default-secret-key-32-chars-long!'
const ALGORITHM = 'aes-256-cbc'

export function encrypt(text: string) {
  if (!text) return text
  const iv = crypto.randomBytes(16)
  const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32))
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  let encrypted = cipher.update(text)
  encrypted = Buffer.concat([encrypted, cipher.final()])
  return iv.toString('hex') + ':' + encrypted.toString('hex')
}

export function decrypt(text: string) {
  if (!text || !text.includes(':')) return text
  try {
    const textParts = text.split(':')
    const iv = Buffer.from(textParts.shift()!, 'hex')
    const encryptedText = Buffer.from(textParts.join(':'), 'hex')
    const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32))
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    let decrypted = decipher.update(encryptedText)
    decrypted = Buffer.concat([decrypted, decipher.final()])
    return decrypted.toString()
  } catch (e) {
    console.error('Decryption failed:', e)
    return text
  }
}

export async function getConnectedAccount(provider: string, clientId?: string) {
  const where: any = { provider }
  if (clientId) {
    where.clientId = clientId
  } else {
    // If no clientId is specified, assume we want the "master" agency account
    where.clientId = null
  }
  
  const account = await db.connectedAccount.findFirst({
    where,
    orderBy: { createdAt: 'desc' }
  })
  
  if (!account) return null
  
  return {
    ...account,
    accessToken: decrypt(account.accessToken),
    refreshToken: account.refreshToken ? decrypt(account.refreshToken) : null
  }
}

export async function saveConnectedAccount(data: {
  provider: string
  providerAccountId: string
  accessToken: string
  refreshToken?: string
  expiresAt?: number
  email?: string
  clientId?: string
}) {
  return db.connectedAccount.upsert({
    where: {
      provider_providerAccountId: {
        provider: data.provider,
        providerAccountId: data.providerAccountId
      }
    },
    create: {
      provider: data.provider,
      providerAccountId: data.providerAccountId,
      accessToken: encrypt(data.accessToken),
      refreshToken: data.refreshToken ? encrypt(data.refreshToken) : null,
      expiresAt: data.expiresAt,
      email: data.email,
      clientId: data.clientId,
    },
    update: {
      accessToken: encrypt(data.accessToken),
      refreshToken: data.refreshToken ? encrypt(data.refreshToken) : undefined,
      expiresAt: data.expiresAt,
      email: data.email,
      clientId: data.clientId,
    }
  })
}

export async function refreshGoogleToken(account: any) {
  if (!account.refreshToken) throw new Error("No refresh token available")
  
  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
  const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
  
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID!,
      client_secret: GOOGLE_CLIENT_SECRET!,
      refresh_token: account.refreshToken, // This is already decrypted if we used getConnectedAccount
      grant_type: 'refresh_token',
    })
  })
  
  const data = await response.json()
  
  if (!response.ok) {
    throw new Error('Failed to refresh token: ' + JSON.stringify(data))
  }
  
  // Update in DB
  await saveConnectedAccount({
    provider: 'google',
    providerAccountId: account.providerAccountId,
    accessToken: data.access_token,
    refreshToken: account.refreshToken, // keep the old one, Google usually doesn't rotate it unless specified
    expiresAt: Math.floor(Date.now() / 1000) + data.expires_in,
    email: account.email,
    clientId: account.clientId
  })
  
  return data.access_token
}

export async function getValidAccessToken(provider: string, clientId?: string) {
  const account = await getConnectedAccount(provider, clientId)
  if (!account) return null
  
  // If no expiresAt, assume it's a non-expiring token (like PostHog PAT)
  if (!account.expiresAt) {
    return account.accessToken
  }
  
  // If it's expiring in less than 5 minutes, refresh it
  if (account.expiresAt < Math.floor(Date.now() / 1000) + 300) {
    if (provider === 'google') {
      return await refreshGoogleToken(account)
    }
  }
  
  return account.accessToken
}

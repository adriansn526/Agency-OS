import 'dotenv/config';
import { db } from './packages/db/src/index.js'
import crypto from 'crypto'

const ENCRYPTION_KEY = process.env.NEXTAUTH_SECRET || process.env.ENCRYPTION_KEY || 'default-secret-key-32-chars-long!'
const ALGORITHM = 'aes-256-cbc'

function decrypt(text: string) {
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
    return text
  }
}

async function main() {
  const account = await db.connectedAccount.findFirst({
    where: { provider: 'posthog', clientId: null }
  });
  const token = decrypt(account!.accessToken);
  console.log("Decrypted Token Prefix:", token.substring(0, 4));
  console.log("Decrypted Token Suffix:", token.substring(token.length - 4));
}
main();

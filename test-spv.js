import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const prisma = new PrismaClient()
const ENCRYPTION_KEY = '62b97af0f8223ab0d3b06fe7bb454781944cd8070e2f7904bc7921077d49c378'

function decrypt(text) {
  const [ivHex, encryptedHex] = text.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const encryptedText = Buffer.from(encryptedHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

async function main() {
  const settings = await prisma.anafSettings.findFirst()
  const token = decrypt(settings.accessToken)
  
  const dlRes = await fetch('https://api.anaf.ro/prod/FCTEL/rest/descarcare?id=7974351611', {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  
  const contentType = dlRes.headers.get('content-type')
  console.log("Status:", dlRes.status, "Content-Type:", contentType)
  
  const buf = Buffer.from(await dlRes.arrayBuffer())
  console.log("Response body (first 300 chars):", buf.toString('utf8', 0, Math.min(buf.length, 300)))
}
main()

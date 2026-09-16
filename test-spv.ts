import { db } from './packages/db/index.ts'
import { decrypt } from './apps/web/lib/encryption.ts'

async function main() {
  const settings = await db.anafSettings.findFirst()
  if (!settings || !settings.accessToken) {
    console.log("No settings")
    return
  }
  const token = decrypt(settings.accessToken)
  
  const dlRes = await fetch('https://api.anaf.ro/prod/FCTEL/rest/descarcare?id=7974351611', {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  
  const contentType = dlRes.headers.get('content-type')
  console.log("Status:", dlRes.status, "Content-Type:", contentType)
  
  const text = await dlRes.text()
  console.log("Response body (first 200 chars):", text.substring(0, 200))
}
main()

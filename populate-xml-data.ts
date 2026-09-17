import { PrismaClient } from './node_modules/@prisma/client'
import { parseEFacturaZip } from './apps/web/lib/accounting/ubl-parser'
import { decrypt, encrypt } from './apps/web/lib/encryption'

const db = new PrismaClient()
const ANAF_API_BASE = 'https://api.anaf.ro/prod/FCTEL/rest'

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function main() {
  const tenant = await db.tenantInstance.findFirst()
  let settings = await db.anafSettings.findFirst({ where: { tenantId: tenant.id } })
  
  if (!settings?.accessToken) throw new Error("No ANAF token")
  
  let accessToken = decrypt(settings.accessToken)
  
  // Try one fetch, if 401, refresh
  const testRes = await fetch(`${ANAF_API_BASE}/listaMesajeFactura?zile=1&cif=123456`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  })
  
  if (testRes.status === 401) {
    console.log("Token expired, refreshing...")
    const params = new URLSearchParams()
    params.append('grant_type', 'refresh_token')
    params.append('refresh_token', decrypt(settings.refreshToken))
    params.append('client_id', process.env.ANAF_CLIENT_ID!)
    params.append('client_secret', process.env.ANAF_CLIENT_SECRET!)
    
    const tokenRes = await fetch('https://logincert.anaf.ro/anaf-oauth2/v1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    })
    const newTokens = await tokenRes.json()
    if (!newTokens.access_token) throw new Error("Refresh failed")
    
    accessToken = newTokens.access_token
    await db.anafSettings.update({
      where: { id: settings.id },
      data: { accessToken: encrypt(accessToken) }
    })
  }

  const invoices = await db.supplierInvoice.findMany({
    where: { source: 'spv', spvId: { not: null }, xmlData: null }
  })
  console.log(`Found ${invoices.length} invoices needing XML download.`)
  
  let updated = 0
  for (const invoice of invoices) {
    try {
      console.log(`Downloading SPV ID ${invoice.spvId}...`)
      const res = await fetch(`${ANAF_API_BASE}/descarcare?id=${invoice.spvId}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      })
      if (!res.ok) {
        console.error(`Failed to download ${invoice.spvId}: ${res.statusText}`)
        continue
      }
      
      const zipBuffer = Buffer.from(await res.arrayBuffer())
      const parsed = parseEFacturaZip(zipBuffer)
      
      await db.supplierInvoice.update({
        where: { id: invoice.id },
        data: {
          xmlData: parsed.rawXml,
          contractReference: parsed.contractReference ? parsed.contractReference.toString() : null
        }
      })
      updated++
      await sleep(1500)
    } catch (e) {
      console.error(`Error processing invoice ${invoice.id}:`, e)
    }
  }
  console.log(`Successfully populated xmlData and contractReference for ${updated} invoices.`)
}

main().catch(console.error).finally(() => db.$disconnect())

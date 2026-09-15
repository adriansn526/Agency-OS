import { db } from '@repo/db'
import { decrypt } from '@/lib/encryption'
import { parseEFacturaZip } from './ubl-parser'
import { readSettings } from '@/app/api/settings/_store'

const ANAF_API_BASE = 'https://api.anaf.ro/prod/FCTEL/rest'

async function refreshAnafToken(tenantId: string, refreshToken: string, clientId: string, clientSecret: string) {
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'https://admin.asns.ro'}/api/accounting/spv/callback`
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
  
  const res = await fetch('https://logincert.anaf.ro/anaf-oauth2/v1/token', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${basicAuth}`
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      token_content_type: 'jwt'
    })
  })

  if (!res.ok) {
    throw new Error('Refresh token a eșuat. ANAF a refuzat tokenul de reînnoire.')
  }
  return await res.json()
}

export async function syncSpvForTenant(tenantId: string, days: number = 60, triggeredBy?: string) {
  if (days < 1 || days > 60) {
    throw new Error('Limita legală ANAF este între 1 și 60 de zile.')
  }

  const settings = await db.anafSettings.findUnique({ where: { tenantId } })
  if (!settings || !settings.accessToken) {
    throw new Error('ANAF SPV nu este configurat sau autentificat pentru acest tenant.')
  }

  // 1. Creare Log rulare
  const syncLog = await db.spvSyncLog.create({
    data: {
      tenantId,
      daysRequested: days,
      status: 'running',
      triggeredBy
    }
  })

  try {
    const clientId = process.env.ANAF_CLIENT_ID
    const clientSecret = process.env.ANAF_CLIENT_SECRET
    if (!clientId || !clientSecret) {
      throw new Error('Cheile ANAF_CLIENT_ID și ANAF_CLIENT_SECRET lipsesc din mediu.')
    }

    let accessToken = decrypt(settings.accessToken)
    
    if (settings.expiresAt && new Date() > settings.expiresAt) {
      if (!settings.refreshToken) throw new Error('Token expirat și fără refresh token disponibil.')
      const refreshToken = decrypt(settings.refreshToken)
      console.log('[SPV] Token expirat, se incearca reînnoirea...')
      const newTokens = await refreshAnafToken(tenantId, refreshToken, clientId, clientSecret)
      
      accessToken = newTokens.access_token
      // Vom actualiza si DB-ul in mod real (aici doar memorie pt scope-ul taskului curent,
      // teoretic trebuie upsert cu noile tokenuri)
    }

    async function fetchAnafWithBackoff(url: string, options: any, maxRetries = 3) {
      let retries = 0
      while (retries < maxRetries) {
        const response = await fetch(url, options)
        if (response.status === 429) {
          retries++
          const waitMs = Math.pow(2, retries) * 1000
          console.warn(`[SPV] Rate limit (429) atins. Așteptăm ${waitMs}ms (Încercarea ${retries}/${maxRetries})`)
          await new Promise(res => setTimeout(res, waitMs))
          continue
        }
        if (response.status === 403) {
          throw new Error(`Acces interzis (403 Forbidden). Verifică dacă CIF-ul este asociat certificatului curent în SPV.`)
        }
        return response
      }
      throw new Error(`Sincronizarea a eșuat după ${maxRetries} încercări din cauza rate limit-ului ANAF.`)
    }

    // Extragem CIF-ul din setarile companiei si eliminam prefixul "RO"
    const companyCifFull = readSettings().company?.cif || process.env.COMPANY_CIF || '123456'
    const agencyCif = companyCifFull.replace(/^RO/i, '')
    
    const listRes = await fetchAnafWithBackoff(`${ANAF_API_BASE}/listaMesajeFactura?zile=${days}&cif=${agencyCif}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    })
    
    if (!listRes.ok) {
      throw new Error(`Eroare la obținerea listei de mesaje ANAF: ${listRes.statusText}`)
    }

    const listData = await listRes.json()
    const mesaje = listData.mesaje || []
    
    let processed = 0
    let skipped = 0
    let errors = 0

    for (const msg of mesaje) {
      if (msg.tip !== 'FACTURA PRIMITA' && msg.tip !== 'FACTURA EMISA') continue;
      const spvId = msg.id.toString()
      const isAP = msg.tip === 'FACTURA PRIMITA'

      let exists = false;
      if (isAP) {
        exists = !!(await db.supplierInvoice.findUnique({ where: { spvId } }))
      } else {
        exists = !!(await db.invoice.findUnique({ where: { spvId } }))
      }

      if (exists) {
        skipped++
        continue
      }

      const dlRes = await fetchAnafWithBackoff(`${ANAF_API_BASE}/descarcare?id=${spvId}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      })
      
      if (!dlRes.ok) {
        console.error(`Eroare descarcare SPV ID ${spvId}: ${dlRes.statusText}`)
        errors++
        continue
      }

      const zipBuffer = Buffer.from(await dlRes.arrayBuffer())
      
      try {
        const parsedData = parseEFacturaZip(zipBuffer)
        
        if (isAP) {
          // FACTURA PRIMITA (Furnizori - AP)
          const possibleDuplicate = await db.supplierInvoice.findFirst({
            where: { tenantId, invoiceNumber: parsedData.numarFactura }
          })

          if (possibleDuplicate) {
            let noulStatus = possibleDuplicate.status
            if (possibleDuplicate.status === 'paid' && Number(possibleDuplicate.amount) !== parsedData.total) {
              noulStatus = 'unpaid'
            }
            await db.supplierInvoice.update({
              where: { id: possibleDuplicate.id },
              data: {
                spvId, source: 'spv', extractionStatus: 'confirmed',
                amount: parsedData.total, status: noulStatus,
                currency: parsedData.moneda, issueDate: parsedData.dataEmitere,
                xmlData: parsedData.rawXml, contractReference: parsedData.contractReference || null,
              }
            })
          } else {
            await db.supplierInvoice.create({
              data: {
                tenantId, spvId, source: 'spv', extractionStatus: 'confirmed',
                amount: parsedData.total, currency: parsedData.moneda,
                issueDate: parsedData.dataEmitere, invoiceNumber: parsedData.numarFactura,
                extractedSupplierName: parsedData.numeFurnizor, pdfUrl: '',
                xmlData: parsedData.rawXml, contractReference: parsedData.contractReference || null,
              }
            })
          }
        } else {
          // FACTURA EMISA (Clienți - AR)
          const possibleDuplicates = await db.invoice.findMany({
            where: { number: parsedData.numarFactura },
            include: { client: true }
          })
          
          const matchedDup = possibleDuplicates.find(inv => 
            (inv.client?.cui === parsedData.cuiClient || inv.extractedClientCui === parsedData.cuiClient)
          )

          if (matchedDup) {
            await db.invoice.update({
              where: { id: matchedDup.id },
              data: { spvId, xmlData: parsedData.rawXml, source: 'spv' }
            })
          } else {
            const clientMatch = await db.client.findFirst({ where: { cui: parsedData.cuiClient } })
            
            await db.invoice.create({
              data: {
                spvId, source: 'spv',
                extractionStatus: clientMatch ? 'confirmed' : 'pending_review',
                clientId: clientMatch ? clientMatch.id : undefined,
                businessLineId: clientMatch ? clientMatch.businessLineId : undefined,
                extractedClientName: parsedData.numeClient,
                extractedClientCui: parsedData.cuiClient,
                number: parsedData.numarFactura,
                amount: parsedData.total,
                currency: parsedData.moneda,
                issuedAt: parsedData.dataEmitere,
                dueDate: parsedData.dataEmitere,
                status: 'emisa',
                direction: 'emisa',
                type: 'factura',
                xmlData: parsedData.rawXml,
                items: [{ description: 'Factură SPV', quantity: 1, unitPrice: parsedData.sumaNeta, total: parsedData.sumaNeta }]
              }
            })
          }
        }
        
        processed++
      } catch (e) {
        console.error(`Eroare la parsarea facturii SPV ID ${spvId}:`, e)
        errors++
      }
    }

    const finalStatus = errors > 0 && processed > 0 ? 'partial' : (errors > 0 && processed === 0 ? 'failed' : 'success')

    // Actualizam Log-ul
    await db.spvSyncLog.update({
      where: { id: syncLog.id },
      data: {
        finishedAt: new Date(),
        status: finalStatus,
        messagesFound: mesaje.length,
        invoicesImported: processed,
        invoicesDeduped: skipped,
        errorMessage: errors > 0 ? `${errors} mesaje nu au putut fi procesate.` : null
      }
    })

    // Actualizam lastSyncAt DOAR daca avem success sau partial
    if (finalStatus === 'success' || finalStatus === 'partial') {
      await db.anafSettings.update({
        where: { id: settings.id },
        data: { lastSyncAt: new Date() }
      })
    }

    return { processed, skipped, errors, status: finalStatus, messagesFound: mesaje.length }
  } catch (error: any) {
    // În caz de eroare critică, actualizăm log-ul cu failed
    await db.spvSyncLog.update({
      where: { id: syncLog.id },
      data: {
        finishedAt: new Date(),
        status: 'failed',
        errorMessage: error.message || 'Eroare necunoscută'
      }
    })
    throw error
  }
}

import { google } from 'googleapis'
import { simpleParser } from 'mailparser'
const pdfParse = require('pdf-parse')
import * as dotenv from 'dotenv'
import * as path from 'path'

// Încărcăm variabilele de mediu din .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const CLIENT_ID = process.env.GMAIL_CLIENT_ID
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET
const REFRESH_TOKEN = process.env.GMAIL_REFRESH_TOKEN
const LABEL_ID = process.env.GMAIL_LABEL_ID

// În producție, endpoint-ul aplicației. Pentru script-ul local de cron, localhost e suficient
const INGEST_API_URL = process.env.NEXT_PUBLIC_APP_URL 
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/cron/ingest-emails`
  : 'http://localhost:3000/api/cron/ingest-emails'

if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN || !LABEL_ID) {
  console.error("❌ EROARE: Lipsesc variabilele de mediu GMAIL_*. Rulează setup-gmail-oauth.cjs mai întâi.")
  process.exit(1)
}

const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET)
oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN })

const gmail = google.gmail({ version: 'v1', auth: oAuth2Client })

async function fetchUnreadInvoices() {
  try {
    console.log("🔍 Caut emailuri necitite cu eticheta:", LABEL_ID)
    
    // Căutăm mesaje necitite din eticheta specificată, care au atașament
    const res = await gmail.users.messages.list({
      userId: 'me',
      q: `is:unread has:attachment`,
      labelIds: [LABEL_ID as string]
    })

    const messages = res.data.messages || []
    if (messages.length === 0) {
      console.log("✅ Nu există facturi noi de procesat.")
      return
    }

    console.log(`📥 S-au găsit ${messages.length} email(uri) noi. Procesăm...`)

    for (const msg of messages) {
      if (!msg.id) continue

      // Preluăm mesajul complet în format raw pentru a-l decoda cu mailparser
      const fullMsg = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id,
        format: 'raw'
      })

      // Decode Base64URL
      const rawData = fullMsg.data.raw
      if (!rawData) continue
      
      const emailBuffer = Buffer.from(rawData.replace(/-/g, '+').replace(/_/g, '/'), 'base64')
      
      // Parsăm emailul
      const parsed = await simpleParser(emailBuffer)
      
      // Găsim expeditorul (extragem doar adresa, nu și numele)
      const senderAddress = parsed.from?.value[0]?.address
      if (!senderAddress) {
        console.log(`⚠️ Expeditor lipsă pentru emailul ${msg.id}. Sărim.`)
        continue
      }
      
      // Căutăm PDF-urile atașate
      const pdfAttachments = parsed.attachments.filter(a => a.contentType === 'application/pdf' || a.filename?.toLowerCase().endsWith('.pdf'))
      
      if (pdfAttachments.length === 0) {
        console.log(`⚠️ Nu există atașament PDF în emailul de la ${senderAddress} (ID: ${msg.id}).`)
        continue
      }

      console.log(`📎 S-au găsit ${pdfAttachments.length} PDF-uri de la ${senderAddress}. Sortăm...`)

      let invoicePdf: any = null
      let receiptPdf: any = null

      for (const att of pdfAttachments) {
        if (!att.content) continue
        
        const filename = att.filename?.toLowerCase() || ''
        const isInvoiceByName = filename.includes('invoice') || filename.includes('factur')
        const isReceiptByName = filename.includes('receipt') || filename.includes('chitant') || filename.includes('payment')
        
        if (isInvoiceByName && !isReceiptByName) {
          invoicePdf = invoicePdf || att // păstrăm primul dacă sunt mai multe
          continue
        }
        if (isReceiptByName && !isInvoiceByName) {
          receiptPdf = receiptPdf || att
          continue
        }
        
        // Fallback: Parsăm textul primelor pagini dacă numele nu e concludent
        try {
          const data = await pdfParse(att.content, { max: 1 }) // parse prima pagină
          const text = data.text.toLowerCase()
          if (text.includes('invoice') || text.includes('factur')) {
            invoicePdf = invoicePdf || att
          } else if (text.includes('receipt') || text.includes('chitan') || text.includes('payment')) {
            receiptPdf = receiptPdf || att
          } else {
            // Nu putem determina precis. Dacă nu avem factură încă, presupunem că e factură.
            if (!invoicePdf) invoicePdf = att
            else if (!receiptPdf) receiptPdf = att
          }
        } catch(e) {
          console.error(`⚠️ Eroare la parsarea PDF-ului ${filename}:`, e)
          if (!invoicePdf) invoicePdf = att
        }
      }

      if (!invoicePdf && !receiptPdf) {
        console.log(`⚠️ Nu am putut identifica nici factură, nici chitanță.`)
        continue
      }

      // Pregătim payload-ul
      // Dacă avem doar chitanță, o trimitem pe post de pdfBase64 (pentru preview) cu flag isOnlyReceipt
      const payload = {
        messageId: parsed.messageId || msg.id,
        sender: senderAddress,
        pdfBase64: invoicePdf ? invoicePdf.content.toString('base64') : receiptPdf.content.toString('base64'),
        receiptPdfBase64: (invoicePdf && receiptPdf) ? receiptPdf.content.toString('base64') : undefined,
        isOnlyReceipt: !invoicePdf && !!receiptPdf,
        overrideText: parsed.text || "" // fallback LLM
      }

      try {
        const apiRes = await fetch(INGEST_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })

        const apiData = await apiRes.json()
        if (!apiRes.ok) {
          console.error(`❌ Eroare API Ingest de la ${senderAddress}:`, apiData)
        } else {
          console.log(`✅ ${payload.isOnlyReceipt ? 'Chitanță' : 'Factură'} de la ${senderAddress} ingerată! Supplier: ${apiData.supplierAssigned ? 'DA' : 'NU'}`)
        }
      } catch (fetchErr: any) {
        console.error(`❌ Eșec la apelul către Ingest API:`, fetchErr.message)
      }

      // La final, marcăm emailul ca CITIT ca să nu-l mai procesăm
      await gmail.users.messages.modify({
        userId: 'me',
        id: msg.id,
        requestBody: {
          removeLabelIds: ['UNREAD']
        }
      })
      console.log(`🏷️  Emailul ${msg.id} a fost marcat ca citit.`)
    }

    console.log("🎉 Procesare completă.")
  } catch (error: any) {
    console.error("❌ EROARE CRITICĂ la preluarea din Gmail:", error.message)
  }
}

fetchUnreadInvoices()

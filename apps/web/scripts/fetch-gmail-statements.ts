import { google } from 'googleapis'
import { simpleParser } from 'mailparser'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const pdfParse = require('pdf-parse')
import * as dotenv from 'dotenv'
import * as path from 'path'

// Încărcăm variabilele de mediu din .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const CLIENT_ID = process.env.GMAIL_CLIENT_ID
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET
const REFRESH_TOKEN = process.env.GMAIL_REFRESH_TOKEN
const LABEL_ID = process.env.GMAIL_STATEMENTS_LABEL_ID

// În producție, endpoint-ul aplicației. Pentru script-ul local de cron, localhost e suficient
const INGEST_API_URL = process.env.NEXT_PUBLIC_APP_URL 
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/cron/ingest-statements`
  : 'http://localhost:3100/api/cron/ingest-statements'

if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN || !LABEL_ID) {
  console.error("❌ EROARE: Lipsesc variabilele de mediu GMAIL_*. Rulează setup-gmail-oauth.cjs mai întâi.")
  process.exit(1)
}

const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET)
oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN })

const gmail = google.gmail({ version: 'v1', auth: oAuth2Client })

async function fetchUnreadStatements() {
  try {
    console.log("🔍 Caut extrase necitite cu eticheta:", LABEL_ID)
    
    const res = await gmail.users.messages.list({
      userId: 'me',
      q: `has:attachment`,
      labelIds: [LABEL_ID as string],
      maxResults: 50 // process up to 50 at a time
    })

    const messages = res.data.messages || []
    if (messages.length === 0) {
      console.log("✅ Nu există extrase noi de procesat.")
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

      console.log(`📎 S-au găsit ${pdfAttachments.length} PDF-uri de la ${senderAddress}.`)

      // Preluăm primul PDF
      const statementPdf = pdfAttachments[0]
      if (!statementPdf || !statementPdf.content) {
        console.log(`⚠️ Eroare la conținutul PDF-ului.`)
        continue
      }

      // Pregătim payload-ul
      const payload = {
        messageId: parsed.messageId || msg.id,
        sender: senderAddress,
        pdfBase64: statementPdf.content.toString('base64')
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
          console.log(`✅ Extras de la ${senderAddress} ingerat! Status:`, apiData.status)
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

fetchUnreadStatements()

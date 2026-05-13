// ─── AWS SES Email Service ───
// Sends transactional emails via Amazon SES with per-business-line configuration

import { SESClient, SendEmailCommand, SendRawEmailCommand } from '@aws-sdk/client-ses'

// Lazy SES client — initialized on first use to ensure env vars are loaded
let _ses: SESClient | null = null
function getSESClient(): SESClient {
  if (!_ses) {
    _ses = new SESClient({
      region: process.env.AWS_REGION || 'eu-central-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    })
  }
  return _ses
}

// ─── Per-business-line sender config ───
const SENDER_CONFIG: Record<string, { email: string; name: string; replyTo: string }> = {
  agency: {
    email: process.env.SES_SENDER_AGENCY || 'agency@asns.ro',
    name: 'ASNS Digital Agency',
    replyTo: process.env.SES_REPLY_AGENCY || 'office@asns.ro',
  },
  fudly: {
    email: process.env.SES_SENDER_FUDLY || 'restaurante@fudly.ro',
    name: 'Fudly',
    replyTo: process.env.SES_REPLY_FUDLY || 'restaurante@fudly.ro',
  },
  climaticpro: {
    email: process.env.SES_SENDER_CLIMATICPRO || 'climaticpro@asns.ro',
    name: 'ClimaticPRO',
    replyTo: process.env.SES_REPLY_CLIMATICPRO || 'office@climaticpro.ro',
  },
}

const DEFAULT_SENDER = {
  email: process.env.SES_SENDER_DEFAULT || 'oferte@asns.ro',
  name: 'ASNS',
  replyTo: process.env.SES_REPLY_DEFAULT || 'office@asns.ro',
}

function getSender(businessLine?: string) {
  if (businessLine && SENDER_CONFIG[businessLine]) {
    return SENDER_CONFIG[businessLine]
  }
  return DEFAULT_SENDER
}

// ─── Send Offer Email ───

interface SendOfferEmailInput {
  to: string
  subject: string
  offerNumber: string
  templateName: string
  clientName: string
  totalValue: number
  currency: string
  publicUrl: string
  message?: string
  businessLine?: string
}

export async function sendOfferEmail(input: SendOfferEmailInput) {
  const sender = getSender(input.businessLine)
  const fromAddress = `${sender.name} <${sender.email}>`

  const htmlBody = buildOfferEmailHtml(input, sender)
  const textBody = buildOfferEmailText(input)

  const command = new SendEmailCommand({
    Source: fromAddress,
    ReplyToAddresses: [sender.replyTo],
    Destination: {
      ToAddresses: [input.to],
    },
    Message: {
      Subject: {
        Data: input.subject,
        Charset: 'UTF-8',
      },
      Body: {
        Html: {
          Data: htmlBody,
          Charset: 'UTF-8',
        },
        Text: {
          Data: textBody,
          Charset: 'UTF-8',
        },
      },
    },
  })

  const result = await getSESClient().send(command)
  return {
    messageId: result.MessageId,
    success: true,
  }
}

// ─── Email Templates ───

function buildOfferEmailHtml(
  input: SendOfferEmailInput,
  sender: { name: string; email: string }
): string {
  const formattedValue = new Intl.NumberFormat('ro-RO', {
    style: 'currency',
    currency: input.currency || 'EUR',
    minimumFractionDigits: 0,
  }).format(input.totalValue)

  // Per-BL theming
  const isFudly = input.businessLine === 'fudly'
  const headerBg = isFudly
    ? 'background: linear-gradient(135deg, #dc2626 0%, #ea580c 50%, #f97316 100%);'
    : 'background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%);'
  const accentColor = isFudly ? '#ea580c' : '#4338ca'
  const ctaBg = isFudly
    ? 'background: linear-gradient(135deg, #dc2626, #ea580c);'
    : 'background: linear-gradient(135deg, #4338ca, #6366f1);'
  const subtitle = isFudly ? 'Propunere de Colaborare' : 'Propunere Comercială'

  const personalMessage = input.message
    ? `<tr>
        <td style="padding: 20px 30px; background-color: #f8f9fa; border-left: 4px solid ${accentColor}; border-radius: 4px; margin: 20px 0;">
          <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.6; font-style: italic;">${escapeHtml(input.message)}</p>
        </td>
      </tr>
      <tr><td style="height: 20px;"></td></tr>`
    : ''

  return `<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(input.subject)}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" cellspacing="0" cellpadding="0" style="width: 100%; background-color: #f3f4f6;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.07);">
          
          <!-- Header -->
          <tr>
            <td style="${headerBg} padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 600; letter-spacing: -0.3px;">${escapeHtml(sender.name)}</h1>
              <p style="margin: 8px 0 0; color: rgba(255,255,255,0.7); font-size: 13px;">${subtitle}</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 30px;">
              <h2 style="margin: 0 0 8px; color: #111827; font-size: 18px; font-weight: 600;">
                Bună ziua${input.clientName ? ', ' + escapeHtml(input.clientName) : ''}!
              </h2>
              <p style="margin: 0 0 24px; color: #6b7280; font-size: 14px; line-height: 1.6;">
                ${isFudly ? 'Vă transmitem propunerea noastră de colaborare. Accesați link-ul de mai jos pentru a vedea detaliile complete.' : 'Vă transmitem propunerea noastră comercială. Puteți vizualiza detaliile complete și puteți răspunde direct accesând link-ul de mai jos.'}
              </p>
            </td>
          </tr>

          ${personalMessage}

          <!-- Offer Card -->
          <tr>
            <td style="padding: 0 30px;">
              <table role="presentation" cellspacing="0" cellpadding="0" style="width: 100%; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                <tr>
                  <td style="padding: 20px; background-color: #fafafa;">
                    <table role="presentation" cellspacing="0" cellpadding="0" style="width: 100%;">
                      <tr>
                        <td>
                          <p style="margin: 0; color: #9ca3af; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">Referință</p>
                          <p style="margin: 4px 0 0; color: #111827; font-size: 16px; font-weight: 600;">${escapeHtml(input.offerNumber)}</p>
                        </td>
                        <td style="text-align: right;">
                          <p style="margin: 0; color: #9ca3af; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">Valoare</p>
                          <p style="margin: 4px 0 0; color: ${accentColor}; font-size: 16px; font-weight: 700;">${formattedValue}</p>
                        </td>
                      </tr>
                      <tr>
                        <td colspan="2" style="padding-top: 12px;">
                          <p style="margin: 0; color: #9ca3af; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">Servicii</p>
                          <p style="margin: 4px 0 0; color: #374151; font-size: 14px;">${escapeHtml(input.templateName)}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td style="padding: 30px; text-align: center;">
              <a href="${escapeHtml(input.publicUrl)}" 
                 style="display: inline-block; padding: 14px 36px; ${ctaBg} color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600; border-radius: 8px; letter-spacing: 0.3px;">
                Vizualizează Propunerea
              </a>
              <p style="margin: 16px 0 0; color: #9ca3af; font-size: 12px;">
                Sau copiați link-ul: <a href="${escapeHtml(input.publicUrl)}" style="color: ${accentColor};">${escapeHtml(input.publicUrl)}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 30px; background-color: #f9fafb; border-top: 1px solid #f3f4f6; text-align: center;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                ${escapeHtml(sender.name)} · ${escapeHtml(sender.email)}
              </p>
              <p style="margin: 4px 0 0; color: #d1d5db; font-size: 11px;">
                Dacă aveți întrebări, răspundeți direct la acest email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function buildOfferEmailText(input: SendOfferEmailInput): string {
  const lines = [
    `Bună ziua${input.clientName ? ', ' + input.clientName : ''}!`,
    '',
    'Vă transmitem oferta noastră comercială.',
    '',
    `Oferta: ${input.offerNumber}`,
    `Servicii: ${input.templateName}`,
    `Valoare: ${input.totalValue} ${input.currency || 'EUR'}`,
    '',
  ]

  if (input.message) {
    lines.push('Mesaj:', input.message, '')
  }

  lines.push(
    'Vizualizați oferta accesând link-ul:',
    input.publicUrl,
    '',
    '---',
    'Acest email a fost trimis automat.'
  )

  return lines.join('\n')
}

// ─── Send Report Email ───

interface SendReportEmailInput {
  to: string
  subject: string
  reportTitle: string
  clientName: string
  reportUrl: string
  dateRange: string
  highlights: string[]
  message?: string
  businessLine?: string
}

export async function sendReportEmail(input: SendReportEmailInput) {
  const sender = getSender(input.businessLine)
  const fromAddress = `${sender.name} <${sender.email}>`

  const isFudly = input.businessLine === 'fudly'
  const headerBg = isFudly
    ? 'background: linear-gradient(135deg, #dc2626 0%, #ea580c 50%, #f97316 100%);'
    : 'background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%);'
  const accentColor = isFudly ? '#ea580c' : '#4338ca'
  const ctaBg = isFudly
    ? 'background: linear-gradient(135deg, #dc2626, #ea580c);'
    : 'background: linear-gradient(135deg, #4338ca, #6366f1);'

  const personalMessage = input.message
    ? `<tr>
        <td style="padding: 20px 30px; background-color: #f8f9fa; border-left: 4px solid ${accentColor}; border-radius: 4px; margin: 20px 0;">
          <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.6; font-style: italic;">${escapeHtml(input.message)}</p>
        </td>
      </tr>
      <tr><td style="height: 20px;"></td></tr>`
    : ''

  const highlightCards = input.highlights.map(h =>
    `<td style="padding: 12px 16px; background: #f0f0ff; border-radius: 8px; border: 1px solid #e0e0ff; text-align: center;">
      <p style="margin: 0; color: ${accentColor}; font-size: 13px; font-weight: 600;">${escapeHtml(h)}</p>
    </td>`
  ).join('<td style="width: 12px;"></td>')

  const htmlBody = `<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(input.subject)}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" cellspacing="0" cellpadding="0" style="width: 100%; background-color: #f3f4f6;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.07);">
          
          <!-- Header -->
          <tr>
            <td style="${headerBg} padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 600; letter-spacing: -0.3px;">${escapeHtml(sender.name)}</h1>
              <p style="margin: 8px 0 0; color: rgba(255,255,255,0.7); font-size: 13px;">Raport de Performanță</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 30px;">
              <h2 style="margin: 0 0 8px; color: #111827; font-size: 18px; font-weight: 600;">
                Bună ziua, ${escapeHtml(input.clientName)}!
              </h2>
              <p style="margin: 0 0 24px; color: #6b7280; font-size: 14px; line-height: 1.6;">
                Vă transmitem raportul de performanță <strong>${escapeHtml(input.reportTitle)}</strong> pentru perioada <strong>${escapeHtml(input.dateRange)}</strong>. Accesați link-ul de mai jos pentru detalii complete.
              </p>
            </td>
          </tr>

          ${personalMessage}

          <!-- Highlights -->
          ${input.highlights.length > 0 ? `
          <tr>
            <td style="padding: 0 30px 20px;">
              <table role="presentation" cellspacing="0" cellpadding="0" style="width: 100%;">
                <tr>${highlightCards}</tr>
              </table>
            </td>
          </tr>` : ''}

          <!-- CTA Button -->
          <tr>
            <td style="padding: 10px 30px 30px; text-align: center;">
              <a href="${escapeHtml(input.reportUrl)}" 
                 style="display: inline-block; padding: 14px 36px; ${ctaBg} color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600; border-radius: 8px; letter-spacing: 0.3px;">
                📊 Vizualizează Raportul
              </a>
              <p style="margin: 16px 0 0; color: #9ca3af; font-size: 12px;">
                Sau copiați link-ul: <a href="${escapeHtml(input.reportUrl)}" style="color: ${accentColor};">${escapeHtml(input.reportUrl)}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 30px; background-color: #f9fafb; border-top: 1px solid #f3f4f6; text-align: center;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                ${escapeHtml(sender.name)} · ${escapeHtml(sender.email)}
              </p>
              <p style="margin: 4px 0 0; color: #d1d5db; font-size: 11px;">
                Dacă aveți întrebări, răspundeți direct la acest email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  const textBody = [
    `Bună ziua, ${input.clientName}!`,
    '',
    `Raport: ${input.reportTitle}`,
    `Perioada: ${input.dateRange}`,
    '',
    ...input.highlights.map(h => `• ${h}`),
    '',
    input.message ? `Mesaj: ${input.message}\n` : '',
    'Vizualizați raportul complet:',
    input.reportUrl,
    '',
    '---',
    `${sender.name}`,
  ].join('\n')

  const command = new SendEmailCommand({
    Source: fromAddress,
    ReplyToAddresses: [sender.replyTo],
    Destination: { ToAddresses: [input.to] },
    Message: {
      Subject: { Data: input.subject, Charset: 'UTF-8' },
      Body: {
        Html: { Data: htmlBody, Charset: 'UTF-8' },
        Text: { Data: textBody, Charset: 'UTF-8' },
      },
    },
  })

  const result = await getSESClient().send(command)
  return { messageId: result.MessageId, success: true }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

// ─── Send Report Email WITH Attachments (Raw MIME) ───

export interface EmailAttachment {
  filename: string
  content: Buffer | string // Base64 string or Buffer
  contentType: string
}

interface SendReportEmailWithAttachmentsInput {
  to: string
  cc?: string[]
  subject: string
  reportTitle: string
  clientName: string
  reportUrl: string
  dateRange: string
  highlights: string[]
  message?: string
  businessLine?: string
  attachments?: EmailAttachment[]
}

export async function sendReportEmailWithAttachments(input: SendReportEmailWithAttachmentsInput) {
  const sender = getSender(input.businessLine)
  const fromAddress = `${sender.name} <${sender.email}>`
  const hasAttachments = input.attachments && input.attachments.length > 0

  // If no attachments and no CC, use simple SendEmailCommand (faster)
  if (!hasAttachments && (!input.cc || input.cc.length === 0)) {
    return sendReportEmail({
      to: input.to,
      subject: input.subject,
      reportTitle: input.reportTitle,
      clientName: input.clientName,
      reportUrl: input.reportUrl,
      dateRange: input.dateRange,
      highlights: input.highlights,
      message: input.message,
      businessLine: input.businessLine,
    })
  }

  // Build the HTML body (reuse the existing template structure)
  const isFudly = input.businessLine === 'fudly'
  const headerBg = isFudly
    ? 'background: linear-gradient(135deg, #dc2626 0%, #ea580c 50%, #f97316 100%);'
    : 'background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%);'
  const accentColor = isFudly ? '#ea580c' : '#4338ca'
  const ctaBg = isFudly
    ? 'background: linear-gradient(135deg, #dc2626, #ea580c);'
    : 'background: linear-gradient(135deg, #4338ca, #6366f1);'

  const personalMessage = input.message
    ? `<tr>
        <td style="padding: 20px 30px; background-color: #f8f9fa; border-left: 4px solid ${accentColor}; border-radius: 4px; margin: 20px 0;">
          <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.6; font-style: italic;">${escapeHtml(input.message)}</p>
        </td>
      </tr>
      <tr><td style="height: 20px;"></td></tr>`
    : ''

  const highlightCards = input.highlights.map(h =>
    `<td style="padding: 12px 16px; background: #f0f0ff; border-radius: 8px; border: 1px solid #e0e0ff; text-align: center;">
      <p style="margin: 0; color: ${accentColor}; font-size: 13px; font-weight: 600;">${escapeHtml(h)}</p>
    </td>`
  ).join('<td style="width: 12px;"></td>')

  const attachmentNote = hasAttachments
    ? `<tr>
        <td style="padding: 0 30px 20px;">
          <div style="background-color: #fefce8; border: 1px solid #fde68a; border-radius: 8px; padding: 12px 16px;">
            <p style="margin: 0; color: #92400e; font-size: 13px; font-weight: 600;">📎 Documente atașate:</p>
            <p style="margin: 4px 0 0; color: #a16207; font-size: 12px;">${input.attachments!.map(a => escapeHtml(a.filename)).join(', ')}</p>
          </div>
        </td>
      </tr>`
    : ''

  const htmlBody = `<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(input.subject)}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" cellspacing="0" cellpadding="0" style="width: 100%; background-color: #f3f4f6;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.07);">
          
          <!-- Header -->
          <tr>
            <td style="${headerBg} padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 600; letter-spacing: -0.3px;">${escapeHtml(sender.name)}</h1>
              <p style="margin: 8px 0 0; color: rgba(255,255,255,0.7); font-size: 13px;">Raport de Performanță</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 30px;">
              <h2 style="margin: 0 0 8px; color: #111827; font-size: 18px; font-weight: 600;">
                Bună ziua, ${escapeHtml(input.clientName)}!
              </h2>
              <p style="margin: 0 0 24px; color: #6b7280; font-size: 14px; line-height: 1.6;">
                Vă transmitem raportul de performanță <strong>${escapeHtml(input.reportTitle)}</strong> pentru perioada <strong>${escapeHtml(input.dateRange)}</strong>. Accesați link-ul de mai jos pentru detalii complete.
              </p>
            </td>
          </tr>

          ${personalMessage}

          <!-- Highlights -->
          ${input.highlights.length > 0 ? `
          <tr>
            <td style="padding: 0 30px 20px;">
              <table role="presentation" cellspacing="0" cellpadding="0" style="width: 100%;">
                <tr>${highlightCards}</tr>
              </table>
            </td>
          </tr>` : ''}

          ${attachmentNote}

          <!-- CTA Button -->
          <tr>
            <td style="padding: 10px 30px 30px; text-align: center;">
              <a href="${escapeHtml(input.reportUrl)}" 
                 style="display: inline-block; padding: 14px 36px; ${ctaBg} color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600; border-radius: 8px; letter-spacing: 0.3px;">
                📊 Vizualizează Raportul
              </a>
              <p style="margin: 16px 0 0; color: #9ca3af; font-size: 12px;">
                Sau copiați link-ul: <a href="${escapeHtml(input.reportUrl)}" style="color: ${accentColor};">${escapeHtml(input.reportUrl)}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 30px; background-color: #f9fafb; border-top: 1px solid #f3f4f6; text-align: center;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                ${escapeHtml(sender.name)} · ${escapeHtml(sender.email)}
              </p>
              <p style="margin: 4px 0 0; color: #d1d5db; font-size: 11px;">
                Dacă aveți întrebări, răspundeți direct la acest email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  const textBody = [
    `Bună ziua, ${input.clientName}!`,
    '',
    `Raport: ${input.reportTitle}`,
    `Perioada: ${input.dateRange}`,
    '',
    ...input.highlights.map(h => `• ${h}`),
    '',
    input.message ? `Mesaj: ${input.message}\n` : '',
    'Vizualizați raportul complet:',
    input.reportUrl,
    '',
    hasAttachments ? `📎 Documente atașate: ${input.attachments!.map(a => a.filename).join(', ')}\n` : '',
    '---',
    `${sender.name}`,
  ].join('\n')

  // ── Build raw MIME message ──
  const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).slice(2)}`
  const altBoundary = `----=_Alt_${Date.now()}_${Math.random().toString(36).slice(2)}`

  const toHeader = input.to
  const ccHeader = input.cc && input.cc.length > 0 ? `Cc: ${input.cc.join(', ')}\r\n` : ''

  let rawEmail = [
    `From: ${fromAddress}`,
    `To: ${toHeader}`,
    input.cc && input.cc.length > 0 ? `Cc: ${input.cc.join(', ')}` : null,
    `Reply-To: ${sender.replyTo}`,
    `Subject: =?UTF-8?B?${Buffer.from(input.subject).toString('base64')}?=`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
    '',
    `--${altBoundary}`,
    `Content-Type: text/plain; charset=UTF-8`,
    `Content-Transfer-Encoding: base64`,
    '',
    Buffer.from(textBody, 'utf-8').toString('base64'),
    '',
    `--${altBoundary}`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: base64`,
    '',
    Buffer.from(htmlBody, 'utf-8').toString('base64'),
    '',
    `--${altBoundary}--`,
  ].filter(line => line !== null).join('\r\n')

  // Add attachments
  if (hasAttachments) {
    for (const att of input.attachments!) {
      const b64Content = typeof att.content === 'string'
        ? att.content
        : att.content.toString('base64')

      rawEmail += [
        '',
        `--${boundary}`,
        `Content-Type: ${att.contentType}; name="${att.filename}"`,
        `Content-Disposition: attachment; filename="${att.filename}"`,
        `Content-Transfer-Encoding: base64`,
        '',
        b64Content,
      ].join('\r\n')
    }
  }

  rawEmail += `\r\n--${boundary}--\r\n`

  const allRecipients = [input.to, ...(input.cc || [])]

  const command = new SendRawEmailCommand({
    Source: fromAddress,
    Destinations: allRecipients,
    RawMessage: {
      Data: Buffer.from(rawEmail, 'utf-8'),
    },
  })

  const result = await getSESClient().send(command)
  return { messageId: result.MessageId, success: true }
}

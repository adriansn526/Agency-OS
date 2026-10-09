// ─── SMTP Email Service ───
// Sends transactional emails via SMTP (mail@outcave.ro)
import nodemailer from 'nodemailer'
import fs from 'fs'
import path from 'path'
import { renderReportEmail, type ReportEmailContent } from '@/lib/reports/report-email'

// Lazy Nodemailer transporter
let _transporter: nodemailer.Transporter | null = null

function getTransporter() {
  if (!_transporter) {
    _transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'mail.outcave.ro',
      port: Number(process.env.SMTP_PORT) || 465,
      secure: Number(process.env.SMTP_PORT) === 465, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER || 'mail@outcave.ro',
        pass: process.env.SMTP_PASS || '',
      },
      tls: {
        rejectUnauthorized: false
      }
    })
  }
  return _transporter
}

// ─── Per-business-line sender config ───
const SENDER_CONFIG: Record<string, { email: string; name: string; replyTo: string }> = {
  agency: {
    email: process.env.SMTP_USER || 'mail@outcave.ro',
    name: 'ASNS Digital Agency',
    replyTo: process.env.SES_REPLY_AGENCY || 'office@asns.ro',
  },
  fudly: {
    email: process.env.SMTP_USER || 'mail@outcave.ro',
    name: 'Fudly',
    replyTo: process.env.SES_REPLY_FUDLY || 'restaurante@fudly.ro',
  },
  climaticpro: {
    email: process.env.SMTP_USER || 'mail@outcave.ro',
    name: 'ClimaticPRO',
    replyTo: process.env.SES_REPLY_CLIMATICPRO || 'office@climaticpro.ro',
  },
}

const DEFAULT_SENDER = {
  email: process.env.SMTP_USER || 'mail@outcave.ro',
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

  const result = await getTransporter().sendMail({
    from: fromAddress,
    replyTo: sender.replyTo,
    to: input.to,
    subject: input.subject,
    html: htmlBody,
    text: textBody,
  })
  return {
    messageId: result.messageId,
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

export interface EmailAttachment {
  filename: string
  content: Buffer | string // Base64 string or Buffer
  contentType: string
}

interface SendReportEmailInput {
  to: string
  cc?: string[]
  subject: string
  reportTitle: string
  clientName: string
  reportUrl: string
  /** Human-readable period, e.g. "1 septembrie 2026 - 30 septembrie 2026" */
  dateRange: string
  /** Review text (Markdown). Only achievement sections are shown to the client. */
  message?: string
  /** KPI tables + top keywords, see lib/reports/report-email.ts */
  content?: ReportEmailContent
  businessLine?: string
  attachments?: EmailAttachment[]
}

export async function sendReportEmailWithAttachments(input: SendReportEmailInput) {
  const sender = getSender(input.businessLine)
  const attachments = input.attachments || []

  // Inline logo for the signature (skipped silently if the file is missing)
  const logoPath = path.join(process.cwd(), 'public', 'email', 'asns-icon.png')
  const hasLogo = fs.existsSync(logoPath)

  const { html, text } = renderReportEmail({
    subject: input.subject,
    senderName: sender.name,
    senderEmail: sender.email,
    clientName: input.clientName,
    reportTitle: input.reportTitle,
    reportUrl: input.reportUrl,
    periodLabel: input.dateRange,
    review: input.message,
    content: input.content,
    businessLine: input.businessLine,
    attachmentNames: attachments.map(a => a.filename),
    logoCid: hasLogo ? 'asns-logo' : undefined,
  })

  const result = await getTransporter().sendMail({
    from: `${sender.name} <${sender.email}>`,
    replyTo: sender.replyTo,
    to: input.to,
    cc: input.cc && input.cc.length > 0 ? input.cc : undefined,
    subject: input.subject,
    html,
    text,
    attachments: [
      ...attachments.map(att => ({
        filename: att.filename,
        content: att.content,
        contentType: att.contentType,
      })),
      ...(hasLogo ? [{ filename: 'asns.png', path: logoPath, cid: 'asns-logo', contentDisposition: 'inline' as const }] : []),
    ],
  })

  return { messageId: result.messageId, success: true }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

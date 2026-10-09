/**
 * Client-facing report email: content builder + HTML/text renderer.
 *
 * The numbers come from the same aggregator the admin dashboard uses, which in
 * turn shares its conversion rules with the public report page, so the email,
 * the admin view and the public view always agree.
 *
 * Email rules: no emojis, only achievements (no "not done / to do" content).
 */

import { marked } from 'marked'
import { aggregateDomainReport } from '@/lib/reports/aggregator'

// ─── Types ───

export interface EmailKpiRow {
  label: string
  value: string
}

export interface EmailKpiSection {
  title: string
  rows: EmailKpiRow[]
}

export interface EmailKeywordRow {
  query: string
  clicks: number
  position: number
}

export interface ReportEmailContent {
  sections: EmailKpiSection[]
  topKeywords: EmailKeywordRow[]
  /** Short factual summary, used when there is no AI/user review text */
  fallbackReview: string
}

// ─── Helpers ───

const EMOJI_RE = /[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu

export function stripEmoji(text: string): string {
  return text
    .replace(EMOJI_RE, '')
    .replace(/[ \t]+([.,;:!?])/g, '$1')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/^[ \t]+$/gm, '')
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

const nf = (n: number, digits = 0) =>
  n.toLocaleString('ro-RO', { minimumFractionDigits: digits, maximumFractionDigits: digits })

export function formatPeriod(from: string, to: string): string {
  const fmt = new Intl.DateTimeFormat('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })
  return `${fmt.format(new Date(from))} - ${fmt.format(new Date(to))}`
}

/**
 * Keeps only the achievement-oriented parts of an AI/user review.
 * Drops "next steps" / recommendations and the per-channel sections that the
 * KPI table already covers. Text without recognised headings is kept as is.
 */
export function extractClientReview(markdown: string): string {
  const cleaned = stripEmoji(markdown || '').trim()
  if (!cleaned) return ''
  if (!/^#{2,4}\s/m.test(cleaned)) return cleaned

  const parts = cleaned.split(/^(?=#{2,4}\s)/m)
  const keep: string[] = []
  for (const part of parts) {
    const heading = part.match(/^#{2,4}\s+(.+)/)?.[1] ?? ''
    if (!heading) {
      if (part.trim()) keep.push(part.trim())
      continue
    }
    if (/rezumat|observa[tț]ie|proiecte|webdev/i.test(heading)) keep.push(part.trim())
  }
  return keep.join('\n\n')
}

// ─── Content builder ───

interface BuildContentInput {
  clientId: string
  domain: string
  from: string
  to: string
  showCostData?: boolean
}

export async function buildReportEmailContent(input: BuildContentInput): Promise<ReportEmailContent> {
  const { clientId, domain, from, to, showCostData } = input
  const empty: ReportEmailContent = { sections: [], topKeywords: [], fallbackReview: '' }

  let data
  try {
    data = await aggregateDomainReport(clientId, domain, from, to)
  } catch (err) {
    console.warn('[ReportEmail] Failed to aggregate data:', err)
    return empty
  }

  const sections: EmailKpiSection[] = []
  const conv = data.summary.conversionBreakdown

  // Results
  if (conv.totalConversions > 0) {
    const rows: EmailKpiRow[] = []
    if (conv.formSubmissions > 0) rows.push({ label: 'Cereri prin formular', value: nf(conv.formSubmissions) })
    if (conv.phoneCalls > 0) rows.push({ label: 'Apeluri telefonice', value: nf(conv.phoneCalls) })
    if (conv.whatsappContacts > 0) rows.push({ label: 'Contacte WhatsApp', value: nf(conv.whatsappContacts) })
    if (conv.otherConversions > 0) rows.push({ label: 'Alte conversii', value: nf(conv.otherConversions) })
    rows.push({ label: 'Total conversii', value: nf(conv.totalConversions) })
    sections.push({ title: 'Rezultate', rows })
  }

  // Organic search
  const seo = data.seo?.kpis
  if (seo && (seo.clicks > 0 || seo.impressions > 0)) {
    sections.push({
      title: 'Trafic organic (Google)',
      rows: [
        { label: 'Click-uri', value: nf(seo.clicks) },
        { label: 'Afișări', value: nf(seo.impressions) },
        { label: 'CTR', value: `${nf(seo.ctr * 100, 2)}%` },
        { label: 'Poziție medie', value: nf(seo.position, 1) },
      ],
    })
  }

  // Google Ads (only when it actually ran in the period)
  const ads = data.googleAds?.kpis
  if (ads && (ads.clicks > 0 || ads.spend > 0)) {
    const rows: EmailKpiRow[] = [
      { label: 'Click-uri', value: nf(ads.clicks) },
      { label: 'Afișări', value: nf(ads.impressions) },
      { label: 'CTR', value: `${nf(ads.ctr, 2)}%` },
    ]
    if (ads.conversions > 0) rows.push({ label: 'Conversii', value: nf(ads.conversions, ads.conversions % 1 ? 1 : 0) })
    if (showCostData) {
      rows.push({ label: 'Cost total', value: `${nf(ads.spend, 2)} lei` })
      if (ads.cpc > 0) rows.push({ label: 'Cost per click', value: `${nf(ads.cpc, 2)} lei` })
    }
    sections.push({ title: 'Google Ads', rows })
  }

  // Site
  const siteRows: EmailKpiRow[] = []
  const sessions = data.analytics?.traffic?.sessions ?? data.summary.totalSessions
  if (sessions > 0) siteRows.push({ label: 'Sesiuni', value: nf(sessions) })
  if (data.uptime && data.uptime.totalChecks > 0) {
    siteRows.push({ label: 'Disponibilitate site', value: `${nf(data.uptime.percent, 2)}%` })
  }
  if (siteRows.length > 0) sections.push({ title: 'Site', rows: siteRows })

  const topKeywords = (data.seo?.topQueries || []).slice(0, 5).map(q => ({
    query: q.query,
    clicks: q.clicks,
    position: q.position,
  }))

  // Deterministic, achievement-only summary
  const facts: string[] = []
  if (conv.totalConversions > 0) {
    const detail: string[] = []
    if (conv.formSubmissions > 0) detail.push(`${nf(conv.formSubmissions)} cereri prin formular`)
    if (conv.phoneCalls > 0) detail.push(`${nf(conv.phoneCalls)} apeluri telefonice`)
    if (conv.whatsappContacts > 0) detail.push(`${nf(conv.whatsappContacts)} contacte WhatsApp`)
    facts.push(`site-ul a generat ${nf(conv.totalConversions)} conversii${detail.length ? ` (${detail.join(', ')})` : ''}`)
  }
  if (seo && seo.clicks > 0) {
    facts.push(`căutările Google au adus ${nf(seo.clicks)} vizite organice la o poziție medie de ${nf(seo.position, 1)}`)
  }
  if (ads && ads.clicks > 0) facts.push(`campaniile Google Ads au generat ${nf(ads.clicks)} click-uri`)
  const fallbackReview = facts.length
    ? `În perioada analizată, ${facts.join('; ')}.`
    : ''

  return { sections, topKeywords, fallbackReview }
}

// ─── Renderer ───

export interface RenderReportEmailInput {
  subject: string
  senderName: string
  senderEmail: string
  clientName: string
  reportTitle: string
  reportUrl: string
  periodLabel: string
  /** Review text in Markdown; will be filtered and emoji-stripped */
  review?: string
  content?: ReportEmailContent
  businessLine?: string
  attachmentNames?: string[]
}

function renderReview(markdown: string, accent: string): string {
  let html = marked.parse(markdown, { async: false }) as string

  // Strategic observation becomes a highlighted callout
  html = html.replace(
    /<h[2-4][^>]*>\s*Observa[tț]ie Strategic[ăa]\s*<\/h[2-4]>\s*<p>([\s\S]*?)<\/p>/i,
    (_m, body) =>
      `<div style="background-color:#f8fafc;border-left:3px solid ${accent};padding:14px 16px;margin:20px 0;">` +
      `<p style="margin:0 0 4px;color:#111827;font-size:13px;font-weight:700;">Observație strategică</p>` +
      `<p style="margin:0;color:#374151;font-size:14px;line-height:1.6;">${body}</p></div>`
  )

  return html
    .replace(/<h[2-4]>/g, '<h3 style="margin:22px 0 8px;color:#111827;font-size:15px;font-weight:700;">')
    .replace(/<\/h[2-4]>/g, '</h3>')
    .replace(/<ul>/g, '<ul style="margin:0 0 16px;padding-left:20px;color:#374151;">')
    .replace(/<li>/g, '<li style="margin-bottom:6px;font-size:14px;line-height:1.6;">')
    .replace(/<p>/g, '<p style="margin:0 0 14px;font-size:14px;color:#374151;line-height:1.7;">')
    .replace(/<strong>/g, '<strong style="color:#111827;">')
}

export function renderReportEmail(input: RenderReportEmailInput): { html: string; text: string } {
  const isFudly = input.businessLine === 'fudly'
  const accent = isFudly ? '#c2410c' : '#312e81'
  const border = '#e5e7eb'

  const reviewMd = extractClientReview(input.review || '') || input.content?.fallbackReview || ''
  const reviewHtml = reviewMd
    ? `<tr><td style="padding:0 40px 8px;">${renderReview(reviewMd, accent)}</td></tr>`
    : ''

  const sectionsHtml = (input.content?.sections || []).map(section => `
    <tr>
      <td style="padding:0 40px 24px;">
        <table role="presentation" cellspacing="0" cellpadding="0" width="100%" style="border:1px solid ${border};border-collapse:separate;border-radius:6px;overflow:hidden;">
          <tr>
            <td colspan="2" style="padding:10px 16px;background-color:#f8fafc;border-bottom:1px solid ${border};color:${accent};font-size:12px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;">${escapeHtml(section.title)}</td>
          </tr>
          ${section.rows.map((row, i) => {
            const last = i === section.rows.length - 1
            const isTotal = /^total/i.test(row.label)
            return `<tr>
            <td style="padding:10px 16px;${last ? '' : `border-bottom:1px solid #f3f4f6;`}color:#4b5563;font-size:14px;${isTotal ? 'font-weight:700;color:#111827;' : ''}">${escapeHtml(row.label)}</td>
            <td align="right" style="padding:10px 16px;${last ? '' : `border-bottom:1px solid #f3f4f6;`}color:#111827;font-size:14px;font-weight:${isTotal ? 800 : 600};">${escapeHtml(row.value)}</td>
          </tr>`
          }).join('')}
        </table>
      </td>
    </tr>`).join('')

  const keywords = input.content?.topKeywords || []
  const keywordsHtml = keywords.length ? `
    <tr>
      <td style="padding:0 40px 24px;">
        <table role="presentation" cellspacing="0" cellpadding="0" width="100%" style="border:1px solid ${border};border-collapse:separate;border-radius:6px;overflow:hidden;">
          <tr>
            <td style="padding:10px 16px;background-color:#f8fafc;border-bottom:1px solid ${border};color:${accent};font-size:12px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;">Cuvinte cheie principale</td>
            <td align="right" style="padding:10px 16px;background-color:#f8fafc;border-bottom:1px solid ${border};color:#6b7280;font-size:12px;">Click-uri</td>
            <td align="right" style="padding:10px 16px;background-color:#f8fafc;border-bottom:1px solid ${border};color:#6b7280;font-size:12px;">Poziție</td>
          </tr>
          ${keywords.map((k, i) => {
            const b = i === keywords.length - 1 ? '' : 'border-bottom:1px solid #f3f4f6;'
            return `<tr>
            <td style="padding:10px 16px;${b}color:#374151;font-size:14px;">${escapeHtml(k.query)}</td>
            <td align="right" style="padding:10px 16px;${b}color:#111827;font-size:14px;font-weight:600;">${nf(k.clicks)}</td>
            <td align="right" style="padding:10px 16px;${b}color:#111827;font-size:14px;font-weight:600;">${nf(k.position, 1)}</td>
          </tr>`
          }).join('')}
        </table>
      </td>
    </tr>` : ''

  const attachmentsHtml = input.attachmentNames?.length
    ? `<tr><td style="padding:0 40px 24px;color:#6b7280;font-size:13px;">Documente atașate: ${input.attachmentNames.map(escapeHtml).join(', ')}</td></tr>`
    : ''

  const html = `<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(input.subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" width="100%" style="background-color:#f3f4f6;">
    <tr>
      <td style="padding:32px 12px;">
        <table role="presentation" cellspacing="0" cellpadding="0" width="100%" style="max-width:640px;margin:0 auto;background-color:#ffffff;border:1px solid ${border};">
          <tr>
            <td style="background-color:${accent};padding:28px 40px;">
              <p style="margin:0 0 6px;color:#c7d2fe;font-size:12px;letter-spacing:1px;text-transform:uppercase;">${escapeHtml(input.senderName)}</p>
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;line-height:1.3;">${escapeHtml(input.reportTitle)}</h1>
              <p style="margin:8px 0 0;color:#e0e7ff;font-size:14px;">Perioada: ${escapeHtml(input.periodLabel)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px 16px;">
              <p style="margin:0 0 14px;color:#111827;font-size:15px;">Bună ziua,</p>
              <p style="margin:0;color:#4b5563;font-size:14px;line-height:1.7;">Mai jos găsiți principalele rezultate ale perioadei. Raportul complet, cu toate detaliile, este disponibil online.</p>
            </td>
          </tr>
          ${reviewHtml}
          ${sectionsHtml}
          ${keywordsHtml}
          <tr>
            <td style="padding:8px 40px 32px;" align="center">
              <a href="${escapeHtml(input.reportUrl)}" style="display:inline-block;padding:14px 32px;background-color:${accent};color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;border-radius:6px;">Deschide raportul complet</a>
              <p style="margin:16px 0 0;color:#9ca3af;font-size:12px;line-height:1.6;">Dacă butonul nu funcționează, copiați adresa în browser:<br><a href="${escapeHtml(input.reportUrl)}" style="color:${accent};word-break:break-all;">${escapeHtml(input.reportUrl)}</a></p>
            </td>
          </tr>
          ${attachmentsHtml}
          <tr>
            <td style="padding:24px 40px;background-color:#f9fafb;border-top:1px solid ${border};">
              <p style="margin:0;color:#374151;font-size:13px;font-weight:600;">${escapeHtml(input.senderName)}</p>
              <p style="margin:4px 0 0;color:#6b7280;font-size:12px;line-height:1.6;">Pentru întrebări legate de acest raport, răspundeți direct la acest email.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  const textLines: string[] = [
    'Bună ziua,',
    '',
    `${input.reportTitle}`,
    `Perioada: ${input.periodLabel}`,
    '',
  ]
  if (reviewMd) textLines.push(reviewMd.replace(/^#{2,4}\s+/gm, '').replace(/\*\*/g, ''), '')
  for (const section of input.content?.sections || []) {
    textLines.push(section.title.toUpperCase())
    for (const row of section.rows) textLines.push(`  ${row.label}: ${row.value}`)
    textLines.push('')
  }
  if (keywords.length) {
    textLines.push('CUVINTE CHEIE PRINCIPALE')
    for (const k of keywords) textLines.push(`  ${k.query} - ${nf(k.clicks)} click-uri, poziția ${nf(k.position, 1)}`)
    textLines.push('')
  }
  textLines.push('Raportul complet:', input.reportUrl, '', '---', input.senderName)

  return { html, text: textLines.join('\n') }
}

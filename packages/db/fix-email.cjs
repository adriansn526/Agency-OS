const fs = require('fs')

const filepath = '../../apps/web/lib/email.ts'
let code = fs.readFileSync(filepath, 'utf8')

const buildReportEmailHtml = `
function buildReportEmailHtml(
  input: Omit<SendReportEmailWithAttachmentsInput, 'attachments'>,
  sender: { name: string; email: string },
  hasAttachments: boolean,
  attachmentNames: string[] = []
): string {
  const isFudly = input.businessLine === 'fudly'
  const accentColor = isFudly ? '#ea580c' : '#4f46e5'
  const accentLight = isFudly ? '#fff7ed' : '#eef2ff'
  const ctaBg = isFudly
    ? 'background: linear-gradient(135deg, #ea580c, #f97316);'
    : 'background: linear-gradient(135deg, #4f46e5, #6366f1);'

  const personalMessage = input.message
    ? \`<!-- Executive Summary Box -->
      <tr>
        <td style="padding: 0 40px 30px;">
          <div style="background-color: \${accentLight}; border-left: 4px solid \${accentColor}; border-radius: 8px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
            <div style="display: flex; align-items: center; margin-bottom: 12px;">
              <h3 style="margin: 0; color: \${accentColor}; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700;">💡 Interpretare / Sumar Executiv</h3>
            </div>
            <p style="margin: 0; color: #374151; font-size: 15px; line-height: 1.6;">\${escapeHtml(input.message).replace(/\\n/g, '<br/>')}</p>
          </div>
        </td>
      </tr>\`
    : ''

  const highlightCards = input.highlights.map(h => {
    const parts = h.split(':')
    const label = parts[0]
    const value = parts.slice(1).join(':').trim()
    return \`
    <td style="padding: 16px; background: #ffffff; border-radius: 12px; border: 1px solid #e5e7eb; width: 33%; text-align: center; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
      <p style="margin: 0 0 4px; color: #6b7280; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">\${escapeHtml(label.trim())}</p>
      <p style="margin: 0; color: #111827; font-size: 18px; font-weight: 700;">\${escapeHtml(value)}</p>
    </td>\`
  }).join('<td style="width: 16px;"></td>')

  const attachmentNote = hasAttachments
    ? \`<tr>
        <td style="padding: 0 40px 24px; text-align: center;">
          <p style="margin: 0; color: #6b7280; font-size: 13px;">📎 <strong>Sunt atașate documente PDF la acest mail:</strong> \${attachmentNames.map(a => escapeHtml(a)).join(', ')}</p>
        </td>
      </tr>\`
    : ''

  return \`<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>\${escapeHtml(input.subject)}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f9fafb;">
  <table role="presentation" cellspacing="0" cellpadding="0" style="width: 100%; background-color: #f9fafb;">
    <tr>
      <td style="padding: 60px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" style="max-width: 640px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05), 0 8px 10px -6px rgba(0,0,0,0.01);">
          
          <!-- Minimalist Header -->
          <tr>
            <td style="padding: 40px 40px 30px; text-align: center; border-bottom: 1px solid #f3f4f6;">
              <h1 style="margin: 0; color: #111827; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">\${escapeHtml(sender.name)}</h1>
              <p style="margin: 6px 0 0; color: #6b7280; font-size: 14px; font-weight: 500; text-transform: uppercase; letter-spacing: 1px;">Raport de Performanță</p>
            </td>
          </tr>

          <!-- Greeting & Context -->
          <tr>
            <td style="padding: 40px 40px 24px; text-align: center;">
              <h2 style="margin: 0 0 12px; color: #111827; font-size: 20px; font-weight: 700;">
                Salutare, \${escapeHtml(input.clientName)}! 👋
              </h2>
              <p style="margin: 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Iată raportul detaliat <strong>\${escapeHtml(input.reportTitle)}</strong> pentru perioada <strong style="color: #111827;">\${escapeHtml(input.dateRange)}</strong>.
              </p>
            </td>
          </tr>

          \${personalMessage}

          <!-- Highlights (Cards) -->
          \${input.highlights.length > 0 ? \`
          <tr>
            <td style="padding: 0 40px 30px;">
              <table role="presentation" cellspacing="0" cellpadding="0" style="width: 100%;">
                <tr>\${highlightCards}</tr>
              </table>
            </td>
          </tr>\` : ''}

          <!-- CTA Button -->
          <tr>
            <td style="padding: 10px 40px 30px; text-align: center;">
              <a href="\${escapeHtml(input.reportUrl)}" 
                 style="display: inline-block; padding: 16px 40px; \${ctaBg} color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 10px; letter-spacing: 0.3px; box-shadow: 0 4px 6px -1px rgba(\${isFudly ? '234,88,12' : '79,70,229'}, 0.3), 0 2px 4px -2px rgba(\${isFudly ? '234,88,12' : '79,70,229'}, 0.3);">
                Deschide Raportul Interactiv &rarr;
              </a>
              <p style="margin: 20px 0 0; color: #9ca3af; font-size: 13px;">
                Sau copiază link-ul în browser:<br/>
                <a href="\${escapeHtml(input.reportUrl)}" style="color: \${accentColor}; text-decoration: none;">\${escapeHtml(input.reportUrl)}</a>
              </p>
            </td>
          </tr>

          \${attachmentNote}

          <!-- Professional Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f8fafc; text-align: center;">
              <p style="margin: 0; color: #64748b; font-size: 13px; font-weight: 500;">
                \${escapeHtml(sender.name)}
              </p>
              <p style="margin: 6px 0 0; color: #94a3b8; font-size: 12px; line-height: 1.5;">
                Dacă ai întrebări despre datele din acest raport, răspunde direct la acest email.<br/>
                Suntem aici să te ajutăm!
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>\`
}
`

// Replace in sendReportEmail
code = code.replace(
  /\/\/ Build the HTML body[\s\S]*?const htmlBody = `<!DOCTYPE html>[\s\S]*?<\/html>`/,
  `const htmlBody = buildReportEmailHtml(input, sender, false)`
)

// Replace in sendReportEmailWithAttachments
code = code.replace(
  /\/\/ Build the HTML body \(reuse the existing template structure\)[\s\S]*?const htmlBody = `<!DOCTYPE html>[\s\S]*?<\/html>`/,
  `const htmlBody = buildReportEmailHtml(input, sender, hasAttachments, hasAttachments ? input.attachments!.map(a => a.filename) : [])`
)

// Append buildReportEmailHtml function
code += '\n' + buildReportEmailHtml

fs.writeFileSync(filepath, code)
console.log('Successfully updated email templates!')

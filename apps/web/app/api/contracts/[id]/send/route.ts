import { NextRequest, NextResponse } from 'next/server'
import { db, logActivity } from '@repo/db'
import { SESClient, SendRawEmailCommand, SendEmailCommand } from '@aws-sdk/client-ses'

// ─── Lazy SES client ───
let _ses: SESClient | null = null
function getSES(): SESClient {
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

// ─── Sender config ───
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

function getSender(bl?: string) {
  return (bl && SENDER_CONFIG[bl]) || {
    email: process.env.SES_SENDER_DEFAULT || 'contracte@asns.ro',
    name: 'ASNS',
    replyTo: process.env.SES_REPLY_DEFAULT || 'office@asns.ro',
  }
}

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// ─── POST /api/contracts/[id]/send ───
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Parse body — support both JSON and FormData
    let email = ''
    let subject = ''
    let message = ''
    let attachmentBuffer: Buffer | null = null
    let attachmentName = ''
    let attachmentMimeType = ''

    const contentType = request.headers.get('content-type') || ''
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      email = formData.get('email') as string || ''
      subject = formData.get('subject') as string || ''
      message = formData.get('message') as string || ''
      const file = formData.get('attachment') as File | null
      if (file && file.size > 0) {
        const arrayBuffer = await file.arrayBuffer()
        attachmentBuffer = Buffer.from(arrayBuffer)
        attachmentName = file.name
        attachmentMimeType = file.type || 'application/octet-stream'
      }
    } else {
      const body = await request.json()
      email = body.email || ''
      subject = body.subject || ''
      message = body.message || ''
    }

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Load contract
    const contract = await db.contract.findUnique({
      where: { id },
      include: {
        client: { select: { id: true, companyName: true, email: true } },
        businessLine: { select: { id: true, slug: true, name: true } },
        offer: { select: { id: true, number: true } },
      },
    })

    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }

    const sender = getSender(contract.businessLine?.slug)
    const fromAddress = `${sender.name} <${sender.email}>`
    const contractUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://admin.asns.ro'}/contract/view/${contract.id}`
    const clientName = contract.client?.companyName || ''

    const formattedValue = new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: contract.currency || 'EUR',
      minimumFractionDigits: 0,
    }).format(contract.value ?? 0)

    const startDate = contract.startDate.toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })
    const endDate = contract.endDate.toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })

    const personalMessage = message
      ? `<tr>
          <td style="padding: 20px 30px; background-color: #f8f9fa; border-left: 4px solid #4338ca; border-radius: 4px;">
            <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.6; font-style: italic;">${escapeHtml(message)}</p>
          </td>
        </tr>
        <tr><td style="height: 20px;"></td></tr>`
      : ''

    // Build HTML email
    const htmlBody = `<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject || `Contract ${contract.number}`)}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" cellspacing="0" cellpadding="0" style="width: 100%; background-color: #f3f4f6;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.07);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 600;">${escapeHtml(sender.name)}</h1>
              <p style="margin: 8px 0 0; color: rgba(255,255,255,0.7); font-size: 13px;">Contract de Prestări Servicii</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 30px;">
              <h2 style="margin: 0 0 8px; color: #111827; font-size: 18px; font-weight: 600;">
                Bună ziua,
              </h2>
              <p style="margin: 0 0 24px; color: #6b7280; font-size: 14px; line-height: 1.6;">
                Vă transmitem contractul de prestări servicii. Vă rugăm să verificați detaliile și să ne contactați dacă aveți întrebări.
              </p>
            </td>
          </tr>

          ${personalMessage}

          <!-- Contract Card -->
          <tr>
            <td style="padding: 0 30px;">
              <table role="presentation" cellspacing="0" cellpadding="0" style="width: 100%; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                <tr>
                  <td style="padding: 20px; background-color: #fafafa;">
                    <table role="presentation" cellspacing="0" cellpadding="0" style="width: 100%;">
                      <tr>
                        <td>
                          <p style="margin: 0; color: #9ca3af; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">Nr. Contract</p>
                          <p style="margin: 4px 0 0; color: #111827; font-size: 16px; font-weight: 600;">${escapeHtml(contract.number)}</p>
                        </td>
                        <td style="text-align: right;">
                          <p style="margin: 0; color: #9ca3af; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">Valoare</p>
                          <p style="margin: 4px 0 0; color: #4338ca; font-size: 16px; font-weight: 700;">${formattedValue} / lunar</p>
                        </td>
                      </tr>
                      ${contract.duration > 0 ? `<tr>
                        <td colspan="2" style="padding-top: 12px;">
                          <p style="margin: 0; color: #9ca3af; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">Perioadă</p>
                          <p style="margin: 4px 0 0; color: #374151; font-size: 14px;">${startDate} — ${endDate}</p>
                        </td>
                      </tr>` : `<tr>
                        <td colspan="2" style="padding-top: 12px;">
                          <p style="margin: 0; color: #9ca3af; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">Data începerii</p>
                          <p style="margin: 4px 0 0; color: #374151; font-size: 14px;">începând de la ${startDate}, pe o perioadă nedeterminată</p>
                        </td>
                      </tr>`}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Note -->
          <tr>
            <td style="padding: 24px 30px;">
              <p style="margin: 0; color: #6b7280; font-size: 13px; line-height: 1.6;">
                ${attachmentBuffer ? 'Contractul a fost atașat la acest email în format PDF.' : 'Puteți accesa contractul online folosind link-ul de mai jos.'}
              </p>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding: 0 30px 30px; text-align: center;">
              <a href="${escapeHtml(contractUrl)}" 
                 style="display: inline-block; padding: 14px 36px; background: linear-gradient(135deg, #4338ca, #6366f1); color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600; border-radius: 8px;">
                Vizualizează Contractul
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 30px; background-color: #f9fafb; border-top: 1px solid #f3f4f6; text-align: center;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                ${escapeHtml(sender.name)} · mail@asns.ro
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
      `Bună ziua,`,
      '',
      'Vă transmitem contractul de prestări servicii.',
      '',
      `Nr. Contract: ${contract.number}`,
      `Valoare: ${formattedValue} / lunar`,
      ...(contract.duration > 0
        ? [`Perioadă: ${startDate} — ${endDate}`]
        : [`Începând de la ${startDate}, pe o perioadă nedeterminată`]),
      '',
      message ? `Mesaj: ${message}\n` : '',
      'Vizualizați contractul accesând link-ul:',
      contractUrl,
      '',
      '---',
      'Acest email a fost trimis automat.',
    ].filter(Boolean).join('\n')

    const emailSubject = subject || `Contract ${contract.number} — ${sender.name}`

    let messageId = ''

    if (attachmentBuffer) {
      // ─── Send with attachment via SendRawEmailCommand ───
      const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).slice(2)}`

      const rawParts = [
        `From: ${fromAddress}`,
        `To: ${email}`,
        `Reply-To: ${sender.replyTo}`,
        `Subject: =?UTF-8?B?${Buffer.from(emailSubject).toString('base64')}?=`,
        `MIME-Version: 1.0`,
        `Content-Type: multipart/mixed; boundary="${boundary}"`,
        ``,
        `--${boundary}`,
        `Content-Type: multipart/alternative; boundary="${boundary}_alt"`,
        ``,
        `--${boundary}_alt`,
        `Content-Type: text/plain; charset=UTF-8`,
        `Content-Transfer-Encoding: base64`,
        ``,
        Buffer.from(textBody).toString('base64'),
        ``,
        `--${boundary}_alt`,
        `Content-Type: text/html; charset=UTF-8`,
        `Content-Transfer-Encoding: base64`,
        ``,
        Buffer.from(htmlBody).toString('base64'),
        ``,
        `--${boundary}_alt--`,
        ``,
        `--${boundary}`,
        `Content-Type: ${attachmentMimeType}; name="${attachmentName}"`,
        `Content-Disposition: attachment; filename="${attachmentName}"`,
        `Content-Transfer-Encoding: base64`,
        ``,
        attachmentBuffer.toString('base64'),
        ``,
        `--${boundary}--`,
      ]

      const rawMessage = rawParts.join('\r\n')
      const command = new SendRawEmailCommand({
        RawMessage: { Data: Buffer.from(rawMessage) },
      })
      const result = await getSES().send(command)
      messageId = result.MessageId || ''
    } else {
      // ─── Send without attachment ───
      const command = new SendEmailCommand({
        Source: fromAddress,
        ReplyToAddresses: [sender.replyTo],
        Destination: { ToAddresses: [email] },
        Message: {
          Subject: { Data: emailSubject, Charset: 'UTF-8' },
          Body: {
            Html: { Data: htmlBody, Charset: 'UTF-8' },
            Text: { Data: textBody, Charset: 'UTF-8' },
          },
        },
      })
      const result = await getSES().send(command)
      messageId = result.MessageId || ''
    }

    // Update contract status to 'sent' if draft
    if (contract.status === 'draft') {
      await db.contract.update({
        where: { id },
        data: { status: 'sent' },
      })
    }

    // Log activity
    await logActivity({
      businessLineId: contract.businessLine?.id || '',
      userId: 'system',
      userName: 'System',
      action: 'email_sent',
      entityType: 'contract',
      entityId: id,
      entityName: `${contract.number} — ${clientName}`,
      details: {
        email,
        subject: emailSubject,
        messageId,
        hasAttachment: !!attachmentBuffer,
        attachmentName: attachmentName || undefined,
      },
      clientId: contract.clientId,
      contractId: id,
    })

    // Log communication
    await db.communication.create({
      data: {
        businessLineId: contract.businessLine?.id || null,
        clientId: contract.clientId || null,
        channel: 'email',
        direction: 'outbound',
        subject: emailSubject,
        body: htmlBody,
        fromAddr: 'office@asns.ro',
        toAddr: email,
        emailStatus: 'sent',
        userName: 'System',
        attachments: attachmentName ? [attachmentName] : [],
        metadata: {
          contractId: id,
          contractNumber: contract.number,
          messageId,
        },
      },
    })

    return NextResponse.json({
      success: true,
      messageId,
      contractUrl,
    })
  } catch (error) {
    console.error('[API] POST /api/contracts/[id]/send error:', error)
    return NextResponse.json(
      { error: 'Failed to send contract email' },
      { status: 500 }
    )
  }
}

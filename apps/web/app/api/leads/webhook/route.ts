/**
 * Lead Webhook — Public endpoint for form submissions
 * Receives form data from client websites (local or external)
 * Authenticates via X-API-Key header mapped to ClientApiKey
 *
 * POST /api/leads/webhook
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@repo/db'
import { sendTelegramAlert } from '@/lib/notifications/telegram'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'

// Simple in-memory rate limiting (reset on deploy)
const rateLimiter = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 100 // max requests
const RATE_WINDOW = 60_000 // per minute

function checkRateLimit(key: string): boolean {
  const now = Date.now()
  const entry = rateLimiter.get(key)
  if (!entry || now > entry.resetAt) {
    rateLimiter.set(key, { count: 1, resetAt: now + RATE_WINDOW })
    return true
  }
  entry.count++
  return entry.count <= RATE_LIMIT
}

// ─── CORS preflight ───
export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin') || ''
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(origin),
  })
}

// ─── POST /api/leads/webhook ───
export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin') || ''
  const apiKey = req.headers.get('x-api-key') || req.nextUrl.searchParams.get('key') || ''

  // 1. Validate API key
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Missing API key. Include X-API-Key header or ?key= param.' },
      { status: 401, headers: corsHeaders(origin) }
    )
  }

  const keyRecord = await db.clientApiKey.findUnique({
    where: { key: apiKey },
    include: { client: { select: { id: true, companyName: true, businessLineId: true, entityType: true } } },
  })

  if (!keyRecord || !keyRecord.isActive) {
    return NextResponse.json(
      { error: 'Invalid or inactive API key.' },
      { status: 403, headers: corsHeaders(origin) }
    )
  }

  // 2. Rate limiting per API key
  if (!checkRateLimit(apiKey)) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Max 100 requests per minute.' },
      { status: 429, headers: corsHeaders(origin) }
    )
  }

  // 3. Parse body
  let body: Record<string, any>
  try {
    const contentType = req.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      body = await req.json()
    } else if (contentType.includes('form-data') || contentType.includes('urlencoded')) {
      const formData = await req.formData()
      body = Object.fromEntries(formData.entries())
    } else {
      body = await req.json().catch(() => ({}))
    }
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body.' },
      { status: 400, headers: corsHeaders(origin) }
    )
  }

  // 4. Extract & sanitize fields
  const sanitize = (v: any): string => String(v || '').trim().substring(0, 500)

  const name = sanitize(body.name || body.companyName || body.fullName || body.nume || '')
  const email = sanitize(body.email || body.emailAddress || '')
  const phone = sanitize(body.phone || body.telefon || body.tel || '')
  const message = sanitize(body.message || body.mesaj || body.details || body.comentariu || '')
  const service = sanitize(body.service || body.serviciu || body.sourceService || '')

  // Tracking fields
  const sourcePage = sanitize(body.sourcePage || body.page || body.pageUrl || '')
  let sourceReferrer = sanitize(body.sourceReferrer || body.referrer || '')
  const sourceFormId = sanitize(body.sourceFormId || body.formId || '')
  const utmSource = sanitize(body.utmSource || body.utm_source || '')
  const utmMedium = sanitize(body.utmMedium || body.utm_medium || '')
  const utmCampaign = sanitize(body.utmCampaign || body.utm_campaign || '')
  const utmTerm = sanitize(body.utmTerm || body.utm_term || '')
  const utmContent = sanitize(body.utmContent || body.utm_content || '')

  // Improve Referrer Detection for Google Ads / Organic
  const isGoogleAds = utmSource.toLowerCase().includes('google_ads') || 
                      utmSource.toLowerCase().includes('adwords') || 
                      utmMedium.toLowerCase() === 'cpc' || 
                      body.gclid || 
                      body.extra?.gclid;

  if (isGoogleAds) {
    sourceReferrer = 'Google Ads';
  } else if (sourceReferrer.toLowerCase().includes('google')) {
    sourceReferrer = 'Google Organic';
  } else if (sourceReferrer.toLowerCase().includes('facebook') || utmSource.toLowerCase() === 'facebook') {
    sourceReferrer = 'Facebook';
  }

  // Require at least name or email
  if (!name && !email) {
    return NextResponse.json(
      { error: 'At least name or email is required.' },
      { status: 400, headers: corsHeaders(origin) }
    )
  }

  // 5. Create lead in CRM
  try {
    const lead = await db.lead.create({
      data: {
        businessLineId: keyRecord.client.businessLineId,
        entityType: keyRecord.client.entityType,
        companyName: name || 'Cerere formular',
        contactPerson: name,
        email: email || 'necunoscut@formular.ro',
        phone: phone || null,
        status: 'nou',
        source: keyRecord.domain, // domeniul ca sursă
        notes: message || null,
        // Form tracking
        sourceDomain: keyRecord.domain,
        sourcePage: sourcePage || null,
        sourceService: service || null,
        sourceFormId: sourceFormId || null,
        sourceReferrer: sourceReferrer || null,
        // UTM
        utmSource: utmSource || null,
        utmMedium: utmMedium || null,
        utmCampaign: utmCampaign || null,
        utmTerm: utmTerm || null,
        utmContent: utmContent || null,
        // Store all raw fields as custom
        customFields: {
          rawFormData: body,
          submittedAt: new Date().toISOString(),
          ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
          userAgent: (req.headers.get('user-agent') || '').substring(0, 200),
        },
      },
    })

    // 6. Activity log (non-critical — don't let this break lead creation)
    try {
      await db.activity.create({
        data: {
          action: 'created',
          entityType: 'lead',
          entityId: lead.id,
          entityName: `${name || email} — ${keyRecord.domain}`,
          businessLineId: keyRecord.client.businessLineId,
          details: {
            source: keyRecord.domain,
            service: service || 'cerere generală',
            page: sourcePage || '/',
          },
          leadId: lead.id,
          clientId: keyRecord.clientId,
        },
      })
    } catch (actErr) {
      console.warn('[Lead Webhook] Activity log failed (non-critical):', actErr)
    }

    // 7. Telegram notification
    const utmInfo = utmSource ? `\n📊 UTM: ${utmSource}/${utmMedium || '—'}/${utmCampaign || '—'}` : ''
    await sendTelegramAlert(
      `🔔 *Cerere nouă formular*\n` +
      `🏢 ${keyRecord.client.companyName}\n` +
      `🌐 ${keyRecord.domain}\n` +
      `👤 ${name || '—'}\n` +
      `📧 ${email || '—'}\n` +
      `📱 ${phone || '—'}\n` +
      `🔧 Serviciu: ${service || '—'}\n` +
      `📄 Pagina: ${sourcePage || '/'}\n` +
      `💬 ${(message || '—').substring(0, 150)}` +
      utmInfo +
      `\n\n🔗 https://admin.asns.ro/crm/lead-uri/${lead.id}`
    )

    return NextResponse.json(
      { ok: true, id: lead.id },
      { status: 201, headers: corsHeaders(origin) }
    )
  } catch (err: any) {
    console.error('[Lead Webhook] Failed:', err)
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500, headers: corsHeaders(origin) }
    )
  }
}

// ─── CORS Headers ───
function corsHeaders(origin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
    'Access-Control-Max-Age': '86400',
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@repo/db'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

// ─── OPTIONS preflight ───
export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS_HEADERS })
}

// ─── POST /api/marketing/track/cta ───
// Public endpoint — no auth. Called when lead clicks CTA on LP.
// Body: { code: string, action: string }
export async function POST(request: NextRequest) {
  try {
    const { code, action } = await request.json()

    if (!code) {
      return NextResponse.json({ error: 'code required' }, { status: 400, headers: CORS_HEADERS })
    }

    const campaignLead = await db.campaignLead.update({
      where: { uniqueCode: code },
      data: {
        status: 'interested',
        notes: action ? `CTA: ${action}` : 'CTA clicked',
      },
    })

    // NOTE: CTA click = interested, NOT converted.
    // Conversion (totalConverted) is reserved for actual payment events.
    // We do NOT increment totalConverted here.

    return NextResponse.json({ ok: true }, { headers: CORS_HEADERS })
  } catch (error) {
    return NextResponse.json({ ok: false }, { status: 200, headers: CORS_HEADERS }) // Don't error on tracking
  }
}

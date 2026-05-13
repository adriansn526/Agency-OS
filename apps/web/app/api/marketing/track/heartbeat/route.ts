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

// ─── POST /api/marketing/track/heartbeat ───
// Public endpoint — no auth. Called by LP JS every 10 seconds.
// Body: { code: string, seconds: number }
export async function POST(request: NextRequest) {
  try {
    const { code, seconds } = await request.json()

    if (!code || !seconds) {
      return NextResponse.json({ error: 'code and seconds required' }, { status: 400, headers: CORS_HEADERS })
    }

    await db.campaignLead.update({
      where: { uniqueCode: code },
      data: {
        lpTimeSpent: { increment: Math.min(seconds, 30) }, // cap at 30s per heartbeat
      },
    })

    return NextResponse.json({ ok: true }, { headers: CORS_HEADERS })
  } catch (error) {
    return NextResponse.json({ ok: false }, { status: 200, headers: CORS_HEADERS }) // Don't error on tracking
  }
}

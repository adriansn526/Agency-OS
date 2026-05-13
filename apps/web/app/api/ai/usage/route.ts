import { NextResponse } from 'next/server'
import { getUsageStats } from '@/lib/ai/usage'

// ─── GET /api/ai/usage ───
export async function GET() {
  try {
    const stats = getUsageStats()
    return NextResponse.json({ data: stats })
  } catch (error) {
    console.error('[API] GET /api/ai/usage error:', error)
    return NextResponse.json({ error: 'Failed to get usage stats' }, { status: 500 })
  }
}

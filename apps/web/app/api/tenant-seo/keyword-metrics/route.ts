import { NextRequest, NextResponse } from 'next/server'
import { authTenant, TenantAiError } from '@/lib/tenant-ai/service'
import { cleanTerms, kdFor, volumesFor } from '@/lib/seo/keyword-metrics'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * POST { terms: string[] (max 8), kind: 'volume' | 'kd' }  Auth: X-License-Key.
 * volume → { metrics: { term: { volume: number | null } } } (Google Ads Keyword Planner; null = Google has no figure)
 * kd     → { metrics: { term: { kd: number | null } } }     (estimated from the SERP; null = could not be computed)
 * The caller caches results and enforces its own per-user limits.
 */
export async function POST(req: NextRequest) {
  try {
    await authTenant(req.headers.get('x-license-key'))
    const body = await req.json().catch(() => ({}))
    const terms = cleanTerms(body?.terms)
    if (!terms.length || (body?.kind !== 'volume' && body?.kind !== 'kd')) return NextResponse.json({ error: 'Cerere invalidă' }, { status: 400 })
    if (body.kind === 'volume') {
      const v = await volumesFor(terms)
      return NextResponse.json({ metrics: Object.fromEntries(terms.map(t => [t, { volume: v[t] ?? null }])) })
    }
    const k = await kdFor(terms)
    return NextResponse.json({ metrics: Object.fromEntries(terms.map(t => [t, { kd: k[t] ?? null }])) })
  } catch (e: any) {
    if (e instanceof TenantAiError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error('[tenant-seo/keyword-metrics]', e)
    return NextResponse.json({ error: 'Serviciul de cuvinte-cheie nu este disponibil' }, { status: 502 })
  }
}

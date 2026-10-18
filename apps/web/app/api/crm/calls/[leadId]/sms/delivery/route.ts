import { NextResponse } from 'next/server'
import { refreshDeliveries } from '@/lib/crm/calls/delivery'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET → { data: [{ id, at, subject, state: delivered|failed|pending|unknown, status, deliveredAt }] } for the lead's last SMS, refreshed from the provider. */
export async function GET(_req: Request, { params }: { params: Promise<{ leadId: string }> }) {
  try { return NextResponse.json({ data: await refreshDeliveries((await params).leadId) }) }
  catch (e) { console.error('[calls] delivery', e instanceof Error ? e.message : e); return NextResponse.json({ error: 'Nu am putut verifica livrarea' }, { status: 502 }) }
}

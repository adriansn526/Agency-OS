import { NextResponse } from 'next/server'
import { db } from '@repo/db'
import { requireCommerceAdmin, badRequest } from '@/lib/commerce/admin-guard'
import { syncListingsAndPrices } from '@/lib/commerce/listings'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ businessLineId: string }> }
type State = { running: boolean; startedAt?: string; finishedAt?: string; result?: unknown; error?: string }
const state = new Map<string, State>()

/** GET → status of the last/ongoing reprice (in memory; resets on restart). */
export async function GET(_req: Request, { params }: Ctx) {
  const denied = await requireCommerceAdmin()
  if (denied) return denied
  const { businessLineId } = await params
  return NextResponse.json(state.get(businessLineId) ?? { running: false })
}

/**
 * POST { dryRun: true } → synchronous impact preview (nothing is written).
 * POST { apply: true }  → recompute all listing prices with the saved settings/rules and BNR rate, in the background.
 * Any other body is rejected, so prices cannot be rewritten by accident.
 */
export async function POST(req: Request, { params }: Ctx) {
  const denied = await requireCommerceAdmin()
  if (denied) return denied
  const { businessLineId } = await params
  if (!businessLineId || businessLineId.length > 40) return badRequest()
  const body = (await req.json().catch(() => null)) as { dryRun?: unknown; apply?: unknown } | null
  if (body?.dryRun === true) {
    try {
      const r = await syncListingsAndPrices(businessLineId, { dryRun: true })
      if (!r.preview) return NextResponse.json({ error: 'Prețurile sunt gestionate de sincronizarea furnizorului (/commerce/sync); recalcularea pe reguli este oprită.' }, { status: 409 })
      return NextResponse.json({ preview: r.preview, eurRate: r.eurRate })
    } catch (e) {
      console.error('[commerce/reprice preview]', e)
      return NextResponse.json({ error: e instanceof Error ? e.message : 'Eroare la previzualizare' }, { status: 500 })
    }
  }
  if (body?.apply !== true) return badRequest('Cerere invalidă')
  if (state.get(businessLineId)?.running) return NextResponse.json({ error: 'Recalcularea rulează deja' }, { status: 409 })
  const ch = await db.commerceChannel.findUnique({ where: { businessLineId }, select: { isEnabled: true } })
  if (!ch) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!ch.isEnabled) return badRequest('Canalul este inactiv')
  state.set(businessLineId, { running: true, startedAt: new Date().toISOString() })
  syncListingsAndPrices(businessLineId)
    .then((result) => state.set(businessLineId, { running: false, startedAt: state.get(businessLineId)?.startedAt, finishedAt: new Date().toISOString(), result }))
    .catch((e) => {
      console.error('[commerce/reprice]', e)
      state.set(businessLineId, { running: false, startedAt: state.get(businessLineId)?.startedAt, finishedAt: new Date().toISOString(), error: e instanceof Error ? e.message : 'Eroare' })
    })
  return NextResponse.json({ ok: true, started: true }, { status: 202 })
}

import { NextResponse } from 'next/server'
import { requireCommerceAdmin, badRequest } from '@/lib/commerce/admin-guard'
import { SettingsPatch, saveSyncSettings } from '@/lib/commerce/sync/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** PUT /api/commerce/sync/settings — price formula, limits, stock mapping (admin only). Does NOT reprice. */
export async function PUT(req: Request) {
  const denied = await requireCommerceAdmin()
  if (denied) return denied
  const parsed = SettingsPatch.safeParse(await req.json().catch(() => null))
  if (!parsed.success || Object.keys(parsed.data).length === 0) return badRequest('Valori invalide')
  return NextResponse.json({ settings: await saveSyncSettings(parsed.data) })
}

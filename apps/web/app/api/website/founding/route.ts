import { requireWebsiteAdmin } from '@/lib/website/admin/guard'
import { AdminError, readJson, respond } from '@/lib/website/admin/errors'
import { assertLine } from '@/lib/website/admin/service'
import { overview, saveConfig } from '@/lib/website/founding/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const lineOf = (req: Request) => new URL(req.url).searchParams.get('lineId') ?? ''

/** GET → { config, combos: [{ county, category, total, taken, left, firms }], totalSlots } */
export async function GET(req: Request) {
  const denied = await requireWebsiteAdmin(); if (denied) return denied
  return respond(async () => { await assertLine(lineOf(req)); return overview(lineOf(req)) })
}

/** PUT { enabled, perCombo, lockMonths, benefit } */
export async function PUT(req: Request) {
  const denied = await requireWebsiteAdmin(); if (denied) return denied
  return respond(async () => {
    await assertLine(lineOf(req))
    const saved = await saveConfig(lineOf(req), await readJson(req))
    if (!saved) throw new AdminError('Modulul Website nu este activat pe această linie', 404)
    return overview(lineOf(req))
  })
}

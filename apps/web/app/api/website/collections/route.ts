import { requireWebsiteAdmin } from '@/lib/website/admin/guard'
import { readJson, respond } from '@/lib/website/admin/errors'
import { createCollection, listCollections } from '@/lib/website/admin/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const lineOf = (req: Request) => new URL(req.url).searchParams.get('lineId') ?? ''

export async function GET(req: Request) {
  const denied = await requireWebsiteAdmin(); if (denied) return denied
  return respond(() => listCollections(lineOf(req)))
}
export async function POST(req: Request) {
  const denied = await requireWebsiteAdmin(); if (denied) return denied
  return respond(async () => createCollection(lineOf(req), await readJson(req)), 201)
}

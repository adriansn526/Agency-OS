import { partnerHandler } from '@/lib/website/partner/http'
import { createProject, listProjects } from '@/lib/website/partner/projects'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = partnerHandler(async (_req, { entry }) => ({ items: await listProjects(entry) }))
export const POST = partnerHandler(async (req, { entry }) => createProject(entry, await req.json().catch(() => null)))

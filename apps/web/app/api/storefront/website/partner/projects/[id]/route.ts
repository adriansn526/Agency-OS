import { partnerHandler } from '@/lib/website/partner/http'
import { deleteProject, updateProject } from '@/lib/website/partner/projects'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type P = { id: string }
export const PATCH = partnerHandler<P>(async (req, { entry }, { id }) => updateProject(entry, id, await req.json().catch(() => null)))
export const DELETE = partnerHandler<P>(async (_req, { entry }, { id }) => deleteProject(entry, id))

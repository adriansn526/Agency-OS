import { db } from '@repo/db'
import { buildProposal, readProposals, type ArticleProposal } from './proposals'

/** Serialises read-modify-write cycles of one project's metadata inside this process. */
const chains = new Map<string, Promise<unknown>>()
export function withProject<T>(projectId: string, fn: (list: ArticleProposal[], meta: any) => Promise<{ list: ArticleProposal[]; result: T }>): Promise<T> {
  const run = (chains.get(projectId) ?? Promise.resolve()).catch(() => {}).then(async () => {
    const project = await db.project.findUnique({ where: { id: projectId }, select: { metadata: true } })
    if (!project) throw Object.assign(new Error('Project not found'), { status: 404 })
    const meta = (project.metadata as any) || {}
    const { list, result } = await fn(readProposals(meta), meta)
    await db.project.update({ where: { id: projectId }, data: { metadata: { ...meta, articleProposals: list } } })
    return result
  })
  chains.set(projectId, run)
  return run
}

export { buildProposal }

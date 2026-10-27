/** Rules for the entries of the "servicii" collection, so the team cannot break the taxonomy firms and pages depend on. */
import { db } from '@repo/db'
import { AdminError } from '../admin/errors'
import { GROUPS } from './taxonomy'

type Data = Record<string, unknown>

async function groupSlugs(lineId: string, exceptId?: string): Promise<string[]> {
  const rows = await db.websiteEntry.findMany({ where: { businessLineId: lineId, collection: { key: 'servicii' }, status: { not: 'suspended' }, ...(exceptId ? { NOT: { id: exceptId } } : {}) }, select: { slug: true, data: true } })
  const live = rows.filter((r) => (r.data as Data | null)?.tip === 'grup').map((r) => r.slug)
  return live.length ? live : GROUPS.map((g) => g.slug)
}

/** `tip` is required; a category needs an existing group; a group has no parent. */
export async function assertServiceEntry(lineId: string, data: Data, slug: string, exceptId?: string) {
  const tip = data.tip
  if (tip !== 'grup' && tip !== 'categorie' && tip !== 'situatie') throw new AdminError('Alege tipul: grup, categorie sau situație', 422, ['tip: obligatoriu (grup, categorie sau situație)'])
  if (tip === 'grup' && data.parinte) throw new AdminError('Un grup nu are părinte', 422, ['parinte: lasă gol pentru un grup'])
  if (tip === 'categorie') {
    const groups = await groupSlugs(lineId, exceptId)
    if (typeof data.parinte !== 'string' || !groups.includes(data.parinte)) throw new AdminError('Alege un grup existent pentru categorie', 422, [`parinte: grupul „${String(data.parinte ?? '')}” nu există (grupuri: ${groups.join(', ')})`])
    if (data.parinte === slug) throw new AdminError('O categorie nu poate fi propriul grup', 422)
  }
  // a situation is a page under a category (/lucrari/<categorie>/<situație>); its slug is `<categorie>--<situație>`, which keeps slugs unique across categories
  if (tip === 'situatie') {
    if (typeof data.parinte !== 'string' || !data.parinte) throw new AdminError('Alege categoria situației', 422, ['parinte: categoria din care face parte situația'])
    const cat = await db.websiteEntry.findFirst({ where: { businessLineId: lineId, collection: { key: 'servicii' }, slug: data.parinte, status: { not: 'suspended' } }, select: { data: true } })
    if ((cat?.data as Data | null)?.tip !== 'categorie') throw new AdminError('Alege o categorie existentă pentru situație', 422, [`parinte: categoria „${data.parinte}” nu există`])
    if (!situationSlugOk(slug, data.parinte)) throw new AdminError(`Slug-ul unei situații este „${data.parinte}--<situație>”`, 422, [`slug: trebuie să înceapă cu „${data.parinte}--”`])
  }
}

/** `<categorie>--<situație>`, with a non-empty situation part made of lowercase letters, digits and single hyphens. */
export const situationSlugOk = (slug: string, category: string) => slug.startsWith(`${category}--`) && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug.slice(category.length + 2))

/** A category used by firms (or a group that still has categories) cannot be deleted, suspended or renamed. */
export async function assertServiceRemovable(lineId: string, entry: { slug: string; data: unknown }) {
  const tip = (entry.data as Data | null)?.tip
  if (tip === 'categorie') {
    const used = await db.websiteEntry.count({ where: { businessLineId: lineId, collection: { key: 'companii' }, data: { path: ['servicii'], array_contains: entry.slug } } })
    if (used) throw new AdminError(`Categoria este folosită de ${used} ${used === 1 ? 'firmă' : 'firme'}. Mută-le pe alta înainte să o ștergi, suspendi sau redenumești.`, 409)
    const situations = await db.websiteEntry.count({ where: { businessLineId: lineId, collection: { key: 'servicii' }, status: { not: 'suspended' }, data: { path: ['parinte'], equals: entry.slug } } })
    if (situations) throw new AdminError(`Categoria are ${situations} ${situations === 1 ? 'situație' : 'situații'}. Mută-le sau șterge-le întâi.`, 409)
  } else if (tip === 'grup') {
    const kids = await db.websiteEntry.count({ where: { businessLineId: lineId, collection: { key: 'servicii' }, status: { not: 'suspended' }, data: { path: ['parinte'], equals: entry.slug } } })
    if (kids) throw new AdminError(`Grupul are ${kids} categorii. Mută-le sau șterge-le întâi.`, 409)
  }
}

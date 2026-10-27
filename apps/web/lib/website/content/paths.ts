/** Public address of an entry of a content collection (pure): used for the "see the page" and preview links of the admin. */
export function publicPathOf(collectionKey: string, slug: string, data: unknown): string {
  if (collectionKey === 'preturi') return `/preturi/${slug}`
  if (collectionKey === 'ghiduri') return `/ghiduri/${slug}`
  const d = (data ?? {}) as { tip?: unknown; parinte?: unknown }
  // a situation lives under its category: slug `<categorie>--<situație>` → /lucrari/<categorie>/<situație>
  if (d.tip === 'situatie' && typeof d.parinte === 'string' && slug.startsWith(`${d.parinte}--`)) return `/lucrari/${d.parinte}/${slug.slice(d.parinte.length + 2)}`
  return `/lucrari/${slug}`
}

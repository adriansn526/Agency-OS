/**
 * Which pipeline stages a lead list shows. Each entity type of a line has its own pipeline (clienti: contactat → … → câștigat,
 * parteneri: prospect → contactat → in_discutii → … → activ), and a lead's status is always a key of ITS type's pipeline.
 * There is deliberately no mapping between pipelines: a specific type shows its own stages, and "Toate" shows the union
 * (a stage key shared by several types, like "contactat", appears once and gathers the leads of all of them).
 */
export interface Stage { key: string; label: string }
interface TypeLike { id: string; pipeline?: Stage[] }

export function stagesFor(entityTypes: TypeLike[] | undefined | null, activeEntityTypeId: string | null | undefined): Stage[] {
  const types = entityTypes ?? []
  const one = activeEntityTypeId && activeEntityTypeId !== 'all' ? types.find((t) => t.id === activeEntityTypeId) : undefined
  if (one) return (one.pipeline ?? []).map((s) => ({ key: s.key, label: s.label }))
  const seen = new Map<string, Stage>()
  for (const t of types) for (const s of t.pipeline ?? []) if (!seen.has(s.key)) seen.set(s.key, { key: s.key, label: s.label })
  return [...seen.values()]
}

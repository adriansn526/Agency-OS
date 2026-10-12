import { NextResponse } from 'next/server'
import { db, businessLineConfigSchema } from '@repo/db'
import { leadCounts } from '@/lib/business-lines/entity-types'

export const dynamic = 'force-dynamic'

// GET /api/settings/pipelines → every active line with its entity types and, per stage, how many leads sit there
export async function GET() {
  const lines = await db.businessLine.findMany({ where: { isActive: true }, orderBy: { name: 'asc' }, select: { id: true, slug: true, name: true, icon: true, color: true, config: true } })
  const counts = await leadCounts(lines.map((l) => l.id))
  return NextResponse.json({
    data: lines.map((l) => {
      const cfg = businessLineConfigSchema.safeParse(l.config)
      return {
        id: l.id, slug: l.slug, name: l.name, icon: l.icon, color: l.color, configValid: cfg.success,
        entityTypes: (cfg.success ? cfg.data.entityTypes : []).map((et) => {
          const byStatus = counts[l.id]?.[et.id] ?? {}
          const known = new Set(et.pipeline.map((s) => s.key))
          return {
            ...et,
            pipeline: et.pipeline.map((s) => ({ ...s, leads: byStatus[s.key] ?? 0 })),
            otherStatuses: Object.entries(byStatus).filter(([k]) => !known.has(k)).map(([status, leads]) => ({ status, leads })),
          }
        }),
      }
    }),
  })
}

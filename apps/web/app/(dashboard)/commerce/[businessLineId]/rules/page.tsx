import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { db } from "@repo/db"
import { parsePriceSyncSettings } from "@/lib/commerce/sync/settings"
import { RulesManager, type RuleRow, type CategoryOpt } from "./rules-manager"

export const dynamic = 'force-dynamic'

export default async function PricingRulesPage({ params }: { params: Promise<{ businessLineId: string }> }) {
  const { businessLineId } = await params
  const channel = await db.commerceChannel.findUnique({ where: { businessLineId }, include: { businessLine: { select: { name: true } } } })
  if (!channel) notFound()

  const [rules, cats, eur, brands] = await Promise.all([
    db.commercePricingRule.findMany({ where: { businessLineId }, orderBy: [{ priority: "desc" }, { createdAt: "asc" }], include: { _count: { select: { listings: true } } } }),
    db.commerceCategory.findMany({ select: { id: true, parentId: true, nameRo: true, sortOrder: true }, orderBy: [{ sortOrder: "asc" }, { nameRo: "asc" }] }),
    db.commerceExchangeRate.findFirst({ where: { currency: "EUR" }, orderBy: { date: "desc" } }),
    db.$queryRaw<Array<{ brand: string }>>`SELECT brand FROM "CommerceProduct" WHERE brand IS NOT NULL AND brand <> '' GROUP BY brand ORDER BY count(*) DESC LIMIT 200`,
  ])

  // Category options with "Parent › Child" labels and descendants (a rule on a parent also covers its children)
  const byId = new Map(cats.map((c) => [c.id, c]))
  const label = (id: string): string => { const c = byId.get(id)!; return c.parentId && byId.has(c.parentId) ? `${label(c.parentId)} › ${c.nameRo}` : c.nameRo }
  const options: CategoryOpt[] = cats.map((c) => {
    const desc = [c.id]
    for (let i = 0; i < desc.length; i++) for (const k of cats) if (k.parentId === desc[i]) desc.push(k.id)
    return { id: c.id, label: label(c.id), descendants: desc }
  }).sort((a, b) => a.label.localeCompare(b.label, "ro"))

  const rows: RuleRow[] = rules.map((r) => ({
    id: r.id, name: r.name, priority: r.priority, categoryId: r.categoryId, brand: r.brand, quality: r.quality,
    costMin: r.costMin != null ? Number(r.costMin) : null, costMax: r.costMax != null ? Number(r.costMax) : null,
    markupPct: Number(r.markupPct), minMarginRon: r.minMarginRon != null ? Number(r.minMarginRon) : null,
    bulkySurchargeRon: Number(r.bulkySurchargeRon), competitorUndercutRon: r.competitorUndercutRon != null ? Number(r.competitorUndercutRon) : null,
    isActive: r.isActive, appliedTo: r._count.listings,
  }))

  return (
    <div className="flex flex-col gap-6 p-8 max-w-6xl">
      <div>
        <Link href={`/commerce/${businessLineId}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3">
          <ArrowLeft className="h-4 w-4" /> Setări canal
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Reguli de preț — {channel.businessLine.name}</h1>
        <p className="text-muted-foreground">Prima regulă potrivită (prioritate mare → mică) înlocuiește markup-ul implicit și marja minimă din setările canalului.</p>
      </div>
      {parsePriceSyncSettings(channel.config).enabled && (
        <div className="rounded-md border border-amber-500/50 bg-amber-500/10 p-3 text-sm">
          Prețurile sunt gestionate de <Link href="/commerce/sync" className="font-medium underline">sincronizarea cu furnizorul</Link>: regulile de preț și recalcularea de aici nu mai modifică prețurile din catalog.
        </div>
      )}
      <RulesManager
        businessLineId={businessLineId}
        rules={rows}
        categories={options}
        brands={brands.map((b) => b.brand)}
        channel={{ vatRate: Number(channel.vatRate), transportPct: Number(channel.transportPct), defaultMarkupPct: Number(channel.defaultMarkupPct), minMarginRon: Number(channel.minMarginRon), roundingMode: channel.roundingMode }}
        eurRate={eur ? Number(eur.rate) : null}
      />
    </div>
  )
}

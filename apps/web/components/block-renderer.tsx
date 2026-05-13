"use client"

import { useState } from "react"
import type {
  OfferBlock, TextBlockData, FeaturesBlockData, EquipmentBlockData,
  PricingBlockData, PackagesBlockData, TimelineBlockData,
  StatsBlockData, KeywordResearchBlockData, ServicesBlockData, FAQBlockData
} from "@repo/mock-data"
import { cn, formatCurrency } from "@/lib/utils"
import {
  CheckCircle2, Star, Zap, Lightbulb, Flame, ChevronDown, ChevronUp,
  TrendingUp, Target, Globe, Settings, FileText,
} from "lucide-react"

/**
 * Universal offer block renderer.
 * Renders any OfferBlock as a styled, self-contained card.
 *
 * @param variant - "dashboard" for the admin single-offer page (dark),
 *                  "public" for the client-facing public page (light, optimistic)
 */
// Get the full card class for a block's public variant — all classes must be written
// out fully (no interpolation) so Tailwind JIT can detect and generate them.
function getPublicCardClass(type: string): string {
  switch (type) {
    case "text":             return "bg-white rounded-2xl shadow-xl p-6 md:p-8 border-2 border-orange-300 hover:shadow-2xl transition-all"
    case "stats":            return "bg-white rounded-2xl shadow-xl p-6 md:p-8 border-2 border-orange-200 hover:shadow-2xl transition-all"
    case "services":         return "bg-white rounded-2xl shadow-xl p-6 md:p-8 border-2 border-orange-200 hover:shadow-2xl transition-all"
    case "features":         return "bg-white rounded-2xl shadow-xl p-6 md:p-8 border-2 border-orange-200 hover:shadow-2xl transition-all"
    case "equipment":        return "bg-white rounded-2xl shadow-xl p-6 md:p-8 border-2 border-blue-200 hover:shadow-2xl transition-all"
    case "pricing":          return "bg-white rounded-2xl shadow-xl p-6 md:p-8 border-2 border-green-200 hover:shadow-2xl transition-all"
    case "packages":         return "bg-white rounded-2xl shadow-xl p-6 md:p-8 border-2 border-orange-200 hover:shadow-2xl transition-all"
    case "timeline":         return "bg-white rounded-2xl shadow-xl p-6 md:p-8 border-2 border-purple-200 hover:shadow-2xl transition-all"
    case "keyword_research": return "bg-white rounded-2xl shadow-xl p-6 md:p-8 border-2 border-blue-200 hover:shadow-2xl transition-all"
    case "faq":              return "bg-white rounded-2xl shadow-xl p-6 md:p-8 border-2 border-orange-200 hover:shadow-2xl transition-all"
    default:                 return "bg-white rounded-2xl shadow-xl p-6 md:p-8 border-2 border-orange-200 hover:shadow-2xl transition-all"
  }
}

export function BlockRenderer({ block, variant = "dashboard" }: { block: OfferBlock; variant?: "dashboard" | "public" }) {
  const isPublic = variant === "public"

  const card = isPublic
    ? getPublicCardClass(block.type)
    : "bg-surface rounded-xl border border-border p-4"

  const titleCn = isPublic ? "text-3xl font-bold text-gray-900" : "text-sm font-semibold text-foreground"
  const subtitleCn = isPublic ? "text-lg text-gray-600" : "text-[11px] text-muted-foreground"

  return (
    <div className={card}>
      {/* Header */}
      <div className="mb-6">
        <h3 className={cn(titleCn, isPublic && "text-center")}>{block.title}</h3>
        {block.subtitle && <p className={cn(subtitleCn, "mt-2", isPublic && "text-center max-w-3xl mx-auto")}>{block.subtitle}</p>}
      </div>

      {/* Block Content */}
      {block.type === "text" && <TextBlock data={block.data as TextBlockData} variant={variant} />}
      {block.type === "features" && <FeaturesBlock data={block.data as FeaturesBlockData} variant={variant} />}
      {block.type === "equipment" && <EquipmentBlock data={block.data as EquipmentBlockData} variant={variant} />}
      {block.type === "pricing" && <PricingBlock data={block.data as PricingBlockData} variant={variant} />}
      {block.type === "packages" && <PackagesBlock data={block.data as PackagesBlockData} variant={variant} />}
      {block.type === "timeline" && <TimelineBlock data={block.data as TimelineBlockData} variant={variant} />}
      {block.type === "stats" && <StatsBlock data={block.data as StatsBlockData} variant={variant} />}
      {block.type === "keyword_research" && <KeywordResearchBlock data={block.data as KeywordResearchBlockData} variant={variant} />}
      {block.type === "services" && <ServicesBlock data={block.data as ServicesBlockData} variant={variant} />}
      {block.type === "faq" && <FAQBlock data={block.data as FAQBlockData} variant={variant} />}
    </div>
  )
}

/* ═══ ICON MAP ═══ */

const iconMap: Record<string, React.ElementType> = {
  TrendingUp, Target, Globe, Settings, FileText,
}

/* ═══ TEXT ═══ */

function TextBlock({ data, variant }: { data: TextBlockData; variant: string }) {
  const isPublic = variant === "public"
  if (isPublic) {
    return (
      <div className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl">
        <p className="text-base text-gray-700 leading-relaxed">{data.content}</p>
      </div>
    )
  }
  return <p className="text-xs text-muted-foreground leading-relaxed">{data.content}</p>
}

/* ═══ STATS ═══ */

function StatsBlock({ data, variant }: { data: StatsBlockData; variant: string }) {
  const isPublic = variant === "public"
  const colorMap: Record<string, { bg: string; border: string; text: string }> = {
    orange: { bg: "from-orange-50 to-amber-50", border: "border-orange-200", text: "text-orange-600" },
    green:  { bg: "from-green-50 to-emerald-50", border: "border-green-200", text: "text-green-600" },
    blue:   { bg: "from-blue-50 to-indigo-50", border: "border-blue-200", text: "text-blue-600" },
    purple: { bg: "from-purple-50 to-pink-50", border: "border-purple-200", text: "text-purple-600" },
    red:    { bg: "from-red-50 to-rose-50", border: "border-red-200", text: "text-red-600" },
    indigo: { bg: "from-indigo-50 to-violet-50", border: "border-indigo-200", text: "text-indigo-600" },
  }
  const cols = data.items.length

  if (isPublic) {
    return (
      <div className={cn("grid gap-4", cols >= 4 ? "md:grid-cols-4" : cols === 3 ? "md:grid-cols-3" : "md:grid-cols-2")}>
        {data.items.map((item, i) => {
          const c = colorMap[item.color || "blue"] || colorMap.blue!
          return (
            <div key={i} className={cn("text-center p-5 rounded-xl border", `bg-gradient-to-br ${c.bg} ${c.border}`)}>
              <div className={cn("text-2xl md:text-3xl font-bold mb-2", c.text)}>{item.value}</div>
              <div className="text-sm font-medium text-gray-700">{item.label}</div>
              {item.sublabel && <div className="text-xs text-gray-500 mt-1">{item.sublabel}</div>}
            </div>
          )
        })}
      </div>
    )
  }
  // Dashboard
  return (
    <div className={cn("grid gap-3", cols >= 4 ? "md:grid-cols-4" : "md:grid-cols-2")}>
      {data.items.map((item, i) => (
        <div key={i} className="bg-muted/30 rounded-lg p-3 text-center border border-border/50">
          <p className="text-lg font-bold text-foreground">{item.value}</p>
          <p className="text-[10px] text-muted-foreground">{item.label}</p>
        </div>
      ))}
    </div>
  )
}

/* ═══ SERVICES ═══ */

function ServicesBlock({ data, variant }: { data: ServicesBlockData; variant: string }) {
  const isPublic = variant === "public"
  const cols = data.services.length

  if (isPublic) {
    return (
      <div className={cn("grid gap-6", cols >= 3 ? "md:grid-cols-2" : "md:grid-cols-2")}>
        {data.services.map((svc, idx) => {
          const IconComp = svc.icon ? iconMap[svc.icon] : null
          const isIncluded = svc.included
          return (
            <div key={idx} className={cn(
              "p-6 rounded-xl border-2",
              isIncluded
                ? "bg-gradient-to-br from-green-50 to-emerald-50 border-green-300"
                : "bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200"
            )}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {IconComp && <IconComp className={cn("h-7 w-7", isIncluded ? "text-green-600" : "text-orange-600")} />}
                  <h4 className="text-lg font-bold text-gray-900">{svc.title}</h4>
                </div>
                {svc.badge && (
                  <span className={cn("px-3 py-1 text-xs font-bold rounded-full text-white", isIncluded ? "bg-green-600" : "bg-orange-600")}>
                    {svc.badge}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 mb-4">{svc.description}</p>
              <div className="space-y-2">
                {svc.features.map((f, fi) => (
                  <div key={fi} className="flex items-start gap-2">
                    <CheckCircle2 size={16} className={cn("mt-0.5 flex-shrink-0", isIncluded ? "text-green-600" : "text-orange-600")} />
                    <span className="text-sm text-gray-700">{f}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // Dashboard
  return (
    <div className={cn("grid gap-3", cols >= 3 ? "md:grid-cols-2" : "grid-cols-1")}>
      {data.services.map((svc, idx) => (
        <div key={idx} className="bg-muted/20 rounded-lg p-3 border border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <p className="text-xs font-bold text-foreground">{svc.title}</p>
            {svc.badge && <span className="px-1.5 py-0.5 text-[8px] font-bold uppercase bg-emerald-500/10 text-emerald-400 rounded">{svc.badge}</span>}
          </div>
          <p className="text-[10px] text-muted-foreground mb-2">{svc.description}</p>
          <ul className="space-y-1">
            {svc.features.slice(0, 4).map((f, fi) => (
              <li key={fi} className="flex items-start gap-1.5">
                <CheckCircle2 size={8} className="mt-0.5 text-emerald-500 flex-shrink-0" />
                <span className="text-[10px] text-muted-foreground">{f}</span>
              </li>
            ))}
            {svc.features.length > 4 && <li className="text-[9px] text-muted-foreground/50">+{svc.features.length - 4} mai mult</li>}
          </ul>
        </div>
      ))}
    </div>
  )
}

/* ═══ KEYWORD RESEARCH ═══ */

function KeywordResearchBlock({ data, variant }: { data: KeywordResearchBlockData; variant: string }) {
  const isPublic = variant === "public"

  if (isPublic) {
    return (
      <div className="space-y-6">
        {/* Insight Box */}
        {data.insight && (
          <div className="p-6 bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-300 rounded-xl">
            <h4 className="flex items-center text-lg font-bold text-orange-900 mb-4">
              <Flame className="h-5 w-5 text-orange-600 mr-2" />
              {data.insight.title}
            </h4>
            <div className="space-y-2 mb-4">
              {data.insight.findings.map((f, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-orange-600 font-bold">✓</span>
                  <span className="text-sm text-gray-700">{f}</span>
                </div>
              ))}
            </div>
            <p className="flex items-center text-sm font-semibold text-orange-900 bg-white/50 p-3 rounded-lg">
              <Lightbulb className="h-5 w-5 text-orange-600 mr-2 flex-shrink-0" />
              {data.insight.conclusion}
            </p>
          </div>
        )}

        {/* Markets */}
        {data.markets.map((market, idx) => (
          <div key={idx} className="border-2 border-blue-200 rounded-xl p-6 bg-gradient-to-br from-blue-50 to-indigo-50">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-xl font-bold text-gray-900">{market.country}</h4>
                <p className="text-sm text-gray-600">Limba: {market.language}</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-600">{market.totalVolume}</div>
                <div className="text-xs text-gray-600">căutări/lună</div>
                <div className="text-sm font-semibold text-green-600 mt-1">CPC: {market.avgCPC}</div>
                <span className={cn("text-xs font-bold mt-1 inline-block px-2 py-1 rounded-full",
                  market.opportunity === "EXTREM DE RIDICAT" ? "bg-emerald-100 text-emerald-800" :
                  market.opportunity === "RIDICAT" ? "bg-green-100 text-green-700" :
                  "bg-blue-100 text-blue-700"
                )}>{market.opportunity}</span>
              </div>
            </div>

            {market.strategyHighlight && (
              <div className="mb-4 bg-white/60 p-4 rounded-lg border border-indigo-200">
                <div className="flex items-start gap-2">
                  <Lightbulb className="h-5 w-5 text-indigo-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-700">
                    <strong className="text-indigo-800">Insight Avansat:</strong> {market.strategyHighlight}
                  </p>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-blue-300">
                    <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700">Cuvânt Cheie</th>
                    <th className="text-right py-2 px-3 text-sm font-semibold text-gray-700">Volum/Lună</th>
                    <th className="text-center py-2 px-3 text-sm font-semibold text-gray-700">Competiție</th>
                    <th className="text-right py-2 px-3 text-sm font-semibold text-gray-700">CPC</th>
                  </tr>
                </thead>
                <tbody>
                  {market.keywords.map((kw, ki) => (
                    <tr key={ki} className="border-b border-blue-200 hover:bg-blue-100 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-medium text-gray-900">{kw.term}</div>
                        {kw.translation && <div className="text-xs text-gray-500 italic mt-0.5">{kw.translation}</div>}
                      </td>
                      <td className="py-3 px-3 text-right text-blue-600 font-semibold">{kw.volume}</td>
                      <td className="py-3 px-3 text-center">
                        <span className={cn("px-2 py-1 rounded-full text-xs font-semibold",
                          kw.competition === "LOW" ? "bg-green-100 text-green-700" :
                          kw.competition === "MEDIUM" ? "bg-yellow-100 text-yellow-700" :
                          "bg-red-100 text-red-700"
                        )}>{kw.competition}</span>
                      </td>
                      <td className="py-3 px-3 text-right text-gray-700">{kw.cpc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        {/* Data source note */}
        {data.dataSource && (
          <div className="p-4 bg-green-100 border-2 border-green-300 rounded-xl flex items-start gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-gray-700">
              <strong>Date Reale:</strong> {data.dataSource}. {data.methodology}
            </p>
          </div>
        )}
      </div>
    )
  }

  // Dashboard — compact
  return (
    <div className="space-y-3">
      {data.insight && (
        <div className="p-3 bg-orange-500/5 border border-orange-500/20 rounded-lg">
          <p className="text-[10px] font-semibold text-foreground mb-1">{data.insight.title}</p>
          <p className="text-[10px] text-muted-foreground">{data.insight.conclusion}</p>
        </div>
      )}
      <div className="grid md:grid-cols-2 gap-2">
        {data.markets.slice(0, 4).map((m, i) => (
          <div key={i} className="bg-muted/20 rounded-lg p-2.5 border border-border/50">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-foreground">{m.country}</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">{m.opportunity}</span>
            </div>
            <p className="text-[10px] text-muted-foreground">{m.totalVolume} căutări • CPC: {m.avgCPC}</p>
          </div>
        ))}
      </div>
      {data.markets.length > 4 && <p className="text-[9px] text-muted-foreground/50">+{data.markets.length - 4} piețe adiționale</p>}
    </div>
  )
}

/* ═══ FAQ ═══ */

function FAQBlock({ data, variant }: { data: FAQBlockData; variant: string }) {
  const isPublic = variant === "public"
  const [expanded, setExpanded] = useState<number | null>(null)

  if (isPublic) {
    return (
      <div className="space-y-4">
        {data.items.map((item, i) => (
          <div key={i} className="border-2 border-orange-200 rounded-xl overflow-hidden">
            <button
              onClick={() => setExpanded(expanded === i ? null : i)}
              className="w-full flex items-center justify-between p-5 bg-gradient-to-r from-orange-50 to-amber-50 hover:from-orange-100 hover:to-amber-100 transition-colors text-left"
            >
              <span className="font-semibold text-gray-900 pr-4">{item.question}</span>
              {expanded === i ? <ChevronUp className="h-5 w-5 text-orange-600 flex-shrink-0" /> : <ChevronDown className="h-5 w-5 text-orange-600 flex-shrink-0" />}
            </button>
            {expanded === i && (
              <div className="p-5 bg-white border-t border-orange-200">
                <p className="text-sm text-gray-700 leading-relaxed">{item.answer}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    )
  }

  // Dashboard
  return (
    <div className="space-y-2">
      {data.items.map((item, i) => (
        <div key={i} className="bg-muted/20 rounded-lg p-2.5 border border-border/50">
          <p className="text-[10px] font-semibold text-foreground">{item.question}</p>
          <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{item.answer}</p>
        </div>
      ))}
    </div>
  )
}

/* ═══ FEATURES ═══ */

function FeaturesBlock({ data, variant }: { data: FeaturesBlockData; variant: string }) {
  const isPublic = variant === "public"

  const categoryColors = [
    { bg: "from-green-50 to-emerald-50", border: "border-green-200", icon: "text-green-600", title: "text-green-800" },
    { bg: "from-blue-50 to-indigo-50", border: "border-blue-200", icon: "text-blue-600", title: "text-blue-800" },
    { bg: "from-purple-50 to-pink-50", border: "border-purple-200", icon: "text-purple-600", title: "text-purple-800" },
    { bg: "from-orange-50 to-amber-50", border: "border-orange-200", icon: "text-orange-600", title: "text-orange-800" },
    { bg: "from-cyan-50 to-teal-50", border: "border-cyan-200", icon: "text-cyan-600", title: "text-cyan-800" },
  ]

  return (
    <div className={cn("grid gap-4", data.categories.length > 2 ? "md:grid-cols-3" : data.categories.length === 2 ? "md:grid-cols-2" : "grid-cols-1")}>
      {data.categories.map((cat, idx) => {
        const color = isPublic ? categoryColors[idx % categoryColors.length]! : null
        return (
          <div key={cat.name} className={cn(
            "rounded-xl p-5 border-2",
            isPublic ? `bg-gradient-to-br ${color!.bg} ${color!.border}` : "bg-muted/30 border-border/50"
          )}>
            <p className={cn("text-sm font-bold mb-3", isPublic ? color!.title : "text-foreground")}>{cat.name}</p>
            <ul className="space-y-2">
              {cat.items.map((item, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <CheckCircle2 size={isPublic ? 16 : 10} className={cn("mt-0.5 flex-shrink-0", isPublic ? color!.icon : "text-emerald-500")} />
                  <span className={cn(isPublic ? "text-sm text-gray-700" : "text-[11px] text-muted-foreground leading-snug")}>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )
      })}
    </div>
  )
}

/* ═══ EQUIPMENT ═══ */

function EquipmentBlock({ data, variant }: { data: EquipmentBlockData; variant: string }) {
  const isPublic = variant === "public"
  const currency = data.currency || "EUR"
  return (
    <div className={cn("overflow-x-auto", isPublic && "border-2 border-blue-200 rounded-xl")}>
      <table className="w-full text-left">
        <thead>
          <tr className={cn(isPublic ? "bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-blue-300" : "border-b border-border")}>
            <th className={cn("py-3 px-4 font-semibold", isPublic ? "text-sm text-gray-700" : "text-[10px] uppercase tracking-wider text-muted-foreground")}>Denumire</th>
            <th className={cn("py-3 px-4 font-semibold text-center w-16", isPublic ? "text-sm text-gray-700" : "text-[10px] uppercase tracking-wider text-muted-foreground")}>Cant.</th>
            <th className={cn("py-3 px-4 font-semibold text-right w-24", isPublic ? "text-sm text-gray-700" : "text-[10px] uppercase tracking-wider text-muted-foreground")}>Preț/buc</th>
            <th className={cn("py-3 px-4 font-semibold text-right w-24", isPublic ? "text-sm text-gray-700" : "text-[10px] uppercase tracking-wider text-muted-foreground")}>Total</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((item, i) => (
            <tr key={i} className={cn(isPublic ? "border-b border-blue-100 hover:bg-blue-50 transition-colors" : "border-b border-border/30")}>
              <td className={cn("py-3 px-4", isPublic ? "text-sm font-medium text-gray-900" : "text-xs text-foreground")}>{item.name}</td>
              <td className={cn("py-3 px-4 text-center", isPublic ? "text-sm text-gray-600" : "text-xs text-muted-foreground")}>{item.qty}</td>
              <td className={cn("py-3 px-4 text-right font-mono", isPublic ? "text-sm text-gray-600" : "text-xs text-muted-foreground")}>{formatCurrency(item.unitPrice)}</td>
              <td className={cn("py-3 px-4 text-right font-mono font-semibold", isPublic ? "text-sm text-blue-600" : "text-xs text-foreground")}>{formatCurrency(item.qty * item.unitPrice)}</td>
            </tr>
          ))}
        </tbody>
        {data.subtotal != null && (
          <tfoot>
            <tr className={cn(isPublic ? "bg-blue-50" : "")}>
              <td colSpan={3} className={cn("py-3 px-4 font-semibold text-right", isPublic ? "text-sm text-gray-700" : "text-xs text-foreground")}>Subtotal</td>
              <td className={cn("py-3 px-4 text-right font-mono font-bold", isPublic ? "text-lg text-blue-600" : "text-xs text-foreground")}>{formatCurrency(data.subtotal)} {currency}</td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}

/* ═══ PRICING ═══ */

function PricingBlock({ data, variant }: { data: PricingBlockData; variant: string }) {
  const isPublic = variant === "public"

  if (isPublic) {
    return (
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border-2 border-green-200">
        <div className="space-y-3">
          {data.lines.map((line, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-green-200 last:border-0">
              <span className="text-sm text-gray-700">{line.label}</span>
              <span className={cn("text-sm font-mono font-semibold", line.amount === 0 ? "text-green-600" : "text-gray-900")}>
                {line.amount === 0 ? "INCLUS ✓" : `${formatCurrency(line.amount)} ${data.currency}`}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t-2 border-green-300 flex items-center justify-between">
          <span className="text-lg font-bold text-gray-900">{data.totalLabel || "Total"}</span>
          <span className="text-2xl font-bold text-green-600 font-mono">{formatCurrency(data.total)} {data.currency}</span>
        </div>
        {data.note && (
          <div className="mt-3 p-3 bg-green-100 border border-green-300 rounded-lg flex items-start gap-2">
            <Lightbulb size={14} className="text-green-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-gray-700">{data.note}</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-lg p-4 bg-muted/30 border border-border/50">
      <div className="space-y-2">
        {data.lines.map((line, i) => (
          <div key={i} className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{line.label}</span>
            <span className={cn("text-xs font-mono", line.amount === 0 ? "text-emerald-500" : "text-foreground")}>
              {line.amount === 0 ? "INCLUS" : `${formatCurrency(line.amount)} ${data.currency}`}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">{data.totalLabel || "Total"}</span>
        <span className="text-lg font-bold font-mono text-foreground">{formatCurrency(data.total)} {data.currency}</span>
      </div>
      {data.note && <p className="mt-2 text-[10px] text-muted-foreground">{data.note}</p>}
    </div>
  )
}

/* ═══ PACKAGES ═══ */

function PackagesBlock({ data, variant }: { data: PackagesBlockData; variant: string }) {
  const isPublic = variant === "public"
  const cols = data.packages.length

  if (isPublic) {
    return (
      <div>
        {/* Orange gradient wrapper like real ASNS offers */}
        <div className="bg-gradient-to-br from-orange-600 to-amber-600 rounded-xl p-6 md:p-8">
          <div className={cn("grid gap-6", cols >= 3 ? "md:grid-cols-3" : cols === 2 ? "md:grid-cols-2" : "grid-cols-1")}>
            {data.packages.map((pkg) => (
              <div key={pkg.name}
                className={cn(
                  "rounded-xl p-6 bg-white transition-all relative",
                  pkg.recommended
                    ? "ring-4 ring-yellow-400 shadow-2xl scale-[1.02]"
                    : "hover:shadow-xl"
                )}
              >
                {pkg.badge && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className={cn(
                      "flex items-center gap-1 px-4 py-1 text-xs font-bold rounded-full shadow-lg whitespace-nowrap",
                      pkg.recommended
                        ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white"
                        : "bg-gray-200 text-gray-700"
                    )}>
                      {pkg.recommended && <Star size={12} className="fill-current text-yellow-300" />}
                      {pkg.badge}
                    </span>
                  </div>
                )}
                <div className="text-center mb-5 pt-2">
                  <h4 className="text-lg font-bold text-gray-900 mb-2">{pkg.name}</h4>
                  <div className="text-2xl font-bold text-orange-600 mb-1">{pkg.price}</div>
                  {pkg.setupFee && <p className="text-sm text-gray-500">+ Setup: {pkg.setupFee}</p>}
                </div>
                <div className="space-y-2.5 mb-5">
                  {pkg.features.map((f, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <CheckCircle2 size={16} className={cn("mt-0.5 flex-shrink-0", pkg.recommended ? "text-green-600" : "text-orange-500")} />
                      <span className="text-sm text-gray-700">{f}</span>
                    </div>
                  ))}
                </div>
                {pkg.ideal && (
                  <div className="pt-3 border-t border-orange-200 flex items-start gap-2">
                    <Lightbulb size={14} className="text-orange-500 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-gray-600 italic">Ideal: {pkg.ideal}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        {data.note && (
          <div className="mt-4 p-4 bg-orange-50 border-2 border-orange-200 rounded-xl flex items-start gap-2">
            <Lightbulb size={16} className="text-orange-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-gray-700"><strong>Important:</strong> {data.note}</p>
          </div>
        )}
      </div>
    )
  }

  // Dashboard variant
  return (
    <div>
      <div className={cn("grid gap-3", cols >= 3 ? "md:grid-cols-3" : cols === 2 ? "md:grid-cols-2" : "grid-cols-1")}>
        {data.packages.map((pkg) => (
          <div key={pkg.name}
            className={cn(
              "rounded-xl p-4 border transition-all relative",
              pkg.recommended ? "bg-primary/5 border-primary/30 ring-1 ring-primary/20" : "bg-muted/20 border-border/50 hover:border-border"
            )}
          >
            {pkg.badge && (
              <span className={cn(
                "absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 text-[8px] font-bold uppercase rounded-full",
                pkg.recommended ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}>{pkg.badge}</span>
            )}
            <p className="text-sm font-bold mb-1 text-foreground">{pkg.name}</p>
            <p className={cn("text-lg font-bold font-mono mb-1", pkg.recommended ? "text-primary" : "text-foreground")}>{pkg.price}</p>
            {pkg.setupFee && <p className="text-[10px] mb-3 text-muted-foreground">Setup: {pkg.setupFee}</p>}
            <ul className="space-y-1.5 mb-3">
              {pkg.features.slice(0, 6).map((f, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <CheckCircle2 size={9} className={cn("mt-0.5 flex-shrink-0", pkg.recommended ? "text-primary" : "text-muted-foreground/50")} />
                  <span className="text-[10px] text-muted-foreground leading-snug">{f}</span>
                </li>
              ))}
              {pkg.features.length > 6 && <li className="text-[9px] text-muted-foreground/50">+{pkg.features.length - 6} mai mult</li>}
            </ul>
            {pkg.ideal && (
              <p className="text-[9px] pt-2 border-t border-border/50 text-muted-foreground">
                <Star size={7} className="inline mr-1" /> Ideal: {pkg.ideal}
              </p>
            )}
          </div>
        ))}
      </div>
      {data.note && <p className="mt-3 text-[10px] text-muted-foreground">{data.note}</p>}
    </div>
  )
}

/* ═══ TIMELINE ═══ */

function TimelineBlock({ data, variant }: { data: TimelineBlockData; variant: string }) {
  const isPublic = variant === "public"

  if (isPublic) {
    return (
      <div className={cn("grid gap-6", data.steps.length >= 4 ? "md:grid-cols-4" : data.steps.length === 3 ? "md:grid-cols-3" : "md:grid-cols-2")}>
        {data.steps.map((step) => (
          <div key={step.step} className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-5 border-2 border-purple-200 h-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-purple-600 text-white rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0">{step.step}</div>
              <div>
                <h4 className="font-bold text-gray-900">{step.title}</h4>
                {step.duration && <p className="text-xs text-purple-600 font-medium">{step.duration}</p>}
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-3">{step.description}</p>
            {step.deliverables && (
              <div className="space-y-1.5">
                {step.deliverables.map((d, j) => (
                  <div key={j} className="flex items-start gap-2">
                    <Zap size={14} className="text-purple-600 mt-0.5 flex-shrink-0" />
                    <span className="text-xs text-gray-700">{d}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    )
  }

  // Dashboard variant
  return (
    <div className="relative">
      <div className="absolute left-[11px] top-3 bottom-3 w-px bg-border" />
      <div className="space-y-4">
        {data.steps.map((step) => (
          <div key={step.step} className="flex items-start gap-3 relative">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 z-10 bg-primary/10 text-primary border border-primary/20">{step.step}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-xs font-semibold text-foreground">{step.title}</p>
                {step.duration && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{step.duration}</span>}
              </div>
              <p className="text-[11px] text-muted-foreground">{step.description}</p>
              {step.deliverables && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {step.deliverables.map((d, j) => (
                    <span key={j} className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{d}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

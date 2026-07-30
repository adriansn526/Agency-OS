"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { cn, formatCurrency } from "@/lib/utils"
import { DateRangePicker } from "@/components/date-range-picker"
import {
  Activity,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Loader2,
  AlertTriangle,
  Zap,
  BarChart3,
  ArrowRight,
  Building2,
  RefreshCw,
  Info,
  CheckCircle2,
  Sparkles,
  Phone,
  Bot,
} from "lucide-react"

/* ============================================================
   Types
   ============================================================ */

interface ProviderCost {
  provider: string
  totalUsd: number
  totalEur: number
  source: "api" | "estimated" | "balance"
  details: Record<string, any>
}

interface TenantCost {
  tenantId: string
  name: string
  slug: string
  plan: string
  planLabel: string
  status: string
  monthlyTokens: number
  estimatedCostUsd: number
  estimatedCostEur: number
  subscriptionEur: number
  onetimeEur: number | null
  share: number
  realCostUsd: number
  realCostEur: number
}

interface CostData {
  period: { start: string; end: string }
  providers: ProviderCost[]
  costs: { totalUsd: number; totalEur: number; source: string }
  revenue: { monthlySubscriptionsEur: number; onetimePaymentsEur: number }
  perTenant: TenantCost[]
}

/* ============================================================
   Helpers
   ============================================================ */

const planBadgeColors: Record<string, string> = {
  starter: "bg-blue-500/10 text-blue-400",
  pro: "bg-amber-500/10 text-amber-400",
  enterprise: "bg-violet-500/10 text-violet-400",
  onetime: "bg-emerald-500/10 text-emerald-400",
}

const providerIcons: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  openai: { icon: <Bot size={18} />, color: "text-emerald-400", label: "OpenAI" },
  twilio: { icon: <Phone size={18} />, color: "text-red-400", label: "Twilio" },
  gemini: { icon: <Sparkles size={18} />, color: "text-blue-400", label: "Gemini" },
}

const sourceLabels: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  api: { label: "Real", color: "text-success", icon: <CheckCircle2 size={11} /> },
  estimated: { label: "Estimat", color: "text-amber-400", icon: <Zap size={11} /> },
  balance: { label: "Balance", color: "text-blue-400", icon: <Info size={11} /> },
}

/* ============================================================
   KPI Card
   ============================================================ */

function KPICard({
  label,
  value,
  subValue,
  icon,
  color,
  accent,
}: {
  label: string
  value: string
  subValue?: string
  icon: React.ReactNode
  color: string
  accent?: "positive" | "negative" | "neutral"
}) {
  return (
    <div className="bg-surface rounded-xl border border-border p-4">
      <div className="flex items-start justify-between mb-3">
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", color)}>
          {icon}
        </div>
        {accent && accent !== "neutral" && (
          <div
            className={cn(
              "flex items-center gap-0.5 text-xs font-semibold",
              accent === "positive" ? "text-success" : "text-destructive"
            )}
          >
            {accent === "positive" ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-foreground tracking-tight">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
      {subValue && <p className="text-[10px] text-muted-foreground/70 mt-0.5">{subValue}</p>}
    </div>
  )
}

/* ============================================================
   Provider Card
   ============================================================ */

function ProviderCard({ provider }: { provider: ProviderCost }) {
  const defaultInfo = { icon: <Bot size={18} />, color: "text-muted-foreground", label: provider.provider }
  const defaultSource = { label: "N/A", color: "text-muted-foreground", icon: <Info size={11} /> }
  const info = providerIcons[provider.provider] ?? defaultInfo
  const source = sourceLabels[provider.source] ?? defaultSource

  return (
    <div className="bg-surface rounded-xl border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={info.color}>{info.icon}</span>
          <span className="text-sm font-semibold text-foreground">{info.label}</span>
        </div>
        <div className={cn("flex items-center gap-1 text-[10px] font-semibold", source.color)}>
          {source.icon}
          {source.label}
        </div>
      </div>

      {provider.source === "balance" && !provider.details.periodSpend ? (
        <div>
          <p className="text-lg font-bold text-foreground tabular-nums">
            ${(provider.details.balance as number)?.toFixed(2) || "0.00"}
          </p>
          <p className="text-[10px] text-muted-foreground">Balance disponibil</p>
          {provider.details.balanceEur && (
            <p className="text-[10px] text-muted-foreground/70">≈ {formatCurrency(provider.details.balanceEur as number)}</p>
          )}
        </div>
      ) : (
        <div>
          <p className="text-lg font-bold text-foreground tabular-nums">
            {formatCurrency(provider.totalEur)}
          </p>
          <p className="text-[10px] text-muted-foreground">${provider.totalUsd.toFixed(4)} USD</p>
          {/* Balance info for Twilio */}
          {provider.details.balance != null && (provider.details.balance as number) > 0 && (
            <div className="mt-2 pt-2 border-t border-border/30">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-muted-foreground">Balance rămas</span>
                <span className="text-foreground font-medium tabular-nums">${(provider.details.balance as number).toFixed(2)}</span>
              </div>
            </div>
          )}
          {/* Model breakdown for OpenAI */}
          {provider.details.models && Array.isArray(provider.details.models) && (
            <div className="mt-2 space-y-1">
              {(provider.details.models as any[]).map((m: any, i: number) => (
                <div key={i} className="flex items-center justify-between text-[10px]">
                  <span className="text-muted-foreground">{m.model}</span>
                  <span className="text-foreground font-medium tabular-nums">${m.costUsd.toFixed(4)}</span>
                </div>
              ))}
            </div>
          )}
          {provider.details.error && (
            <p className="text-[10px] text-amber-400 mt-1">⚠ {provider.details.error as string}</p>
          )}
        </div>
      )}
    </div>
  )
}

/* ============================================================
   Profit Bar
   ============================================================ */

function ProfitBar({ revenue, cost, margin }: { revenue: number; cost: number; margin: number }) {
  const costPct = revenue > 0 ? Math.min((cost / revenue) * 100, 100) : 0
  const profitPct = 100 - costPct

  return (
    <div className="bg-surface rounded-xl border border-border p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Profitabilitate AI</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Venituri subscripții vs. cost real AI</p>
        </div>
        <BarChart3 size={18} className="text-muted-foreground" />
      </div>

      {/* Visual Bar */}
      <div className="w-full h-8 rounded-lg overflow-hidden flex bg-muted/30 mb-4">
        <div
          className="h-full bg-gradient-to-r from-success to-success/70 transition-all duration-700 flex items-center justify-center"
          style={{ width: `${profitPct}%` }}
        >
          {profitPct > 15 && (
            <span className="text-[10px] font-bold text-white">Profit</span>
          )}
        </div>
        <div
          className="h-full bg-gradient-to-r from-destructive/60 to-destructive/40 transition-all duration-700 flex items-center justify-center"
          style={{ width: `${costPct}%` }}
        >
          {costPct > 15 && (
            <span className="text-[10px] font-bold text-white">Cost</span>
          )}
        </div>
      </div>

      {/* Numbers */}
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-lg font-bold text-success tabular-nums">{formatCurrency(revenue)}</p>
          <p className="text-[10px] text-muted-foreground">Venituri</p>
        </div>
        <div>
          <p className="text-lg font-bold text-destructive tabular-nums">{formatCurrency(cost)}</p>
          <p className="text-[10px] text-muted-foreground">Cost Real</p>
        </div>
        <div>
          <p className="text-lg font-bold text-foreground tabular-nums">{margin.toFixed(1)}%</p>
          <p className="text-[10px] text-muted-foreground">Marjă</p>
        </div>
      </div>
    </div>
  )
}

/* ============================================================
   Main Page
   ============================================================ */

export default function AIUsagePage() {
  const [data, setData] = useState<CostData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  // Default to current month
  const now = new Date()
  const [dateRange, setDateRange] = useState({
    start: new Date(now.getFullYear(), now.getMonth(), 1),
    end: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
  })

  const fetchData = useCallback(async (range: { start: Date; end: Date }, isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError(null)

    const startStr = `${range.start.getFullYear()}-${String(range.start.getMonth() + 1).padStart(2, "0")}-${String(range.start.getDate()).padStart(2, "0")}`
    const endStr = `${range.end.getFullYear()}-${String(range.end.getMonth() + 1).padStart(2, "0")}-${String(range.end.getDate()).padStart(2, "0")}`

    try {
      const res = await fetch(`/api/intraconstruct/costs?start=${startStr}&end=${endStr}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setData(json)
    } catch (err: any) {
      console.error("[AI Usage] Fetch failed:", err.message)
      setError(err.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchData(dateRange)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleDateChange = (range: { start: Date; end: Date }) => {
    setDateRange(range)
    fetchData(range)
  }

  if (loading) {
    return (
      <div className="p-4 md:p-6 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="text-violet-400 animate-spin" />
          <p className="text-sm text-muted-foreground">Se încarcă costurile AI...</p>
        </div>
      </div>
    )
  }

  const costs = data?.costs
  const providers = data?.providers || []
  const tenants = data?.perTenant || []
  const revenue = data?.revenue

  const totalCostEur = costs?.totalEur || 0
  const totalRevenueEur = (revenue?.monthlySubscriptionsEur || 0)
  const profitEur = totalRevenueEur - totalCostEur
  const margin = totalRevenueEur > 0 ? ((profitEur / totalRevenueEur) * 100) : (totalCostEur === 0 ? 100 : 0)

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Activity size={22} className="text-violet-400" />
            AI Usage & Billing
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Costuri reale, per provider, per tenant — {data?.period?.start} → {data?.period?.end}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DateRangePicker value={dateRange} onChange={handleDateChange} />
          <button
            onClick={() => fetchData(dateRange, true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 bg-surface border border-border text-foreground rounded-lg text-xs font-medium hover:bg-muted transition-colors"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle size={18} className="text-destructive flex-shrink-0" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Source Badge */}
      {costs && (
        <div className={cn(
          "flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs",
          costs.source === "api"
            ? "bg-success/5 border-success/20 text-success"
            : "bg-amber-500/5 border-amber-500/20 text-amber-400"
        )}>
          {costs.source === "api" ? <CheckCircle2 size={14} /> : <Info size={14} />}
          <span className="font-medium">
            {costs.source === "api"
              ? "Costuri reale preluate din API-urile furnizorilor"
              : "Costuri estimate din tokeni consumați — adaugă OPENAI_ADMIN_API_KEY pentru costuri reale"
            }
          </span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard
          label="Cost Total AI"
          value={formatCurrency(totalCostEur)}
          subValue={`$${costs?.totalUsd.toFixed(2) || "0.00"} USD`}
          icon={<Zap size={20} />}
          color="bg-destructive/10 text-destructive"
          accent={totalCostEur > 0 ? "negative" : "neutral"}
        />
        <KPICard
          label="Venituri Subscripții"
          value={formatCurrency(totalRevenueEur)}
          subValue={revenue?.onetimePaymentsEur ? `+ ${formatCurrency(revenue.onetimePaymentsEur)} one-time` : undefined}
          icon={<DollarSign size={20} />}
          color="bg-success/10 text-success"
          accent="positive"
        />
        <KPICard
          label="Profit Net"
          value={formatCurrency(profitEur)}
          subValue={`marjă ${margin.toFixed(1)}%`}
          icon={<TrendingUp size={20} />}
          color="bg-primary/10 text-primary"
          accent={profitEur >= 0 ? "positive" : "negative"}
        />
        <KPICard
          label="Tenanți"
          value={String(tenants.length)}
          subValue={`${tenants.filter(t => t.status === "active").length} activi`}
          icon={<Building2 size={20} />}
          color="bg-amber-500/10 text-amber-500"
        />
      </div>

      {/* Profit Bar */}
      {(totalRevenueEur > 0 || totalCostEur > 0) && (
        <ProfitBar revenue={totalRevenueEur} cost={totalCostEur} margin={margin} />
      )}

      {/* Provider Breakdown */}
      {providers.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Sparkles size={16} className="text-violet-400" />
            Cost per Provider
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {providers.map((p) => (
              <ProviderCard key={p.provider} provider={p} />
            ))}
          </div>
        </div>
      )}

      {/* Per-Tenant Breakdown Table */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <BarChart3 size={16} className="text-violet-400" />
            Cost per Tenant
          </h3>
          <span className="text-[10px] text-muted-foreground">{tenants.length} tenanți</span>
        </div>

        {/* Header */}
        <div className="hidden lg:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_60px] gap-3 px-5 py-3 bg-muted/30 border-b border-border text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <span>Tenant</span>
          <span>Plan</span>
          <span>Tokeni</span>
          <span>Share</span>
          <span>Cost Real</span>
          <span>Venit</span>
          <span />
        </div>

        {/* Rows */}
        {tenants.length === 0 ? (
          <div className="p-8 text-center">
            <Activity size={32} className="text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Niciun tenant înregistrat.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {tenants.map((t) => {
              const planBadge = planBadgeColors[t.plan] || planBadgeColors.starter

              return (
                <Link
                  key={t.tenantId}
                  href={`/intraconstruct/tenants/${t.tenantId}`}
                  className="grid grid-cols-1 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_60px] gap-3 px-5 py-3.5 hover:bg-muted/20 transition-colors group items-center"
                >
                  {/* Name */}
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500/15 to-orange-500/15 flex items-center justify-center text-[10px] font-bold text-amber-500 flex-shrink-0">
                      {t.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate group-hover:text-amber-500 transition-colors">
                        {t.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{t.slug}</p>
                    </div>
                  </div>

                  {/* Plan */}
                  <span className={cn("inline-flex px-2 py-0.5 text-[10px] font-bold uppercase rounded-md w-fit tracking-wider", planBadge)}>
                    {t.planLabel}
                  </span>

                  {/* Tokens */}
                  <span className="text-xs font-semibold text-foreground tabular-nums">
                    {t.monthlyTokens > 0 ? t.monthlyTokens.toLocaleString() : "—"}
                  </span>

                  {/* Share */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-muted/30 rounded-full overflow-hidden max-w-[60px]">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(t.share, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-foreground tabular-nums">
                      {t.share > 0 ? `${t.share}%` : "—"}
                    </span>
                  </div>

                  {/* Cost */}
                  <span className="text-xs font-semibold text-destructive tabular-nums">
                    {t.realCostEur > 0 ? formatCurrency(t.realCostEur) : "—"}
                  </span>

                  {/* Revenue */}
                  <span className="text-xs font-semibold text-success tabular-nums">
                    {t.onetimeEur
                      ? `${formatCurrency(t.onetimeEur)} ¹`
                      : t.subscriptionEur > 0
                        ? `${formatCurrency(t.subscriptionEur)}/lu`
                        : "Gratuit"
                    }
                  </span>

                  {/* Arrow */}
                  <div className="flex justify-end">
                    <ArrowRight size={14} className="text-muted-foreground group-hover:text-amber-500 transition-colors" />
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        {/* Footer with legend */}
        {tenants.some(t => t.onetimeEur) && (
          <div className="px-5 py-2 border-t border-border/50 bg-muted/10">
            <p className="text-[10px] text-muted-foreground">¹ Plată unică — nu generează venit lunar recurent</p>
          </div>
        )}
      </div>
    </div>
  )
}

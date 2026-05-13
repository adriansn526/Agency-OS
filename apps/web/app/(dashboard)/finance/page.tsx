"use client"

import { useState, useMemo } from "react"
import { invoices, retainers, allClients, dashboardStats, agencyStats, fudlyStats, climaticproStats } from "@repo/mock-data"
import { cn, formatCurrency, formatDate } from "@/lib/utils"
import { useBusinessLine } from "@/components/business-line-context"
import { BusinessLineBadge } from "@/components/business-line-switcher"
import { RetainerGrid } from "@/components/retainer-card"
import {
  Receipt,
  TrendingUp,
  TrendingDown,
  FileText,
  Clock,
  AlertTriangle,
  DollarSign,
  Plus,
  Filter,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
} from "lucide-react"

type TabView = "overview" | "retainere" | "facturi"

const statusConfig: Record<string, { label: string; class: string }> = {
  emisa: { label: "Emisă", class: "bg-info/10 text-info" },
  trimisa: { label: "Trimisă", class: "bg-warning/10 text-warning" },
  platita: { label: "Plătită", class: "bg-success/10 text-success" },
  restanta: { label: "Restantă", class: "bg-destructive/10 text-destructive" },
}

const paymentStatusConfig: Record<string, { label: string; class: string }> = {
  la_zi: { label: "La Zi", class: "bg-success/10 text-success" },
  restanta: { label: "Restantă", class: "bg-destructive/10 text-destructive" },
}

export default function FinancePage() {
  const [activeTab, setActiveTab] = useState<TabView>("overview")
  const [invoiceFilter, setInvoiceFilter] = useState("all")
  const { activeLineId, filterData, isAll } = useBusinessLine()

  const getClientName = (clientId: string) => allClients.find((c) => c.id === clientId)?.companyName || "—"

  const blInvoices = useMemo(() => filterData(invoices), [activeLineId])
  const blRetainers = useMemo(() => filterData(retainers), [activeLineId])
  const blClients = useMemo(() => filterData(allClients), [activeLineId])

  // P&L calculations
  const incomeInvoices = blInvoices.filter((i) => !('direction' in i) || (i as any).direction === 'emisa')
  const expenseInvoices = blInvoices.filter((i) => (i as any).direction === 'primita')

  const totalPaid = incomeInvoices.filter((i) => i.status === "platita").reduce((s, i) => s + i.amount, 0)
  const totalPending = incomeInvoices.filter((i) => i.status === "trimisa" || i.status === "emisa").reduce((s, i) => s + i.amount, 0)
  const totalOverdue = blInvoices.filter((i) => i.status === "restanta").reduce((s, i) => s + i.amount, 0)
  const totalExpenses = expenseInvoices.reduce((s, i) => s + i.amount, 0)
  const mrrTotal = blRetainers.filter((r) => r.status === "activ").reduce((s, r) => s + r.monthlyAmount, 0)
  const profitNet = totalPaid - totalExpenses

  const filteredInvoices = invoiceFilter === "all" ? blInvoices : blInvoices.filter((i) => i.status === invoiceFilter)

  const tabs: { value: TabView; label: string }[] = [
    { value: "overview", label: "Overview" },
    { value: "retainere", label: "Retainere" },
    { value: "facturi", label: "Facturi" },
  ]

  return (
    <div className="p-4 md:p-6 space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Financiar</h1>
          <p className="text-sm text-muted-foreground">Facturare, retainere și rapoarte financiare</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors shadow-sm">
          <Plus size={16} /> Factură Nouă
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={cn(
              "px-4 py-1.5 rounded-md text-xs font-medium transition-all",
              activeTab === tab.value ? "bg-surface text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
            )}
          >{tab.label}</button>
        ))}
      </div>

      {/* ========== OVERVIEW ========== */}
      {activeTab === "overview" && (
        <div className="space-y-4">
          {/* P&L Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="bg-surface rounded-xl border border-border p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary"><CreditCard size={20} /></div>
              </div>
              <p className="text-2xl font-bold text-foreground">{formatCurrency(mrrTotal)}</p>
              <p className="text-xs text-muted-foreground mt-1">MRR (Retainere)</p>
            </div>
            <div className="bg-surface rounded-xl border border-border p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center text-success"><ArrowUpRight size={20} /></div>
              </div>
              <p className="text-2xl font-bold text-success">{formatCurrency(totalPaid)}</p>
              <p className="text-xs text-muted-foreground mt-1">Venituri Încasate</p>
            </div>
            <div className="bg-surface rounded-xl border border-border p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center text-destructive"><ArrowDownRight size={20} /></div>
              </div>
              <p className="text-2xl font-bold text-destructive">{formatCurrency(totalExpenses || 0)}</p>
              <p className="text-xs text-muted-foreground mt-1">Cheltuieli</p>
            </div>
            <div className="bg-surface rounded-xl border border-border p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center text-warning"><Clock size={20} /></div>
              </div>
              <p className="text-2xl font-bold text-foreground">{formatCurrency(totalPending)}</p>
              <p className="text-xs text-muted-foreground mt-1">În Așteptare</p>
            </div>
            <div className={cn("bg-surface rounded-xl border p-4", profitNet >= 0 ? "border-success/30" : "border-destructive/30")}>
              <div className="flex items-center justify-between mb-3">
                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", profitNet >= 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive")}>
                  <DollarSign size={20} />
                </div>
              </div>
              <p className={cn("text-2xl font-bold", profitNet >= 0 ? "text-success" : "text-destructive")}>{formatCurrency(profitNet)}</p>
              <p className="text-xs text-muted-foreground mt-1">Profit Net</p>
            </div>
          </div>

          {/* Overdue alert */}
          {totalOverdue > 0 && (
            <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4 flex items-center gap-3">
              <AlertTriangle size={18} className="text-destructive flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">Facturi restante: {formatCurrency(totalOverdue)}</p>
                <p className="text-xs text-muted-foreground">{blInvoices.filter((i) => i.status === "restanta").length} facturi necesită atenție</p>
              </div>
            </div>
          )}

          {/* Top 5 clients by revenue */}
          <div className="bg-surface rounded-xl border border-border p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">Top 5 Clienți (Revenue Lunar)</h3>
            <div className="space-y-3">
              {[...blClients].filter((c) => c.status === "activ" && c.monthlyRevenue > 0).sort((a, b) => b.monthlyRevenue - a.monthlyRevenue).slice(0, 5).map((c, i) => {
                const maxRev = blClients.reduce((m, cl) => Math.max(m, Math.abs(cl.monthlyRevenue)), 1)
                const pct = Math.round((Math.abs(c.monthlyRevenue) / maxRev) * 100)
                return (
                  <div key={c.id} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-medium text-foreground truncate">{c.companyName}</span>
                          {isAll && <BusinessLineBadge lineId={c.businessLine} />}
                        </div>
                        <span className="text-xs font-semibold text-foreground tabular-nums">{formatCurrency(c.monthlyRevenue)}/mo</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========== RETAINERE (v8: upgraded to RetainerGrid) ========== */}
      {activeTab === "retainere" && (
        <div className="space-y-4">
          {/* MRR Summary */}
          <div className="bg-surface rounded-xl border border-border p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">MRR (Monthly Recurring Revenue)</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(mrrTotal)}<span className="text-sm font-normal text-muted-foreground">/lună</span></p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">{blRetainers.filter((r) => r.status === "activ").length} retainere active</p>
              <p className="text-xs text-muted-foreground">{blRetainers.filter((r) => r.paymentStatus === "restanta").length} cu restanță</p>
            </div>
          </div>
          <RetainerGrid retainers={blRetainers} />
        </div>
      )}

      {/* ========== FACTURI ========== */}
      {activeTab === "facturi" && (
        <>
          <div className="flex items-center gap-1.5">
            <Filter size={14} className="text-muted-foreground" />
            {[
              { value: "all", label: "Toate" },
              { value: "emisa", label: "Emise" },
              { value: "trimisa", label: "Trimise" },
              { value: "platita", label: "Plătite" },
              { value: "restanta", label: "Restante" },
            ].map((f) => (
              <button
                key={f.value}
                onClick={() => setInvoiceFilter(f.value)}
                className={cn("px-2 py-1 text-[11px] font-medium rounded-md transition-all", invoiceFilter === f.value ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground hover:text-foreground hover:bg-muted/50")}
              >{f.label}</button>
            ))}
          </div>
          <div className="bg-surface rounded-xl border border-border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="h-10 px-4 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Nr. Factură</th>
                  <th className="h-10 px-4 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Client</th>
                  {isAll && <th className="h-10 px-4 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Business</th>}
                  <th className="h-10 px-4 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Direcție</th>
                  <th className="h-10 px-4 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Sumă</th>
                  <th className="h-10 px-4 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Scadență</th>
                  <th className="h-10 px-4 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((inv) => {
                  const dir = (inv as any).direction || 'emisa'
                  return (
                    <tr key={inv.id} className="border-b border-border/50 hover:bg-muted/30 cursor-pointer transition-colors">
                      <td className="px-4 py-3 text-sm font-mono font-medium text-foreground">{inv.number}</td>
                      <td className="px-4 py-3 text-sm text-foreground">{getClientName(inv.clientId)}</td>
                      {isAll && <td className="px-4 py-3"><BusinessLineBadge lineId={inv.businessLine} /></td>}
                      <td className="px-4 py-3">
                        <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold rounded-md", dir === 'emisa' ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive")}>
                          {dir === 'emisa' ? <><ArrowUpRight size={10} /> Emisă</> : <><ArrowDownRight size={10} /> Primită</>}
                        </span>
                      </td>
                      <td className={cn("px-4 py-3 text-sm font-semibold tabular-nums", dir === 'primita' ? "text-destructive" : "text-foreground")}>{dir === 'primita' ? '-' : ''}{formatCurrency(inv.amount)}</td>
                      <td className="px-4 py-3 text-xs text-foreground-secondary">{formatDate(inv.dueDate)}</td>
                      <td className="px-4 py-3"><span className={cn("px-2 py-0.5 text-[11px] font-semibold rounded-full", statusConfig[inv.status]?.class)}>{statusConfig[inv.status]?.label}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

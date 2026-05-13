"use client"

import { useState, useMemo } from "react"
import { activities, businessLines, filterByBusinessLine } from "@repo/mock-data"
import type { Activity } from "@repo/mock-data"
import { useBusinessLine } from "@/components/business-line-context"
import { BusinessLineBadge } from "@/components/business-line-switcher"
import { cn, formatDate } from "@/lib/utils"
import {
  ClipboardList,
  Filter,
  Search,
  UserPlus,
  FolderPlus,
  Receipt,
  Send,
  AlertTriangle,
  CheckCircle2,
  Package,
  Utensils,
  Wrench,
} from "lucide-react"

const activityIcons: Record<string, { icon: React.ElementType; color: string; bgColor: string }> = {
  lead_nou:              { icon: UserPlus,       color: "text-info",        bgColor: "bg-info/10" },
  client_nou:            { icon: UserPlus,       color: "text-success",     bgColor: "bg-success/10" },
  proiect_start:         { icon: FolderPlus,     color: "text-primary",     bgColor: "bg-primary/10" },
  factura_emisa:         { icon: Receipt,         color: "text-accent",      bgColor: "bg-accent/10" },
  factura_platita:       { icon: CheckCircle2,   color: "text-success",     bgColor: "bg-success/10" },
  contract_semnat:       { icon: Send,           color: "text-primary",     bgColor: "bg-primary/10" },
  lead_pierdut:          { icon: AlertTriangle,  color: "text-destructive", bgColor: "bg-destructive/10" },
  restaurant_onboarded:  { icon: Utensils,       color: "text-orange-500",  bgColor: "bg-orange-500/10" },
  churn_alert:           { icon: AlertTriangle,  color: "text-warning",     bgColor: "bg-warning/10" },
  instalare_completa:    { icon: CheckCircle2,   color: "text-cyan-500",    bgColor: "bg-cyan-500/10" },
  plata_instalator:      { icon: Wrench,         color: "text-cyan-500",    bgColor: "bg-cyan-500/10" },
  comanda_furnizor:      { icon: Package,        color: "text-cyan-500",    bgColor: "bg-cyan-500/10" },
}

export default function ActivityPage() {
  const { activeLine } = useBusinessLine()
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")

  const filtered = useMemo(() => {
    let data = activeLine ? filterByBusinessLine(activities, activeLine.id) : activities
    if (typeFilter !== "all") data = data.filter((a) => a.type === typeFilter)
    if (search) data = data.filter((a) => a.title.toLowerCase().includes(search.toLowerCase()) || a.description.toLowerCase().includes(search.toLowerCase()))
    return data.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }, [activeLine, typeFilter, search])

  const types = [...new Set(activities.map((a) => a.type))]

  return (
    <div className="p-4 md:p-6 space-y-5 animate-fade-in">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <ClipboardList size={20} className="text-primary" />
          <h1 className="text-xl font-bold text-foreground">Activity Log</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Jurnal complet de activitate {activeLine ? `— ${activeLine.name}` : "— toate liniile"}
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Caută activități..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-muted/50 border border-border rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 text-xs font-medium bg-muted/50 border border-border rounded-lg text-foreground"
        >
          <option value="all">Toate Tipurile</option>
          {types.map((t) => (
            <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">{filtered.length} activități</p>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />

        <div className="space-y-1">
          {filtered.map((activity, idx) => {
            const cfg = activityIcons[activity.type] || { icon: ClipboardList, color: "text-muted-foreground", bgColor: "bg-muted" }
            const Icon = cfg.icon
            const prevDate = idx > 0 ? formatDate(filtered[idx - 1]!.timestamp) : null
            const currDate = formatDate(activity.timestamp)
            const showDateSeparator = currDate !== prevDate

            return (
              <div key={activity.id}>
                {showDateSeparator && (
                  <div className="flex items-center gap-3 py-3 pl-12">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{currDate}</span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                )}
                <div className="flex items-start gap-3 py-2 pl-1 relative group hover:bg-muted/20 rounded-lg transition-all px-2">
                  <div className={cn("w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 z-10", cfg.bgColor)}>
                    <Icon size={15} className={cfg.color} />
                  </div>
                  <div className="flex-1 min-w-0 pt-1">
                    <p className="text-sm text-foreground">{activity.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{activity.description}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 pt-1">
                    <BusinessLineBadge lineId={activity.businessLine} />
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {new Date(activity.timestamp).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

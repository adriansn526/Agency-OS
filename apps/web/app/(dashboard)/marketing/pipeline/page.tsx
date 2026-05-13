"use client"

import { useState, useEffect } from "react"
import { useBusinessLine } from "@/components/business-line-context"
import {
  GitBranch, Users, Send, Eye, MousePointerClick,
  Star, CheckCircle, Clock, Building2, Phone, Mail,
  CreditCard,
} from "lucide-react"

interface PipelineLead {
  id: string
  status: string
  uniqueCode: string
  lpOpenCount: number
  lpTimeSpent: number
  sentAt: string | null
  lpOpenedAt: string | null
  convertedAt: string | null
  lead: {
    id: string; companyName: string; contactPerson: string;
    email: string; phone: string | null; city: string | null;
  }
  campaign: { name: string; channel: string }
}

const PIPELINE_STAGES = [
  { key: "pending",    label: "Pregătit",    icon: Clock,           dotColor: "#9ca3af", bgFrom: "from-gray-500/10",    bgTo: "to-gray-600/5",    headerBg: "bg-gray-500/20",  textColor: "text-gray-400",    borderColor: "border-gray-500/20"   },
  { key: "sent",       label: "Trimis",      icon: Send,            dotColor: "#3b82f6", bgFrom: "from-blue-500/10",    bgTo: "to-blue-600/5",    headerBg: "bg-blue-500/20",  textColor: "text-blue-400",    borderColor: "border-blue-500/20"   },
  { key: "delivered",  label: "Livrat",      icon: CheckCircle,     dotColor: "#06b6d4", bgFrom: "from-cyan-500/10",    bgTo: "to-cyan-600/5",    headerBg: "bg-cyan-500/20",  textColor: "text-cyan-400",    borderColor: "border-cyan-500/20"   },
  { key: "opened",     label: "LP Deschis",  icon: Eye,             dotColor: "#f59e0b", bgFrom: "from-amber-500/10",   bgTo: "to-amber-600/5",   headerBg: "bg-amber-500/20", textColor: "text-amber-400",   borderColor: "border-amber-500/20"  },
  { key: "interested", label: "Interesat",   icon: Star,            dotColor: "#a855f7", bgFrom: "from-purple-500/10",  bgTo: "to-purple-600/5",  headerBg: "bg-purple-500/20", textColor: "text-purple-400", borderColor: "border-purple-500/20" },
  { key: "converted",  label: "Convertit",   icon: CreditCard,      dotColor: "#10b981", bgFrom: "from-emerald-500/10", bgTo: "to-emerald-600/5", headerBg: "bg-emerald-500/20", textColor: "text-emerald-400", borderColor: "border-emerald-500/20" },
]

export default function MarketingPipelinePage() {
  const { activeLineId, activeLine } = useBusinessLine()
  const [leads, setLeads] = useState<PipelineLead[]>([])
  const [loading, setLoading] = useState(true)
  const [counts, setCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    loadPipeline()
  }, [activeLineId])

  const loadPipeline = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/marketing/dashboard?businessLine=${activeLineId}`)
      const data = await res.json()

      // Get counts from pipeline stats
      const countsMap: Record<string, number> = {}
      for (const stat of data.data?.pipelineStats || []) {
        countsMap[stat.status] = stat.count
      }
      setCounts(countsMap)

      // Get recent pipeline activity
      setLeads(data.data?.recentActivity || [])
    } catch (err) { console.error(err) }
    setLoading(false)
  }

  const total = Object.values(counts).reduce((s, c) => s + c, 0)

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <GitBranch className="w-6 h-6 text-primary" />
          Pipeline Marketing
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Urmărește lead-urile prin fiecare etapă a funnel-ului · {total} total
        </p>
      </div>

      {/* Funnel Visualization */}
      <div className="bg-card border rounded-xl p-6 shadow-sm">
        <div className="flex items-end gap-2 h-32">
          {PIPELINE_STAGES.map((stage, idx) => {
            const count = counts[stage.key] || 0
            const pct = total > 0 ? (count / total) * 100 : 0
            const height = Math.max(pct, 5)
            return (
              <div key={stage.key} className="flex-1 flex flex-col items-center gap-1">
                <span className={`text-xs font-bold ${stage.textColor}`}>{count}</span>
                <div
                  className="w-full rounded-t-lg transition-all"
                  style={{ height: `${height}%`, backgroundColor: stage.dotColor, opacity: 0.75 }}
                />
                <span className="text-[10px] font-medium text-muted-foreground text-center mt-1">{stage.label}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Conversion note */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg px-4 py-2">
        <CreditCard className="w-3.5 h-3.5" />
        <span><strong>Convertit</strong> = lead-ul a efectuat o plată reală. <strong>Interesat</strong> = a dat click pe CTA din landing page.</span>
      </div>

      {/* Kanban-style columns */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {PIPELINE_STAGES.map(stage => {
            const Icon = stage.icon
            const stageLeads = leads.filter((l: any) => l.status === stage.key)
            const count = counts[stage.key] || 0

            return (
              <div key={stage.key} className={`rounded-xl border ${stage.borderColor} bg-gradient-to-b ${stage.bgFrom} ${stage.bgTo} p-3 min-h-[200px]`}>
                {/* Column header */}
                <div className={`flex items-center gap-2 mb-3 pb-2 border-b ${stage.borderColor}`}>
                  <div className="w-2.5 h-2.5 rounded-full ring-2 ring-offset-1 ring-offset-transparent" style={{ backgroundColor: stage.dotColor, boxShadow: `0 0 8px ${stage.dotColor}40` }} />
                  <span className={`text-xs font-bold uppercase tracking-wider ${stage.textColor}`}>{stage.label}</span>
                  <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${stage.headerBg} ${stage.textColor}`}>{count}</span>
                </div>

                {/* Cards */}
                <div className="space-y-2">
                  {stageLeads.length > 0 ? (
                    stageLeads.slice(0, 8).map((cl: any) => (
                      <div key={cl.id} className="bg-card/90 backdrop-blur-sm rounded-lg p-2.5 shadow-sm border border-border/50 hover:shadow-md hover:border-border transition-all cursor-pointer">
                        <p className="text-xs font-semibold truncate flex items-center gap-1 text-foreground">
                          <Building2 className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                          {cl.lead?.companyName}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{cl.lead?.contactPerson}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${stage.headerBg} ${stage.textColor}`}>{cl.campaign?.channel}</span>
                          <span className="text-[9px] text-muted-foreground truncate">{cl.campaign?.name}</span>
                        </div>
                      </div>
                    ))
                  ) : count > 0 ? (
                    <p className="text-[10px] text-muted-foreground text-center py-4">
                      {count} lead-uri
                    </p>
                  ) : (
                    <p className="text-[10px] text-muted-foreground text-center py-4 opacity-50">
                      —
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

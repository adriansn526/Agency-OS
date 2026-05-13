"use client"

import { useState, useMemo } from "react"
import { cn, formatDate } from "@/lib/utils"
import { CallLogModal } from "@/components/call-log-modal"
import { useAllCommunications, useCommunicationTemplates, useCommunicationStats, useCreateCommunication, type Communication } from "@/lib/hooks/use-communications"
import {
  Phone, Mail, MessageSquare, Video, MessagesSquare,
  BarChart3, FileText, Plus, Search,
  PhoneOutgoing, MailOpen, Timer, TrendingUp,
  ArrowUpRight, ArrowDownLeft, Loader2, Inbox,
} from "lucide-react"

type SubNav = "inbox" | "calls" | "templates" | "analytics"

const channelConfig: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  call: { label: "Apel", icon: Phone, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  whatsapp: { label: "WhatsApp", icon: MessagesSquare, color: "text-green-400", bg: "bg-green-500/10" },
  sms: { label: "SMS", icon: MessageSquare, color: "text-blue-400", bg: "bg-blue-500/10" },
  email: { label: "Email", icon: Mail, color: "text-amber-400", bg: "bg-amber-500/10" },
  video: { label: "Video", icon: Video, color: "text-purple-400", bg: "bg-purple-500/10" },
}

export default function CommunicationsPage() {
  const [activeView, setActiveView] = useState<SubNav>("inbox")
  const [showCallModal, setShowCallModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const { communications, stats: channelStats, total, loading, refetch } = useAllCommunications({ search: searchQuery || undefined })
  const templates = useCommunicationTemplates()
  const globalStats = useCommunicationStats()
  const { create: createComm } = useCreateCommunication()

  const filteredComms = useMemo(() => {
    if (activeView === 'calls') return communications.filter(c => c.channel === 'call')
    return communications
  }, [communications, activeView])

  const views: { value: SubNav; label: string; icon: any; count?: number }[] = [
    { value: "inbox", label: "Toate", icon: Mail, count: total },
    { value: "calls", label: "Apeluri", icon: Phone, count: channelStats.call || 0 },
    { value: "templates", label: "Template-uri", icon: FileText, count: templates.length },
    { value: "analytics", label: "Analytics", icon: BarChart3 },
  ]

  return (
    <>
    <div className="p-4 md:p-6 space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Communication Hub</h1>
          <p className="text-sm text-muted-foreground">Centralizează comunicarea pe toate canalele</p>
        </div>
        <button
          onClick={() => setShowCallModal(true)}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
        >
          <Phone size={12} />
          📞 Apel Nou
        </button>
      </div>

      {/* Sub-nav */}
      <div className="flex items-center gap-1.5 overflow-x-auto">
        {views.map(v => {
          const Icon = v.icon
          return (
            <button
              key={v.value}
              onClick={() => setActiveView(v.value)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-all whitespace-nowrap",
                activeView === v.value
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <Icon size={12} />
              {v.label}
              {v.count !== undefined && (
                <span className="text-[9px] font-bold bg-muted px-1.5 py-0.5 rounded-full">{v.count}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Search */}
      {(activeView === "inbox" || activeView === "calls") && (
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Caută după client sau subiect..."
            className="w-full pl-9 pr-3 py-2.5 bg-surface border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
          />
        </div>
      )}

      {/* ═══ INBOX / CALLS VIEW ═══ */}
      {(activeView === "inbox" || activeView === "calls") && (
        <div className="space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={20} className="animate-spin text-muted-foreground" />
            </div>
          ) : filteredComms.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Inbox size={32} className="mb-3 opacity-50" />
              <p className="text-sm font-medium">Nicio comunicare înregistrată</p>
              <p className="text-xs mt-1">Trimite un contract sau loghează un apel pentru a începe</p>
            </div>
          ) : (
            filteredComms.map(comm => {
              const cc = channelConfig[comm.channel] ?? channelConfig.email!
              const Icon = cc!.icon
              const clientName = comm.client?.companyName || comm.toAddr || 'Necunoscut'
              return (
                <div key={comm.id} className="bg-surface rounded-xl border border-border p-4 hover:border-border/80 transition-colors">
                  <div className="flex items-start gap-3">
                    {/* Channel icon */}
                    <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0", cc!.bg)}>
                      <Icon size={14} className={cc!.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      {/* Header */}
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-semibold text-foreground truncate">{clientName}</span>
                        {comm.direction === 'outbound' ? (
                          <ArrowUpRight size={10} className="text-blue-400 flex-shrink-0" />
                        ) : (
                          <ArrowDownLeft size={10} className="text-emerald-400 flex-shrink-0" />
                        )}
                        {comm.emailStatus && (
                          <span className={cn(
                            "text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase",
                            comm.emailStatus === 'opened' ? "bg-emerald-500/10 text-emerald-400" :
                            comm.emailStatus === 'delivered' ? "bg-blue-500/10 text-blue-400" :
                            comm.emailStatus === 'bounced' ? "bg-red-500/10 text-red-400" :
                            "bg-muted text-muted-foreground"
                          )}>{comm.emailStatus}</span>
                        )}
                        {comm.callResult && (
                          <span className={cn(
                            "text-[9px] font-bold px-1.5 py-0.5 rounded-full",
                            comm.callResult === 'answered' ? "bg-emerald-500/10 text-emerald-400" :
                            "bg-orange-500/10 text-orange-400"
                          )}>{comm.callResult === 'answered' ? 'Răspuns' : comm.callResult}</span>
                        )}
                        {comm.duration && (
                          <span className="text-[9px] text-muted-foreground">{comm.duration} min</span>
                        )}
                      </div>
                      {/* Subject */}
                      <p className="text-xs font-medium text-foreground/80 mb-1">{comm.subject}</p>
                      {/* Body preview */}
                      {comm.channel !== 'email' && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{comm.body}</p>
                      )}
                      {/* Footer */}
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-[10px] text-muted-foreground">{formatDate(comm.createdAt)}</span>
                        {comm.userName && <span className="text-[10px] text-muted-foreground">• {comm.userName}</span>}
                        {comm.attachments.length > 0 && (
                          <span className="text-[10px] text-primary">📎 {comm.attachments.length} atașament(e)</span>
                        )}
                        {comm.tags.length > 0 && comm.tags.map(t => (
                          <span key={t} className="text-[9px] bg-primary/5 text-primary px-1.5 py-0.5 rounded">{t}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* ═══ TEMPLATES VIEW ═══ */}
      {activeView === "templates" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Template-uri Comunicare</p>
            <button className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
              <Plus size={10} /> Template Nou
            </button>
          </div>
          {templates.map(t => (
            <div key={t.id} className="p-3 bg-surface rounded-lg border border-border/50 hover:border-border transition-colors">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium text-foreground">{t.name}</p>
                <span className="text-[9px] font-bold uppercase bg-muted text-muted-foreground px-1.5 py-0.5 rounded">{t.channel}</span>
              </div>
              {t.subject && <p className="text-xs text-muted-foreground">Subiect: {t.subject}</p>}
              <p className="text-xs text-muted-foreground/70 line-clamp-2 mt-1">{t.body}</p>
            </div>
          ))}
        </div>
      )}

      {/* ═══ ANALYTICS VIEW ═══ */}
      {activeView === "analytics" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-surface rounded-xl border border-border p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <PhoneOutgoing size={14} className="text-emerald-400" />
                </div>
              </div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase">Total Apeluri</p>
              <p className="text-2xl font-bold text-foreground">{globalStats.totalCalls}</p>
            </div>
            <div className="bg-surface rounded-xl border border-border p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <MailOpen size={14} className="text-amber-400" />
                </div>
              </div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase">Total Emails</p>
              <p className="text-2xl font-bold text-foreground">{globalStats.totalEmails}</p>
            </div>
            <div className="bg-surface rounded-xl border border-border p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Timer size={14} className="text-blue-400" />
                </div>
              </div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase">Mesaje</p>
              <p className="text-2xl font-bold text-foreground">{globalStats.totalMessages}</p>
            </div>
            <div className="bg-surface rounded-xl border border-border p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <TrendingUp size={14} className="text-purple-400" />
                </div>
              </div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase">Video Calls</p>
              <p className="text-2xl font-bold text-foreground">{globalStats.totalVideos}</p>
            </div>
          </div>

          {/* Channel distribution */}
          <div className="bg-surface rounded-xl border border-border p-4">
            <h4 className="text-sm font-semibold text-foreground mb-3">Distribuție per Canal</h4>
            <div className="space-y-2">
              {Object.entries(channelStats).map(([channel, count]) => {
                const pct = total > 0 ? Math.round((count / total) * 100) : 0
                const channelColors: Record<string, string> = {
                  call: '#22c55e', whatsapp: '#4ade80', sms: '#3b82f6', email: '#f59e0b', video: '#a855f7',
                }
                return (
                  <div key={channel} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-20 text-right capitalize">{channel}</span>
                    <div className="flex-1 h-5 bg-muted/30 rounded-md overflow-hidden">
                      <div
                        className="h-full rounded-md transition-all duration-700"
                        style={{ width: `${pct}%`, backgroundColor: channelColors[channel] || '#6b7280' }}
                      />
                    </div>
                    <span className="text-sm font-bold text-foreground w-8 text-right">{count}</span>
                    <span className="text-[10px] text-muted-foreground w-10">{pct}%</span>
                  </div>
                )
              })}
              {Object.keys(channelStats).length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">Nicio comunicare încă</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>

    <CallLogModal
      open={showCallModal}
      onClose={() => setShowCallModal(false)}
      onSave={async (entry) => {
        await createComm({
          channel: 'call',
          direction: 'outbound',
          subject: `Apel telefonic — ${entry.clientName}`,
          body: entry.notes || '',
          phone: entry.phone,
          toAddr: entry.phone,
          callResult: entry.callResult || 'answered',
          duration: entry.duration || 0,
          userName: 'Operator',
        } as any)
        setShowCallModal(false)
        refetch()
      }}
    />
    </>
  )
}

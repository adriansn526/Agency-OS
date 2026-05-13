"use client"

import { useState } from "react"
import type { CommunicationEntry } from "@repo/mock-data"
import { cn, formatDate } from "@/lib/utils"
import { Phone, MessageSquare, MessagesSquare, Mail, Video, ArrowDownLeft, ArrowUpRight, Filter } from "lucide-react"
import type { CommunicationChannel } from "@repo/mock-data"

const channelConfig: Record<string, { icon: any; label: string; color: string; bg: string }> = {
  call: { icon: Phone, label: "Apel", color: "text-emerald-400", bg: "bg-emerald-500/10" },
  whatsapp: { icon: MessagesSquare, label: "WhatsApp", color: "text-green-400", bg: "bg-green-500/10" },
  sms: { icon: MessageSquare, label: "SMS", color: "text-blue-400", bg: "bg-blue-500/10" },
  email: { icon: Mail, label: "Email", color: "text-amber-400", bg: "bg-amber-500/10" },
  video: { icon: Video, label: "Video", color: "text-purple-400", bg: "bg-purple-500/10" },
}

const callResultConfig: Record<string, { label: string; class: string }> = {
  answered: { label: "Răspuns", class: "text-emerald-400" },
  no_answer: { label: "Nu a răspuns", class: "text-red-400" },
  busy: { label: "Ocupat", class: "text-amber-400" },
  voicemail: { label: "Voicemail", class: "text-muted-foreground" },
}

interface CommunicationTimelineProps {
  entries: CommunicationEntry[]
  compact?: boolean
  maxItems?: number
}

export function CommunicationTimeline({ entries, compact = false, maxItems }: CommunicationTimelineProps) {
  const [channelFilter, setChannelFilter] = useState<string>("all")

  const filtered = channelFilter === "all" ? entries : entries.filter(e => e.channel === channelFilter)
  const displayed = maxItems ? filtered.slice(0, maxItems) : filtered

  // Group by date
  const groups = displayed.reduce((acc, entry) => {
    const dateKey = new Date(entry.date).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })
    if (!acc[dateKey]) acc[dateKey] = []
    acc[dateKey]!.push(entry)
    return acc
  }, {} as Record<string, CommunicationEntry[]>)

  return (
    <div className="space-y-3">
      {/* Channel filter */}
      {!compact && (
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <Filter size={12} className="text-muted-foreground shrink-0" />
          <button
            onClick={() => setChannelFilter("all")}
            className={cn("px-2 py-1 text-[10px] font-medium rounded-md flex items-center gap-1 whitespace-nowrap transition-all",
              channelFilter === "all" ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >Toate</button>
          {Object.entries(channelConfig).map(([key, config]) => {
            const Icon = config.icon
            return (
              <button
                key={key}
                onClick={() => setChannelFilter(key)}
                className={cn("px-2 py-1 text-[10px] font-medium rounded-md flex items-center gap-1 whitespace-nowrap transition-all",
                  channelFilter === key ? `${config.bg} ${config.color} border border-current/20` : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <Icon size={10} />
                {config.label}
              </button>
            )
          })}
        </div>
      )}

      {/* Timeline */}
      {Object.entries(groups).map(([date, items]) => (
        <div key={date}>
          {!compact && <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">{date}</p>}
          <div className="space-y-1.5">
            {items.map(entry => {
              const cc = channelConfig[entry.channel] || channelConfig.email
              const Icon = cc.icon
              const DirectionIcon = entry.direction === 'inbound' ? ArrowDownLeft : ArrowUpRight

              return (
                <div key={entry.id} className="flex items-start gap-3 p-3 rounded-lg bg-surface border border-border/50 hover:border-border transition-colors group">
                  {/* Channel icon */}
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", cc.bg)}>
                    <Icon size={14} className={cc.color} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-medium text-foreground truncate">{entry.subject}</p>
                      <DirectionIcon size={10} className={entry.direction === 'inbound' ? 'text-blue-400' : 'text-muted-foreground'} />
                    </div>
                    {entry.body && !compact && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-1">{entry.body}</p>
                    )}
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                      <span>{entry.clientName}</span>
                      <span>•</span>
                      <span>{new Date(entry.date).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}</span>
                      <span>•</span>
                      <span>{entry.user}</span>
                      {entry.duration && <><span>•</span><span>{entry.duration} min</span></>}
                      {entry.callResult && (
                        <span className={cn("font-bold", callResultConfig[entry.callResult]?.class)}>
                          {callResultConfig[entry.callResult]?.label}
                        </span>
                      )}
                      {entry.emailStatus && (
                        <span className={cn("font-bold",
                          entry.emailStatus === 'opened' ? 'text-emerald-400' :
                          entry.emailStatus === 'bounced' ? 'text-red-400' : 'text-muted-foreground'
                        )}>{entry.emailStatus}</span>
                      )}
                    </div>
                  </div>

                  {/* Timestamp */}
                  {!compact && (
                    <span className="text-[10px] text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      {formatDate(entry.date)}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {displayed.length === 0 && (
        <div className="text-center py-8 text-sm text-muted-foreground">
          Nicio comunicare înregistrată
        </div>
      )}
    </div>
  )
}

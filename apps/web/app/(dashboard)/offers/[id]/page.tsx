"use client"

import { useState, useMemo, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { BlockRenderer } from "@/components/block-renderer"
import { cn, formatCurrency, formatDate } from "@/lib/utils"
import { BusinessLineBadge } from "@/components/business-line-switcher"
import {
  ArrowLeft, Send, FileText, Sparkles, CheckCircle2, XCircle, Clock, Edit,
  Eye, Download, Copy, Mail, MoreHorizontal, Calendar, User, DollarSign,
  BarChart3, Activity, Smartphone, Monitor, ExternalLink, Bell, MessageSquare,
  AlertTriangle, Loader2, Trash2,
} from "lucide-react"

/* ── configs ── */

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  draft:       { label: "Draft",        color: "text-zinc-400",    bg: "bg-zinc-500/10" },
  trimisa:     { label: "Trimisă",      color: "text-blue-400",    bg: "bg-blue-500/10" },
  vizualizata: { label: "Vizualizată",  color: "text-amber-400",   bg: "bg-amber-500/10" },
  acceptata:   { label: "Acceptată",    color: "text-emerald-400", bg: "bg-emerald-500/10" },
  respinsa:    { label: "Respinsă",     color: "text-red-400",     bg: "bg-red-500/10" },
  expirata:    { label: "Expirată",     color: "text-zinc-500",    bg: "bg-zinc-500/10" },
  contract_generat: { label: "Contract Generat", color: "text-violet-400", bg: "bg-violet-500/10" },
}

/* ── tracking types ── */

interface TrackingEvent {
  type: string
  label: string
  timestamp: string
  meta?: string
}

interface SectionHeat {
  name: string
  timeSpent: number
  viewed: boolean
}

/* ── tracking data builder ── */

function getTrackingData(offer: any) {
  const deliveries = offer.deliveries || []
  const latestDelivery = deliveries[0] // sorted by sentAt desc
  const events: TrackingEvent[] = []
  const blocks = offer.blocks || []

  // Build section heat from real events
  const sectionHeat: SectionHeat[] = blocks.map((b: any) => ({
    name: b.title,
    timeSpent: 0,
    viewed: false,
  }))

  if (latestDelivery) {
    // Sent event
    events.push({
      type: "sent",
      label: "Ofertă trimisă",
      timestamp: latestDelivery.sentAt,
      meta: `Email: ${latestDelivery.sentTo}`,
    })

    // Process real events
    for (const ev of latestDelivery.events || []) {
      const meta = ev.metadata as Record<string, any> | null

      if (ev.type === 'opened') {
        events.push({
          type: "opened",
          label: "Ofertă deschisă",
          timestamp: ev.timestamp,
          meta: `${ev.device === 'mobile' ? '📱' : '💻'} ${(ev.userAgent || '').slice(0, 50)}`,
        })
      } else if (ev.type === 'revisited') {
        events.push({
          type: "opened",
          label: `Redeschisă (vizita #${meta?.sessionNumber || '?'})`,
          timestamp: ev.timestamp,
        })
      } else if (ev.type === 'section_viewed') {
        const section = meta?.section
        events.push({
          type: "section",
          label: `Citit "${section}"`,
          timestamp: ev.timestamp,
        })
        // Mark section as viewed
        const idx = sectionHeat.findIndex(s => s.name === section)
        if (idx >= 0) sectionHeat[idx]!.viewed = true
      } else if (ev.type === 'time_on_section') {
        const section = meta?.section
        const duration = meta?.duration || 0
        const idx = sectionHeat.findIndex(s => s.name === section)
        if (idx >= 0) sectionHeat[idx]!.timeSpent += duration
        events.push({
          type: "section",
          label: `Citit "${section}" (${duration}s)`,
          timestamp: ev.timestamp,
          meta: `${duration}s`,
        })
      } else if (ev.type === 'scroll_depth') {
        events.push({
          type: "scroll",
          label: `Scroll ${meta?.depth || 0}%`,
          timestamp: ev.timestamp,
        })
      } else if (ev.type === 'pdf_downloaded') {
        events.push({
          type: "pdf",
          label: "Descărcat PDF",
          timestamp: ev.timestamp,
        })
      } else if (ev.type === 'accepted') {
        events.push({
          type: "accepted",
          label: "Ofertă acceptată",
          timestamp: ev.timestamp,
        })
      } else if (ev.type === 'rejected') {
        events.push({
          type: "rejected",
          label: "Ofertă refuzată",
          timestamp: ev.timestamp,
          meta: meta?.message,
        })
      } else if (ev.type === 'question_asked') {
        events.push({
          type: "question",
          label: "Întrebare client",
          timestamp: ev.timestamp,
          meta: meta?.message,
        })
      }
    }
  }

  // Calculate max scroll depth from events
  const scrollEvents = (latestDelivery?.events || []).filter((e: any) => e.type === 'scroll_depth')
  const maxScroll = scrollEvents.reduce((max: number, e: any) => Math.max(max, (e.metadata as any)?.depth || 0), 0)

  // Detect latest device
  const openedEvent = (latestDelivery?.events || []).find((e: any) => e.type === 'opened')
  const device = openedEvent?.device === 'mobile' ? 'Mobile' : openedEvent?.device === 'tablet' ? 'Tablet' : 'Desktop'
  const deviceDetail = openedEvent ? `${device}, ${(openedEvent.userAgent || '').slice(0, 40)}` : null

  return {
    events,
    sectionHeat,
    totalViews: latestDelivery?.totalViews || 0,
    scrollDepth: maxScroll,
    device: latestDelivery?.firstOpenedAt ? device : null,
    deviceDetail: latestDelivery?.firstOpenedAt ? deviceDetail : null,
    delivery: latestDelivery,
  }
}

/* ── tabs ── */
type TabKey = "detalii" | "tracking"

/* ── page ── */

export default function SingleOfferPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabKey>("detalii")
  const [showSendModal, setShowSendModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [offer, setOffer] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/offers/${id}`)
        if (!res.ok) throw new Error("Not found")
        const json = await res.json()
        setOffer(json.data || json)
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const tracking = useMemo(() => offer ? getTrackingData(offer) : null, [offer])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 size={28} className="text-primary animate-spin" />
        <span className="ml-3 text-sm text-muted-foreground">Se încarcă oferta...</span>
      </div>
    )
  }

  if (error || !offer) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <p className="text-lg font-semibold text-foreground mb-2">Ofertă negăsită</p>
          <p className="text-sm text-muted-foreground mb-4">ID-ul &ldquo;{id}&rdquo; nu există.</p>
          <Link href="/offers" className="text-primary text-sm hover:underline">&larr; Înapoi la Oferte</Link>
        </div>
      </div>
    )
  }

  const sc = statusConfig[offer.status] ?? statusConfig.draft!
  const hasAi = offer.blocks?.some((b: any) => b.aiGenerated)

  const tabs: { key: TabKey; label: string; icon: React.ElementType }[] = [
    { key: "detalii", label: "Detalii Ofertă", icon: FileText },
    { key: "tracking", label: "Tracking", icon: BarChart3 },
  ]

  return (
    <div className="p-4 md:p-6 space-y-5 animate-fade-in max-w-5xl mx-auto">
      {/* Back + Actions */}
      <div className="flex items-center justify-between">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={15} /> Înapoi
        </button>
        <div className="flex items-center gap-2">
          {offer.status === "draft" && (
            <>
              <button onClick={() => setShowSendModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                <Send size={12} /> Trimite Oferta
              </button>
            </>
          )}
          <Link href={`/offers/${offer.id}/edit`} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors">
            <Edit size={12} /> Editează
          </Link>
          {(offer.status === "trimisa" || offer.status === "vizualizata") && (
            <button onClick={() => setShowSendModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
              <Send size={12} /> Retrimite
            </button>
          )}
          {(offer.status === "acceptata" || offer.status === "draft") && (
            <Link href={`/contracts/generate?offerId=${offer.id}`} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors">
              <FileText size={12} /> Generează Contract
            </Link>
          )}
          <Link href={`/offer/view/${offer.id}`} target="_blank" className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors">
            <ExternalLink size={12} /> Preview Public
          </Link>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors">
            <Copy size={12} /> Duplică
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors">
            <Download size={12} /> PDF
          </button>
          <button onClick={() => setShowDeleteConfirm(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 transition-colors">
            <Trash2 size={12} /> Șterge
          </button>
        </div>
      </div>

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface border border-border rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                <Trash2 size={18} className="text-destructive" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Șterge Oferta</h3>
                <p className="text-[10px] text-muted-foreground">{offer.number}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Ești sigur că vrei să ștergi oferta <strong className="text-foreground">{offer.entityName} — {offer.templateName}</strong>? Această acțiune nu poate fi anulată.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >Anulează</button>
              <button
                onClick={async () => {
                  setDeleting(true)
                  try {
                    const res = await fetch(`/api/offers/${offer.id}`, { method: 'DELETE' })
                    if (res.ok) {
                      router.push('/offers')
                    }
                  } catch {
                    setDeleting(false)
                  }
                }}
                disabled={deleting}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-destructive text-white rounded-lg hover:bg-destructive/90 transition-all disabled:opacity-50"
              >
                {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                {deleting ? 'Se șterge...' : 'Șterge definitiv'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header Card */}
      <div className="bg-surface rounded-2xl border border-border p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-lg font-bold text-foreground">{offer.number}</h1>
              <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase", sc.color, sc.bg)}>{sc.label}</span>
              {hasAi && (
                <span className="flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold uppercase bg-gradient-to-r from-violet-500/10 to-pink-500/10 text-violet-400 rounded-full border border-violet-500/20">
                  <Sparkles size={8} /> AI
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{offer.templateName}</p>
          </div>
          {offer.businessLine && <BusinessLineBadge lineId={offer.businessLine} />}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: User, label: "Entitate", value: offer.entityName },
            { icon: DollarSign, label: "Valoare", value: `${formatCurrency(offer.value)} ${offer.currency}` },
            { icon: Calendar, label: "Creată", value: formatDate(offer.createdAt) },
            { icon: Clock, label: "Validă până", value: formatDate(offer.validUntil) },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                <item.icon size={14} className="text-muted-foreground" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{item.label}</p>
                <p className="text-xs font-semibold text-foreground">{item.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Linked contracts */}
        {offer.contracts?.length > 0 && (
          <div className="mt-4 pt-3 border-t border-border/30">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Contracte Generate</p>
            <div className="flex flex-wrap gap-2">
              {offer.contracts.map((c: any) => (
                <Link key={c.id} href={`/contracts/${c.id}`} className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors">
                  <FileText size={10} /> {c.number}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border">
        {tabs.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={cn("flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-all", activeTab === tab.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}>
            <tab.icon size={13} /> {tab.label}
            {tab.key === "tracking" && offer.viewedAt && (
              <span className="ml-1 w-1.5 h-1.5 rounded-full bg-emerald-400" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "detalii" && (
        <div className="space-y-4 animate-fade-in">
          {/* Blocks */}
          {(offer.blocks || []).map((block: any) => (
            <BlockRenderer key={block.id} block={block} variant="dashboard" />
          ))}

          {/* Status Timeline */}
          <div className="bg-surface rounded-xl border border-border p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Istoric Status</h3>
            <div className="space-y-2">
              {[
                { label: "Creată", date: offer.createdAt, done: true },
                { label: "Trimisă", date: offer.sentAt, done: !!offer.sentAt },
                { label: "Vizualizată", date: offer.viewedAt, done: !!offer.viewedAt },
                { label: offer.status === "acceptata" ? "Acceptată" : offer.status === "respinsa" ? "Respinsă" : "Răspuns", date: offer.acceptedAt, done: offer.status === "acceptata" || offer.status === "respinsa" },
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={cn("w-2 h-2 rounded-full", step.done ? "bg-emerald-400" : "bg-muted-foreground/30")} />
                  <span className={cn("text-xs font-medium", step.done ? "text-foreground" : "text-muted-foreground")}>{step.label}</span>
                  {step.date && <span className="text-[10px] text-muted-foreground ml-auto">{formatDate(step.date)}</span>}
                </div>
              ))}
            </div>
          </div>

          <div className="text-[11px] text-muted-foreground">
            Creată pe {formatDate(offer.createdAt)}
          </div>
        </div>
      )}

      {activeTab === "tracking" && tracking && (
        <div className="space-y-4 animate-fade-in">
          {!offer.sentAt ? (
            <div className="bg-surface rounded-xl border border-border p-8 text-center">
              <Send size={32} className="mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium text-foreground mb-1">Oferta nu a fost trimisă încă</p>
              <p className="text-xs text-muted-foreground mb-4">Trimite oferta pentru a activa tracking-ul de vizualizări.</p>
              <button onClick={() => setShowSendModal(true)} className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">
                <Send size={12} /> Trimite Oferta
              </button>
            </div>
          ) : (
            <>
              {/* Stats Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { icon: Mail, label: "Trimisă", value: formatDate(offer.sentAt!), color: "text-blue-400" },
                  { icon: Eye, label: "Vizualizări", value: `${tracking.totalViews}`, color: "text-amber-400" },
                  { icon: tracking.device === "Mobile" ? Smartphone : Monitor, label: "Device", value: tracking.deviceDetail || "—", color: "text-cyan-400" },
                  { icon: Activity, label: "Scroll Depth", value: `${tracking.scrollDepth}%`, color: "text-emerald-400" },
                ].map((stat) => (
                  <div key={stat.label} className="bg-surface rounded-xl border border-border p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <stat.icon size={13} className={stat.color} />
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{stat.label}</span>
                    </div>
                    <p className="text-sm font-bold text-foreground">{stat.value}</p>
                  </div>
                ))}
              </div>

              {/* Section Heatmap */}
              <div className="bg-surface rounded-xl border border-border p-4">
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <BarChart3 size={14} /> Secțiuni Vizualizate
                </h3>
                <div className="space-y-2.5">
                  {tracking.sectionHeat.map((section) => {
                    const maxTime = Math.max(...tracking.sectionHeat.map((s) => s.timeSpent))
                    const pct = maxTime > 0 ? (section.timeSpent / maxTime) * 100 : 0
                    const isHot = section.timeSpent > 40
                    return (
                      <div key={section.name} className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-foreground truncate">{section.name}</span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-muted-foreground">{section.timeSpent}s</span>
                              {isHot && <span className="text-[10px]">🔥</span>}
                            </div>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={cn("h-full rounded-full transition-all", isHot ? "bg-gradient-to-r from-orange-500 to-red-500" : section.viewed ? "bg-primary/70" : "bg-muted-foreground/20")}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                        {section.viewed ? (
                          <CheckCircle2 size={14} className="text-emerald-400 flex-shrink-0" />
                        ) : (
                          <AlertTriangle size={14} className="text-amber-400 flex-shrink-0" />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Event Timeline */}
              <div className="bg-surface rounded-xl border border-border p-4">
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Activity size={14} /> Timeline Evenimente
                </h3>
                <div className="space-y-0">
                  {tracking.events.map((event, i) => {
                    const iconMap: Record<string, { icon: React.ElementType; color: string }> = {
                      sent: { icon: Send, color: "text-blue-400" },
                      opened: { icon: Eye, color: "text-amber-400" },
                      section: { icon: FileText, color: "text-cyan-400" },
                      scroll: { icon: Activity, color: "text-emerald-400" },
                      pdf: { icon: Download, color: "text-violet-400" },
                      accepted: { icon: CheckCircle2, color: "text-emerald-400" },
                    }
                    const cfg = iconMap[event.type] || { icon: Bell, color: "text-muted-foreground" }
                    const Icon = cfg.icon
                    return (
                      <div key={i} className="flex items-start gap-3 py-2 border-b border-border/50 last:border-0">
                        <div className="w-6 h-6 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Icon size={11} className={cfg.color} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground">{event.label}</p>
                          {event.meta && <p className="text-[10px] text-muted-foreground">{event.meta}</p>}
                        </div>
                        <span className="text-[10px] text-muted-foreground flex-shrink-0">{formatDate(event.timestamp)}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Send Modal */}
      {showSendModal && <SendOfferModal offer={offer} onClose={() => setShowSendModal(false)} />}
    </div>
  )
}

/* ============================================================
   SEND OFFER MODAL
   ============================================================ */

function SendOfferModal({ offer, onClose }: { offer: any; onClose: () => void }) {
  const [email, setEmail] = useState(offer.entityName.includes("@") ? offer.entityName : `contact@${offer.entityName.toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9]/g, "")}.ro`)
  const [subject, setSubject] = useState(`Ofertă ${offer.number} — ${offer.templateName}`)
  const [message, setMessage] = useState(`Bună ziua,\n\nVă transmitem oferta noastră ${offer.number} pentru serviciile solicitate.\n\nValoare: ${offer.value} ${offer.currency}\nValiditate: ${formatDate(offer.validUntil)}\n\nPentru a vizualiza oferta complet, accesați link-ul de mai jos.\n\nCu stimă,\nEchipa ASNS`)
  const [attachPdf, setAttachPdf] = useState(true)
  const [enableTracking, setEnableTracking] = useState(true)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [publicUrl, setPublicUrl] = useState("")
  const [copied, setCopied] = useState(false)

  const handleSend = async () => {
    setSending(true)
    try {
      const res = await fetch(`/api/offers/${offer.id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          subject,
          message,
          attachPdf,
          enableTracking,
        }),
      })
      const json = await res.json()
      if (res.ok) {
        setPublicUrl(json.publicUrl || '')
        setSent(true)
      }
    } catch (err) {
      console.error('Failed to send offer:', err)
    } finally {
      setSending(false)
    }
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" />
      <div className="relative bg-surface rounded-2xl border border-border shadow-2xl w-full max-w-lg mx-4 animate-scale-in max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-surface z-10">
          <div>
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Send size={14} className="text-primary" /> Trimite Oferta
            </h2>
            <p className="text-[11px] text-muted-foreground">{offer.number} &mdash; {offer.entityName}</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground">
            <XCircle size={14} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {sent ? (
            <div className="flex flex-col items-center py-8 animate-fade-in">
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
                <CheckCircle2 size={28} className="text-emerald-400" />
              </div>
              <p className="text-sm font-semibold text-foreground mb-1">Ofertă trimisă cu succes!</p>
              <p className="text-[11px] text-muted-foreground mb-4">Status actualizat: Draft &rarr; Trimisă</p>
              {publicUrl && (
                <div className="w-full space-y-2">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Link Public</p>
                  <div className="flex items-center gap-2">
                    <input readOnly value={publicUrl} className="flex-1 px-3 py-2 text-xs bg-muted/50 border border-border rounded-lg text-foreground font-mono" />
                    <button onClick={handleCopyLink} className="px-3 py-2 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors whitespace-nowrap">
                      {copied ? "✓ Copiat!" : "Copiază"}
                    </button>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Trimiteți acest link clientului pentru a vizualiza oferta cu tracking.</p>
                </div>
              )}
              <button onClick={onClose} className="mt-4 px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">Închide</button>
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Email Destinatar</label>
                <input value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Subiect Email</label>
                <input value={subject} onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Mesaj Personalizat</label>
                <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={6}
                  className="w-full px-3 py-2 text-sm bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
                <div className="flex items-center gap-2 flex-wrap">
                  {["{{companyName}}", "{{offerValue}}", "{{validUntil}}"].map((v) => (
                    <button key={v} onClick={() => setMessage((m) => m + " " + v)}
                      className="px-2 py-0.5 text-[9px] font-mono bg-muted rounded text-muted-foreground hover:text-foreground transition-colors">
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/30 cursor-pointer transition-all">
                  <input type="checkbox" checked={attachPdf} onChange={(e) => setAttachPdf(e.target.checked)} className="accent-primary w-4 h-4" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Atașează PDF</p>
                    <p className="text-[10px] text-muted-foreground">PDF-ul ofertei va fi atașat la email</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/30 cursor-pointer transition-all">
                  <input type="checkbox" checked={enableTracking} onChange={(e) => setEnableTracking(e.target.checked)} className="accent-primary w-4 h-4" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Include Link Tracking</p>
                    <p className="text-[10px] text-muted-foreground">Urmărește când clientul deschide și citește oferta</p>
                  </div>
                </label>
              </div>
              <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                <p className="text-[11px] text-blue-400">
                  <strong>Link public:</strong> app.asns.ro/offer/view/{offer.id.slice(0, 8)}
                </p>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={onClose} className="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground bg-muted rounded-lg transition-colors">Anulează</button>
                <button onClick={handleSend} disabled={sending}
                  className="px-5 py-2 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all flex items-center gap-1.5 disabled:opacity-60">
                  {sending ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Se trimite...
                    </>
                  ) : (
                    <>
                      <Send size={12} /> Trimite Oferta
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

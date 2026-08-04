"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { cn, formatCurrency, formatDate, getInitials } from "@/lib/utils"
import { BusinessLineBadge } from "@/components/business-line-switcher"
import {
  ArrowLeft, Phone, Mail, Globe, Calendar, DollarSign, Target, Clock, User,
  FileText, Send, Activity, TrendingUp, AlertTriangle, CheckCircle2, XCircle,
  Sparkles, Edit, MoreHorizontal, MessageSquare, PhoneCall, Video, StickyNote,
  Plus, ArrowRight, Loader2, Trash2, UserPlus, Bot
} from "lucide-react"
import { getBusinessLine } from "@repo/mock-data"

/* ── configs ── */

const defaultStatusConf = { label: "—", color: "text-muted-foreground", bgColor: "bg-muted" }
const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  cold:            { label: "Cold",           color: "text-slate-400",   bgColor: "bg-slate-500/10" },
  nou:             { label: "Nou",            color: "text-purple-400",  bgColor: "bg-purple-500/10" },
  contactat:       { label: "Contactat",      color: "text-blue-400",    bgColor: "bg-blue-500/10" },
  calificat:       { label: "Calificat",      color: "text-cyan-400",    bgColor: "bg-cyan-500/10" },
  oferta_trimisa:  { label: "Ofertă Trimisă", color: "text-amber-400",   bgColor: "bg-amber-500/10" },
  negociere:       { label: "Negociere",      color: "text-orange-400",  bgColor: "bg-orange-500/10" },
  castigat:        { label: "Câștigat",       color: "text-emerald-400", bgColor: "bg-emerald-500/10" },
  pierdut:         { label: "Pierdut",        color: "text-red-400",     bgColor: "bg-red-500/10" },
  // Fudly pipeline
  trial:           { label: "Trial",          color: "text-blue-400",    bgColor: "bg-blue-500/10" },
  onboarding:      { label: "Onboarding",     color: "text-amber-400",   bgColor: "bg-amber-500/10" },
  activ_fudly:     { label: "Activ",          color: "text-emerald-400", bgColor: "bg-emerald-500/10" },
  churn_risk:      { label: "Churn Risk",     color: "text-orange-400",  bgColor: "bg-orange-500/10" },
  churned:         { label: "Churned",        color: "text-red-400",     bgColor: "bg-red-500/10" },
}

const priorityConfig: Record<string, { label: string; color: string }> = {
  low: { label: "Scăzută", color: "text-muted-foreground" }, medium: { label: "Medie", color: "text-blue-400" },
  high: { label: "Mare", color: "text-amber-400" }, urgent: { label: "Urgentă", color: "text-red-400" },
}

const sourceLabels: Record<string, string> = {
  website: "Website", referral: "Referral", linkedin: "LinkedIn",
  cold_outreach: "Cold Outreach", google_ads: "Google Ads", marketplace: "Marketplace", partner: "Partner",
  boltfood_scrape: "BoltFood Scrape", fudly_crm: "Fudly CRM",
}

/* ── tab defs ── */

type TabKey = "overview" | "oferte" | "activitate"

const tabs: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: "overview",     label: "Prezentare",    icon: User },
  { key: "oferte",       label: "Oferte",        icon: FileText },
  { key: "activitate",   label: "Activitate",    icon: Activity },
]

const defaultPipelineStages = ["contactat", "calificat", "oferta_trimisa", "negociere", "castigat"]

/* ── page ── */

export default function SingleLeadPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabKey>("overview")
  const [showConvertModal, setShowConvertModal] = useState(false)
  const [lead, setLead] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [leadOffers, setLeadOffers] = useState<any[]>([])
  const [isCallingAI, setIsCallingAI] = useState(false)

  const initiateAICall = async () => {
    if (!lead?.phone) return alert('Lead-ul nu are număr de telefon asociat.')
    setIsCallingAI(true)
    try {
      const res = await fetch('/api/voice/outbound', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: lead.id })
      })
      if (!res.ok) throw new Error('Eroare la inițiere apel')
      alert('Apelul AI a fost inițiat cu succes! Verifică tab-ul Activitate.')
    } catch (err) {
      alert('Eroare la inițierea apelului.')
    } finally {
      setIsCallingAI(false)
    }
  }

  // Derive pipeline stages from lead's business line
  const pipelineStages = useMemo(() => {
    if (!lead?.businessLine?.slug) return defaultPipelineStages
    const bl = getBusinessLine(lead.businessLine.slug)
    if (!bl) return defaultPipelineStages
    const et = bl.entityTypes.find((e: any) => e.id === lead.entityType) || bl.entityTypes[0]
    if (!et) return defaultPipelineStages
    return et.pipeline.map((s: any) => s.key)
  }, [lead])

  // Fetch lead
  useEffect(() => {
    setLoading(true)
    fetch(`/api/leads/${id}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(json => { setLead(json.data); setError(false) })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [id])

  // Fetch offers linked to this lead (only by explicit leadId link, not by name match)
  useEffect(() => {
    if (!lead) return
    fetch(`/api/offers?leadId=${lead.id}&limit=50`)
      .then(r => r.json())
      .then(json => {
        const all = json.data || []
        // Only show offers explicitly linked to this lead via leadId or convertedTo client
        const matched = all.filter((o: any) => o.leadId === lead.id || (lead.convertedToId && o.clientId === lead.convertedToId))
        setLeadOffers(matched)
      })
      .catch(() => {})
  }, [lead])

  // Update lead field
  const updateField = useCallback(async (data: Record<string, any>) => {
    if (!lead) return
    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (res.ok) {
        const json = await res.json()
        setLead(json.data)
      }
    } catch {}
  }, [id, lead])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="animate-spin text-primary" size={24} />
      </div>
    )
  }

  if (error || !lead) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <p className="text-lg font-semibold text-foreground mb-2">Lead negăsit</p>
          <p className="text-sm text-muted-foreground mb-4">ID-ul „{id}" nu există.</p>
          <Link href="/crm/lead-uri" className="text-primary text-sm hover:underline">← Înapoi la Lead-uri</Link>
        </div>
      </div>
    )
  }

  const sc = statusConfig[lead.status] || { label: lead.status, color: "text-muted-foreground", bgColor: "bg-muted" }
  const pc = priorityConfig[lead.priority] || { label: lead.priority || 'N/A', color: "text-muted-foreground" }

  return (
    <div className="p-4 md:p-6 space-y-5 animate-fade-in max-w-6xl mx-auto">
      {/* Back + Actions */}
      <div className="flex items-center justify-between">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={15} /> Înapoi
        </button>
        <div className="flex items-center gap-2">
          <button onClick={initiateAICall} disabled={isCallingAI || !lead?.phone} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
            {isCallingAI ? <Loader2 size={12} className="animate-spin" /> : <Bot size={12} />}
            Inițiază Apel AI
          </button>
          <a href={lead?.phone ? `tel:${lead.phone}` : '#'} className={cn("flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-muted text-foreground border border-border rounded-lg hover:bg-muted/80 transition-colors", !lead?.phone && "opacity-50 cursor-not-allowed")}>
            <Phone size={12} />
            Apel (Standard)
          </a>
          <Link href={`/offers/new`} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
            <Send size={12} /> Generează Ofertă
          </Link>
          {lead.status !== "castigat" && !lead.convertedToId && (
            <button onClick={() => setShowConvertModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors">
              <UserPlus size={12} /> Convertește în Client
            </button>
          )}
          {lead.convertedToId && (
            <Link href={`/crm/clienti/${lead.convertedToId}`} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-600/10 text-emerald-400 rounded-lg hover:bg-emerald-600/20 transition-colors">
              <CheckCircle2 size={12} /> Vezi Client
            </Link>
          )}
        </div>
      </div>

      {/* Header Card */}
      <div className="bg-surface rounded-2xl border border-border p-5">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-lg font-bold text-primary flex-shrink-0">
            {getInitials(lead.companyName)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h1 className="text-xl font-bold text-foreground">{lead.companyName}</h1>
              <span className={cn("px-2 py-0.5 text-[10px] font-bold rounded-full", sc.bgColor, sc.color)}>{sc.label}</span>
              {lead.convertedToId && (
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/10 text-emerald-400">Convertit</span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{lead.contactPerson} • {lead.entityType}</p>
            <div className="flex items-center gap-4 mt-2 flex-wrap text-xs text-muted-foreground">
              {lead.email && <a href={`mailto:${lead.email}`} className="flex items-center gap-1 hover:text-primary transition-colors"><Mail size={12} /> {lead.email}</a>}
              {lead.phone && <a href={`tel:${lead.phone}`} className="flex items-center gap-1 hover:text-primary transition-colors"><Phone size={12} /> {lead.phone}</a>}
              <span className="flex items-center gap-1"><Calendar size={12} /> Creat: {formatDate(lead.createdAt)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Valoare estimată", value: formatCurrency(lead.value || 0), icon: DollarSign, color: "text-emerald-400" },
          { label: "Probabilitate", value: `${lead.probability || 0}%`, icon: Target, color: "text-blue-400" },
          { label: "Prioritate", value: pc.label, icon: AlertTriangle, color: pc.color },
          { label: "Sursă", value: sourceLabels[lead.source] || lead.source || 'N/A', icon: TrendingUp, color: "text-cyan-400" },
          { label: "Oferte trimise", value: `${leadOffers.length}`, icon: FileText, color: "text-amber-400" },
        ].map((kpi) => { const Icon = kpi.icon; return (
          <div key={kpi.label} className="bg-surface rounded-xl border border-border p-3">
            <div className="flex items-center gap-1.5 mb-1"><Icon size={13} className={kpi.color} /><span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{kpi.label}</span></div>
            <p className="text-base font-bold text-foreground">{kpi.value}</p>
          </div>
        )})}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const count = tab.key === "oferte" ? leadOffers.length : undefined
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={cn(
              "flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-all whitespace-nowrap",
              activeTab === tab.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            )}>
              <Icon size={13} /> {tab.label}
              {count !== undefined && count > 0 && <span className="text-[9px] bg-muted px-1.5 py-0.5 rounded-full">{count}</span>}
            </button>
          )
        })}
      </div>

      {/* ──────────── Tab Content ──────────── */}
      <div className="animate-fade-in">

        {/* ═══ Overview ═══ */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 space-y-5">
              {/* Next Action */}
              {lead.nextAction && (
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock size={14} className="text-amber-400" />
                    <h3 className="text-sm font-semibold text-foreground">Următoarea Acțiune</h3>
                    {lead.nextActionDate && <span className="ml-auto text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">{formatDate(lead.nextActionDate)}</span>}
                  </div>
                  <p className="text-sm text-foreground/80">{lead.nextAction}</p>
                </div>
              )}

              {/* Notes */}
              <div className="bg-surface rounded-xl border border-border p-4">
                <div className="flex items-center gap-2 mb-3"><Edit size={14} className="text-muted-foreground" /><h3 className="text-sm font-semibold text-foreground">Note</h3></div>
                <p className="text-sm text-foreground/70 leading-relaxed">{lead.notes || "Nicio notă adăugată."}</p>
              </div>

              {/* Quick info */}
              <div className="bg-surface rounded-xl border border-border p-4 space-y-3">
                <h3 className="text-sm font-semibold text-foreground">Detalii Lead</h3>
                {[
                  { label: "Assigned to", value: lead.assignedTo || 'Neasignat', icon: User },
                  { label: "Business Line", value: lead.businessLine?.name || 'N/A', icon: Globe },
                  { label: "Sursă", value: sourceLabels[lead.source] || lead.source || 'N/A', icon: TrendingUp },
                  { label: "Creat", value: formatDate(lead.createdAt), icon: Calendar },
                  { label: "Actualizat", value: formatDate(lead.updatedAt), icon: Clock },
                ].map((d) => { const Icon = d.icon; return (
                  <div key={d.label} className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><Icon size={12} /> {d.label}</span>
                    <span className="text-xs font-medium text-foreground">{d.value}</span>
                  </div>
                )})}
              </div>

              {/* Business Data (CSV imported fields) */}
              {(lead.cui || lead.industry || lead.caenCode || lead.revenue || lead.employees || lead.website || lead.county || lead.foundedYear) && (
                <div className="bg-surface rounded-xl border border-border p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">Date Firmă</h3>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    {[
                      { label: "CUI", value: lead.cui },
                      { label: "Industrie", value: lead.industry ? lead.industry.charAt(0).toUpperCase() + lead.industry.slice(1) : null },
                      { label: "Cod CAEN", value: lead.caenCode },
                      { label: "Descriere CAEN", value: lead.caenDescription, colSpan: true },
                      { label: "Cifra Afaceri", value: lead.revenue ? `${lead.revenue.toLocaleString('ro-RO')} RON` : null },
                      { label: "Nr. Angajați", value: lead.employees?.toLocaleString() },
                      { label: "Județ", value: lead.county },
                      { label: "Oraș", value: lead.city },
                      { label: "Stare Firmă", value: lead.companyStatus },
                      { label: "An Înființare", value: lead.foundedYear },
                      { label: "Funcție Contact", value: lead.contactRole },
                    ].filter(d => d.value).map((d) => (
                      <div key={d.label} className={d.colSpan ? "col-span-2" : ""}>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{d.label}</p>
                        <p className="text-xs font-medium text-foreground">{d.value}</p>
                      </div>
                    ))}
                    {lead.website && (
                      <div className="col-span-2">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Website</p>
                        <a href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} target="_blank" rel="noopener" className="text-xs font-medium text-primary hover:underline">
                          {lead.website}
                        </a>
                      </div>
                    )}
                  </div>
                  {/* Extra phones & emails */}
                  {(lead.phone2 || lead.phone3 || lead.email2) && (
                    <div className="pt-2 border-t border-border/50 space-y-1.5">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Contact suplimentar</p>
                      <div className="flex flex-wrap gap-2">
                        {lead.phone && <a href={`tel:${lead.phone}`} className="inline-flex items-center gap-1 text-[11px] text-foreground bg-muted/50 px-2 py-1 rounded-md hover:bg-primary/10 hover:text-primary transition-colors"><Phone size={10} />{lead.phone}</a>}
                        {lead.phone2 && <a href={`tel:${lead.phone2}`} className="inline-flex items-center gap-1 text-[11px] text-foreground bg-muted/50 px-2 py-1 rounded-md hover:bg-primary/10 hover:text-primary transition-colors"><Phone size={10} />{lead.phone2}</a>}
                        {lead.phone3 && <a href={`tel:${lead.phone3}`} className="inline-flex items-center gap-1 text-[11px] text-foreground bg-muted/50 px-2 py-1 rounded-md hover:bg-primary/10 hover:text-primary transition-colors"><Phone size={10} />{lead.phone3}</a>}
                        {lead.email && <a href={`mailto:${lead.email}`} className="inline-flex items-center gap-1 text-[11px] text-foreground bg-muted/50 px-2 py-1 rounded-md hover:bg-primary/10 hover:text-primary transition-colors"><Mail size={10} />{lead.email}</a>}
                        {lead.email2 && <a href={`mailto:${lead.email2}`} className="inline-flex items-center gap-1 text-[11px] text-foreground bg-muted/50 px-2 py-1 rounded-md hover:bg-primary/10 hover:text-primary transition-colors"><Mail size={10} />{lead.email2}</a>}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Form Tracking & Raw Data */}
              {(lead.sourcePage || lead.utmSource || lead.customFields) && (
                <div className="bg-surface rounded-xl border border-border p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">Date Tracking & Formular</h3>
                  
                  {/* Tracking / UTMs */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    {[
                      { label: "Pagina Sursă", value: lead.sourcePage },
                      { label: "Serviciu", value: lead.sourceService },
                      { label: "Referrer", value: lead.sourceReferrer },
                      { label: "Form ID", value: lead.sourceFormId },
                      { label: "UTM Source", value: lead.utmSource },
                      { label: "UTM Medium", value: lead.utmMedium },
                      { label: "UTM Campaign", value: lead.utmCampaign },
                      { label: "IP", value: lead.customFields?.ip },
                      { label: "Data Trimiterii", value: lead.customFields?.submittedAt ? formatDate(lead.customFields.submittedAt) : null },
                    ].filter(d => d.value).map((d) => (
                      <div key={d.label}>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{d.label}</p>
                        <p className="text-xs font-medium text-foreground truncate" title={String(d.value)}>{d.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Raw Form Data (Dynamic Custom Fields) */}
                  {lead.customFields?.rawFormData && Object.keys(lead.customFields.rawFormData).length > 0 && (
                    <div className="pt-3 border-t border-border/50">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Câmpuri specifice formular (Raw Data)</p>
                      <div className="bg-muted/30 rounded-lg p-3 space-y-2">
                        {Object.entries(lead.customFields.rawFormData).map(([key, val]) => {
                          if (typeof val !== 'string' && typeof val !== 'number' && typeof val !== 'boolean') return null;
                          return (
                            <div key={key} className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4">
                              <span className="text-[11px] font-medium text-muted-foreground w-1/3 shrink-0 capitalize">{key.replace(/_/g, ' ')}:</span>
                              <span className="text-xs text-foreground font-medium break-words">{String(val)}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right — Pipeline + Status Change */}
            <div className="space-y-5">
              <div className="bg-surface rounded-xl border border-border p-4">
                <h3 className="text-sm font-semibold text-foreground mb-3">Pipeline</h3>
                <div className="space-y-1.5">
                  {pipelineStages.map((stage) => {
                    const stageConf = statusConfig[stage] || { label: stage, color: 'text-muted-foreground', bgColor: 'bg-muted' }
                    const isCurrent = lead.status === stage
                    const isLost = lead.status === "pierdut"
                    const stageIdx = pipelineStages.indexOf(stage)
                    const currentIdx = pipelineStages.indexOf(lead.status)
                    const isPast = !isLost && stageIdx < currentIdx
                    return (
                      <button
                        key={stage}
                        onClick={() => updateField({ status: stage })}
                        className={cn(
                          "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all text-left",
                          isCurrent ? `${stageConf.bgColor} border border-current/20` : isPast ? "opacity-50 hover:opacity-80" : "opacity-30 hover:opacity-60"
                        )}
                      >
                        <div className={cn("w-2 h-2 rounded-full", isCurrent ? stageConf.color.replace("text-", "bg-") : isPast ? "bg-muted-foreground" : "bg-muted-foreground/30")} />
                        <span className={cn("font-medium", isCurrent ? stageConf.color : "text-muted-foreground")}>{stageConf.label}</span>
                        {isCurrent && <span className="ml-auto text-[9px] font-bold uppercase">Curent</span>}
                        {isPast && <CheckCircle2 size={11} className="ml-auto text-muted-foreground" />}
                      </button>
                    )
                  })}
                  {lead.status === "pierdut" && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs">
                      <XCircle size={12} className="text-red-400" /><span className="text-red-400 font-medium">Pierdut</span>
                    </div>
                  )}
                </div>
                {lead.status !== "pierdut" && (
                  <button
                    onClick={() => updateField({ status: "pierdut" })}
                    className="w-full mt-2 flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-destructive bg-destructive/5 border border-destructive/20 rounded-lg hover:bg-destructive/10 transition-colors"
                  >
                    <XCircle size={11} /> Marchează ca Pierdut
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══ Oferte ═══ */}
        {activeTab === "oferte" && (
          <div className="bg-surface rounded-xl border border-border overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">Oferte ({leadOffers.length})</h3>
              <Link href="/offers/new" className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"><Sparkles size={10} /> Ofertă Nouă</Link>
            </div>
            {leadOffers.length === 0 ? (
              <div className="p-8 text-center"><FileText size={24} className="text-muted-foreground/30 mx-auto mb-2" /><p className="text-xs text-muted-foreground">Nicio ofertă trimisă încă</p></div>
            ) : (
              <div className="divide-y divide-border/50">
                {leadOffers.map((offer: any) => {
                  const osMap: Record<string, { label: string; color: string }> = { draft: { label: "Draft", color: "text-muted-foreground" }, trimisa: { label: "Trimisă", color: "text-blue-400" }, vizualizata: { label: "Vizualizată", color: "text-amber-400" }, acceptata: { label: "Acceptată", color: "text-emerald-400" }, respinsa: { label: "Respinsă", color: "text-red-400" }, expirata: { label: "Expirată", color: "text-muted-foreground" }, contract_generat: { label: "Contract", color: "text-violet-400" } }
                  const os = osMap[offer.status] || { label: offer.status, color: "text-muted-foreground" }
                  return (
                    <Link key={offer.id} href={`/offers/${offer.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2"><p className="text-sm font-medium text-foreground">{offer.number}</p><span className={cn("text-[10px] font-bold uppercase", os.color)}>{os.label}</span></div>
                        <p className="text-[11px] text-muted-foreground">{offer.templateName} • {formatDate(offer.createdAt)}</p>
                      </div>
                      <p className="text-sm font-bold text-foreground">{formatCurrency(offer.value || 0)}</p>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══ Activitate ═══ */}
        {activeTab === "activitate" && (
          <div className="bg-surface rounded-xl border border-border p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground">Istoric Apeluri & AI Voice</h3>
            </div>
            <div className="text-center py-8">
              <Bot size={24} className="text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">Aici vor apărea înregistrările și transcriptul conversațiilor purtate de agentul AI cu acest lead.</p>
            </div>
          </div>
        )}

      </div>

      {/* Convert Modal */}
      {showConvertModal && <ConvertLeadModal lead={lead} onClose={() => setShowConvertModal(false)} onConverted={(clientId) => {
        setLead({ ...lead, status: 'castigat', convertedToId: clientId })
        setShowConvertModal(false)
      }} />}
    </div>
  )
}

/* ============================================================
   CONVERT LEAD TO CLIENT MODAL — calls real API
   ============================================================ */

function ConvertLeadModal({ lead, onClose, onConverted }: { lead: any; onClose: () => void; onConverted: (clientId: string) => void }) {
  const router = useRouter()
  const [converting, setConverting] = useState(false)
  const [error, setError] = useState("")

  const handleConvert = async () => {
    setConverting(true)
    setError("")
    try {
      const res = await fetch(`/api/leads/${lead.id}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keepLead: true,
          clientData: {},
        }),
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Failed to convert')
      }

      const result = await res.json()
      const clientId = result.data.client.id

      // Notify parent and redirect
      onConverted(clientId)
      setTimeout(() => router.push(`/crm/clienti/${clientId}`), 800)
    } catch (err: any) {
      setError(err.message || 'Eroare la conversie')
      setConverting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" />
      <div className="relative bg-surface rounded-2xl border border-border shadow-2xl w-full max-w-md mx-4 animate-scale-in" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Convertește Lead → Client</h2>
            <p className="text-[11px] text-muted-foreground">Se va crea un client nou din datele lead-ului</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground">
            <XCircle size={14} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
            <p className="text-xs text-emerald-400 font-semibold mb-3">Datele care vor fi transferate:</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Companie", value: lead.companyName },
                { label: "Contact", value: lead.contactPerson },
                { label: "Email", value: lead.email },
                { label: "Telefon", value: lead.phone || 'N/A' },
                { label: "Valoare", value: formatCurrency(lead.value || 0) },
                { label: "Business Line", value: lead.businessLine?.name || 'N/A' },
              ].map((item) => (
                <div key={item.label}>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{item.label}</p>
                  <p className="text-xs font-medium text-foreground truncate">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
            <p className="text-[11px] text-amber-400"><strong>Atenție:</strong> Lead-ul va fi marcat ca „Câștigat" și va fi creat automat un Client nou cu aceste date.</p>
          </div>

          {error && (
            <div className="px-4 py-3 bg-destructive/10 border border-destructive/20 rounded-lg text-xs text-destructive font-medium">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button onClick={onClose} disabled={converting} className="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground bg-muted rounded-lg">Anulează</button>
            <button onClick={handleConvert} disabled={converting} className="px-4 py-2 text-xs font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-1.5 shadow-sm disabled:opacity-50">
              {converting ? <Loader2 size={12} className="animate-spin" /> : <UserPlus size={12} />}
              {converting ? 'Se convertește...' : 'Convertește Acum'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

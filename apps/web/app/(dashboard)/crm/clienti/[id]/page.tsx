"use client"

import { useState, useEffect, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { fetchClient, fetchActivitiesByEntity, type APIClient } from "@/lib/api"
import { cn, formatCurrency, formatDate, getInitials } from "@/lib/utils"
import { CommunicationTimeline } from "@/components/communication-timeline"
import { RetainerCard } from "@/components/retainer-card"
import { NewProjectModal } from "@/components/new-project-modal"
import { CallLogModal } from "@/components/call-log-modal"
import { DomainChipsInput } from "@/components/ui/domain-chips-input"
import { useClientCommunications } from "@/lib/hooks/use-communications"
import { BrandDNACard } from "@/components/brand-dna-card"
import { ClientWebsiteHealthTab } from "@/components/client-website-health-tab"
import {
  ArrowLeft, Phone, Mail, Globe, Calendar, DollarSign, User, FileText,
  Receipt, FolderKanban, Activity, CheckCircle2, AlertTriangle,
  ExternalLink, Edit, MoreHorizontal, CreditCard, Repeat,
  MessageSquare, PhoneCall, Video, StickyNote, Loader2,
  TrendingUp, Shield, Zap, Plus, Send, Dna, BarChart3, Copy, Sparkles,
  FormInput, Key,
} from "lucide-react"

/* ────────────────────────────────────────────── */
/*  Tab definitions                               */
/* ────────────────────────────────────────────── */

type TabKey = "overview" | "contracte" | "facturi" | "proiecte" | "oferte" | "retainer" | "comunicatii" | "activitate" | "performance" | "brand-dna" | "rapoarte" | "formulare" | "website-health"

const tabs: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: "overview",     label: "360° Overview", icon: Zap },
  { key: "brand-dna",    label: "🧬 Brand DNA", icon: Dna },
  { key: "performance",  label: "📊 Performance", icon: TrendingUp },
  { key: "website-health", label: "🏥 Website Health", icon: Zap },
  { key: "formulare",    label: "📝 Formulare",  icon: FormInput },
  { key: "rapoarte",     label: "📋 Rapoarte",   icon: BarChart3 },
  { key: "oferte",       label: "Oferte",       icon: FileText },
  { key: "facturi",      label: "Facturi",      icon: Receipt },
  { key: "proiecte",     label: "Proiecte",     icon: FolderKanban },
  { key: "contracte",    label: "Contracte",    icon: CreditCard },
  { key: "retainer",     label: "Retainer",     icon: Repeat },
  { key: "comunicatii",  label: "Comunicații",  icon: MessageSquare },
  { key: "activitate",   label: "Activitate",   icon: Activity },
]

interface Communication { id: string; type: "email"|"call"|"meeting"|"note"; direction?: "inbound"|"outbound"; subject: string; body: string; date: string; duration?: string; user: string }

function getMockComms(): Communication[] {
  return [
    { id: "c1", type: "email", direction: "outbound", subject: "Raport SEO lunar", body: "Atașăm raportul de performanță SEO pentru luna curentă cu rezultate pozitive pe toate KPI-urile.", date: "2026-04-09T14:30:00", user: "Alexandru" },
    { id: "c2", type: "call", direction: "inbound", subject: "Discuție buget Q2", body: "Clientul dorește extinderea campaniei Google Ads cu 30%. Budget aprobat intern.", date: "2026-04-07T10:00:00", duration: "22 min", user: "Andrei" },
    { id: "c3", type: "meeting", direction: "outbound", subject: "Review trimestrial", body: "Prezentare rezultate Q1, planificarea strategiei Q2. Participanți: echipa completă.", date: "2026-04-03T11:00:00", duration: "50 min", user: "Alexandru" },
    { id: "c4", type: "note", subject: "Feedback intern", body: "Clientul este mulțumit de rezultate. Pot propune upsell pe social media management.", date: "2026-04-01T09:00:00", user: "Andrei" },
  ]
}

const commIcons: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  email: { icon: Mail, color: "text-blue-400", bg: "bg-blue-500/10", label: "Email" },
  call: { icon: PhoneCall, color: "text-emerald-400", bg: "bg-emerald-500/10", label: "Apel" },
  meeting: { icon: Video, color: "text-violet-400", bg: "bg-violet-500/10", label: "Întâlnire" },
  note: { icon: StickyNote, color: "text-amber-400", bg: "bg-amber-500/10", label: "Notă" },
}

const statusBadge: Record<string, { label: string; color: string; bgColor: string }> = {
  activ:    { label: "Activ",    color: "text-emerald-400", bgColor: "bg-emerald-500/10" },
  inactiv:  { label: "Inactiv",  color: "text-red-400",    bgColor: "bg-red-500/10" },
  prospect: { label: "Prospect", color: "text-amber-400",  bgColor: "bg-amber-500/10" },
}

const offerStatusColors: Record<string, string> = {
  acceptata: "text-emerald-400 bg-emerald-500/10",
  trimisa: "text-blue-400 bg-blue-500/10",
  vizualizata: "text-blue-400 bg-blue-500/10",
  draft: "text-amber-400 bg-amber-500/10",
  contract_generat: "text-violet-400 bg-violet-500/10",
  respinsa: "text-red-400 bg-red-500/10",
  expirata: "text-red-400 bg-red-500/10",
}

const contractStatusColors: Record<string, string> = {
  draft: "text-amber-400 bg-amber-500/10",
  sent: "text-blue-400 bg-blue-500/10",
  signed: "text-emerald-400 bg-emerald-500/10",
  active: "text-emerald-400 bg-emerald-500/10",
  expired: "text-red-400 bg-red-500/10",
  terminated: "text-red-400 bg-red-500/10",
}

const projectStatusColors: Record<string, string> = {
  planificare: "text-blue-400", in_lucru: "text-amber-400", review: "text-purple-400",
  finalizat: "text-emerald-400", suspendat: "text-red-400",
}

/* ────────────────────────────────────────────── */
/*  Page                                          */
/* ────────────────────────────────────────────── */

export default function SingleClientPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabKey>("overview")
  const [commFilter, setCommFilter] = useState("all")
  const [showNewProject, setShowNewProject] = useState(false)
  const [showCallModal, setShowCallModal] = useState(false)
  const [client, setClient] = useState<APIClient | null>(null)
  const [clientActivities, setClientActivities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  // Inline edit state
  const [editMode, setEditMode] = useState(false)
  const [editForm, setEditForm] = useState<Record<string, any>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [clientRes, actRes] = await Promise.all([
          fetchClient(id),
          fetchActivitiesByEntity(id).catch(() => ({ data: [] })),
        ])
        setClient(clientRes.data)
        setClientActivities(actRes.data)
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  // Debug: confirm React hydrates and attaches handlers
  useEffect(() => {
    console.log('[CRM Client] Component mounted, React is interactive')
  }, [])

  const clientComms = useMemo(() => getMockComms(), [])
  const filteredComms = useMemo(() => commFilter === "all" ? clientComms : clientComms.filter((c) => c.type === commFilter), [commFilter, clientComms])

  // v8: Communication Hub data for this client
  const clientCommunications = useClientCommunications(id)
  // v8: Retainer data for this client (TODO: fetch from API)
  const clientRetainers: any[] = []

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 size={28} className="text-primary animate-spin" />
        <span className="ml-3 text-sm text-muted-foreground">Se încarcă clientul...</span>
      </div>
    )
  }

  if (error || !client) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <p className="text-lg font-semibold text-foreground mb-2">Client negăsit</p>
          <p className="text-sm text-muted-foreground mb-4">ID-ul „{id}" nu există.</p>
          <Link href="/crm/clienti" className="text-primary text-sm hover:underline">← Înapoi la Clienți</Link>
        </div>
      </div>
    )
  }

  const sb = statusBadge[client.status] || { label: client.status, color: "text-muted-foreground", bgColor: "bg-muted" }
  const clientOffers = client.offers || []
  const clientContracts = client.contracts || []
  const clientProjects = client.projects || []
  const clientInvoices = client.invoices || []
  const counts = client._count || { offers: 0, contracts: 0, projects: 0, invoices: 0, activities: 0 }

  // Financial aggregates from invoices
  const totalInvoiced = clientInvoices.filter((i: any) => i.direction === "emisa").reduce((s: number, i: any) => s + i.amount, 0)
  const totalPaid = clientInvoices.filter((i: any) => i.direction === "emisa" && i.status === "platita").reduce((s: number, i: any) => s + i.amount, 0)
  const totalOverdue = clientInvoices.filter((i: any) => i.direction === "emisa" && i.status === "restanta").reduce((s: number, i: any) => s + i.amount, 0)

  return (
    <div className="p-4 md:p-6 space-y-5 animate-fade-in max-w-6xl mx-auto">
      {/* Back + Actions */}
      <div className="flex items-center justify-between">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={15} /> Înapoi
        </button>
        <div className="flex items-center gap-2">
          {editMode ? (
            <>
              <button
                onClick={() => { setEditMode(false); setEditForm({}) }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
              >
                Anulează
              </button>
              <button
                disabled={saving}
                onClick={async () => {
                  setSaving(true)
                  try {
                    const res = await fetch(`/api/clients/${id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        ...editForm,
                        website: editForm.websites?.[0]
                          ? (editForm.websites[0].startsWith('http') ? editForm.websites[0] : `https://${editForm.websites[0]}`)
                          : editForm.website,
                        websites: editForm.websites || [],
                      }),
                    })
                    if (res.ok) {
                      // Reload client data
                      const clientRes = await fetchClient(id)
                      setClient(clientRes.data)
                      setEditMode(false)
                      setEditForm({})
                    }
                  } catch (err) {
                    console.error('Failed to save client:', err)
                  } finally {
                    setSaving(false)
                  }
                }}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <><Loader2 size={12} className="animate-spin" /> Salvare...</>
                ) : (
                  <><CheckCircle2 size={12} /> Salvează</>
                )}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  console.log('[CRM Client] Edit button clicked!')
                  setEditForm({
                    companyName: client.companyName || '',
                    contactPerson: client.contactPerson || '',
                    industry: client.industry || '',
                    email: client.email || '',
                    phone: client.phone || '',
                    website: client.website || '',
                    websites: client.websites?.length ? client.websites : (client.website ? [client.website.replace(/^https?:\/\//, '').replace(/\/$/, '')] : []),
                    status: client.status || 'activ',
                  })
                  setEditMode(true)
                  console.log('[CRM Client] Edit mode set to true')
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Edit size={12} /> Editează
              </button>
              <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-border hover:bg-muted transition-colors">
                <MoreHorizontal size={14} className="text-muted-foreground" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Header Card */}
      <div className={cn("bg-surface rounded-2xl border p-5 transition-all", editMode ? "border-primary/30" : "border-border")}>
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-lg font-bold text-primary flex-shrink-0">
            {getInitials(editMode ? (editForm.companyName || client.companyName) : client.companyName)}
          </div>
          <div className="flex-1 min-w-0">
            {editMode ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider mb-1 block">Nume Companie</label>
                    <input
                      value={editForm.companyName || ''}
                      onChange={(e) => setEditForm(f => ({ ...f, companyName: e.target.value }))}
                      className="w-full px-3 py-2 text-sm font-semibold bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider mb-1 block">Persoană Contact</label>
                    <input
                      value={editForm.contactPerson || ''}
                      onChange={(e) => setEditForm(f => ({ ...f, contactPerson: e.target.value }))}
                      className="w-full px-3 py-2 text-sm bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider mb-1 block">Industrie</label>
                    <input
                      value={editForm.industry || ''}
                      onChange={(e) => setEditForm(f => ({ ...f, industry: e.target.value }))}
                      className="w-full px-3 py-2 text-sm bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider mb-1 block">Status</label>
                    <select
                      value={editForm.status || 'activ'}
                      onChange={(e) => setEditForm(f => ({ ...f, status: e.target.value }))}
                      className="w-full px-3 py-2 text-sm bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      <option value="activ">Activ</option>
                      <option value="lead">Lead</option>
                      <option value="prospect">Prospect</option>
                      <option value="inactiv">Inactiv</option>
                      <option value="pierdut">Pierdut</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider mb-1 block">Email</label>
                    <input
                      type="email"
                      value={editForm.email || ''}
                      onChange={(e) => setEditForm(f => ({ ...f, email: e.target.value }))}
                      className="w-full px-3 py-2 text-sm bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider mb-1 block">Telefon</label>
                    <input
                      value={editForm.phone || ''}
                      onChange={(e) => setEditForm(f => ({ ...f, phone: e.target.value }))}
                      className="w-full px-3 py-2 text-sm bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <DomainChipsInput
                      label="Domenii Website"
                      value={editForm.websites || []}
                      onChange={(domains) => setEditForm(f => ({ ...f, websites: domains }))}
                      placeholder="ex: inchideriterase.ro"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h1 className="text-xl font-bold text-foreground">{client.companyName}</h1>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{client.businessLine.name}</span>
                  <span className={cn("px-2 py-0.5 text-[10px] font-bold rounded-full", sb.bgColor, sb.color)}>{sb.label}</span>
                </div>
                <p className="text-sm text-muted-foreground">{client.contactPerson} • {client.industry || "—"}</p>
                <div className="flex items-center gap-4 mt-2 flex-wrap text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Mail size={12} /> {client.email}</span>
                  {client.phone && <span className="flex items-center gap-1"><Phone size={12} /> {client.phone}</span>}
                  {(client.websites?.length > 0 ? client.websites : client.website ? [client.website] : []).map((w: string, i: number) => (
                    <span key={w} className="flex items-center gap-1">
                      <Globe size={12} />
                      <a href={w.startsWith('http') ? w : `https://${w}`} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                        {w.replace(/^https?:\/\//, '')}
                      </a>
                    </span>
                  ))}
                  <span className="flex items-center gap-1"><Calendar size={12} /> Client din: {formatDate(client.createdAt)}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Oferte", value: `${counts.offers}`, icon: FileText, color: "text-blue-400" },
          { label: "Contracte", value: `${counts.contracts}`, icon: CreditCard, color: "text-violet-400" },
          { label: "Proiecte", value: `${counts.projects}`, icon: FolderKanban, color: "text-amber-400" },
          { label: "Facturi", value: `${counts.invoices}`, icon: Receipt, color: "text-cyan-400" },
          { label: "Restanțe", value: formatCurrency(totalOverdue), icon: AlertTriangle, color: totalOverdue > 0 ? "text-red-400" : "text-muted-foreground" },
        ].map((kpi) => {
          const Icon = kpi.icon
          return (
            <div key={kpi.label} className="bg-surface rounded-xl border border-border p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Icon size={13} className={kpi.color} />
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{kpi.label}</span>
              </div>
              <p className="text-base font-bold text-foreground">{kpi.value}</p>
            </div>
          )
        })}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const count = tab.key === "oferte" ? counts.offers
            : tab.key === "facturi" ? counts.invoices
            : tab.key === "proiecte" ? counts.projects
            : tab.key === "contracte" ? counts.contracts
            : tab.key === "comunicatii" ? clientComms.length
            : tab.key === "activitate" ? clientActivities.length
            : undefined
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-all whitespace-nowrap",
                activeTab === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon size={13} /> {tab.label}
              {count !== undefined && count > 0 && (
                <span className="text-[9px] bg-muted px-1.5 py-0.5 rounded-full">{count}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      <div className="animate-fade-in">
        {/* Overview */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-surface rounded-xl border border-border p-4 space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Informații Companie</h3>
              {[
                { label: "CUI", value: client.cui || "—" },
                { label: "Reg. Com.", value: client.regCom || "—" },
                { label: "Adresă", value: client.address || "—" },
                { label: "Industrie", value: client.industry || "—" },
                { label: "Tip Entitate", value: client.entityType },
              ].map((d) => (
                <div key={d.label} className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">{d.label}</span>
                  <span className="text-xs font-medium text-foreground text-right max-w-[60%] truncate">{d.value}</span>
                </div>
              ))}
            </div>

            {/* v8: Service Health Snapshot */}
            <div className="space-y-3">
              <div className="bg-surface rounded-xl border border-border p-4">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                  <Shield size={14} className="text-emerald-400" />
                  Service Health
                </h3>
                <div className="space-y-2">
                  {clientProjects.length > 0 ? clientProjects.slice(0, 4).map((proj: any) => (
                    <Link key={proj.id} href={`/projects/${proj.id}`} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-muted/20 transition-colors">
                      <div className="flex items-center gap-2">
                        <span className={cn("w-2 h-2 rounded-full",
                          proj.status === 'finalizat' ? 'bg-emerald-400' :
                          proj.status === 'in_lucru' ? 'bg-primary' :
                          proj.status === 'review' ? 'bg-amber-400' :
                          proj.status === 'suspendat' ? 'bg-red-400' : 'bg-blue-400'
                        )} />
                        <span className="text-xs font-medium text-foreground">{proj.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${proj.progress || 0}%` }} />
                        </div>
                        <span className="text-[10px] text-muted-foreground w-7">{proj.progress || 0}%</span>
                      </div>
                    </Link>
                  )) : (
                    <p className="text-xs text-muted-foreground">Niciun proiect activ</p>
                  )}
                </div>
              </div>

              {/* Retainer summary */}
              {clientRetainers.length > 0 && (
                <div className="bg-surface rounded-xl border border-primary/20 p-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Repeat size={12} className="text-primary" />
                      Retainer: {clientRetainers[0]!.name}
                    </h4>
                    <span className="text-sm font-bold text-primary">{formatCurrency(clientRetainers[0]!.monthlyAmount)}/lună</span>
                  </div>
                </div>
              )}

              {/* Recent comms snapshot */}
              <div className="bg-surface rounded-xl border border-border p-4">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2">
                  <MessageSquare size={14} className="text-blue-400" /> Comunicare recentă
                </h3>
                {clientCommunications.length > 0 ? (
                  <CommunicationTimeline entries={clientCommunications} compact maxItems={3} />
                ) : (
                  <p className="text-xs text-muted-foreground">Nicio comunicare recentă</p>
                )}
              </div>
            </div>

            {/* Notes */}
            <div className="bg-surface rounded-xl border border-border p-4 space-y-3 lg:col-span-2">
              <h3 className="text-sm font-semibold text-foreground">Note</h3>
              <p className="text-sm text-foreground/70 leading-relaxed">
                {client.notes || "Nicio notă adăugată."}
              </p>
            </div>
          </div>
        )}

        {/* Oferte */}
        {activeTab === "oferte" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{clientOffers.length} ofert{clientOffers.length === 1 ? 'ă' : 'e'}</p>
              <Link href={`/offers?newFor=${id}&name=${encodeURIComponent(client.companyName)}`}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                <FileText size={12} /> + Ofertă Nouă
              </Link>
            </div>
          <div className="bg-surface rounded-xl border border-border overflow-hidden">
           <div className="overflow-x-auto">
            {clientOffers.length === 0 ? (
              <div className="p-8 text-center"><FileText size={24} className="text-muted-foreground/30 mx-auto mb-2" /><p className="text-xs text-muted-foreground">Nicio ofertă. Creează prima ofertă!</p></div>
            ) : (
              <table className="w-full min-w-[500px]">
                <thead><tr className="border-b border-border bg-muted/30 text-[10px] font-semibold text-muted-foreground uppercase">
                  <th className="px-4 py-2.5 text-left">Nr.</th><th className="px-4 py-2.5 text-left">Template</th><th className="px-4 py-2.5 text-left">Status</th><th className="px-4 py-2.5 text-right">Valoare</th><th className="px-4 py-2.5 text-center w-10"></th>
                </tr></thead>
                <tbody>{clientOffers.map((o: any) => (
                  <tr key={o.id} className="border-b border-border/50 hover:bg-muted/20 cursor-pointer group" onClick={() => router.push(`/offers/${o.id}`)}>
                    <td className="px-4 py-2.5 text-sm font-medium text-primary">{o.number}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{o.templateName || "—"}</td>
                    <td className="px-4 py-2.5"><span className={cn("text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full", offerStatusColors[o.status] || "text-muted-foreground bg-muted")}>{o.status?.replace("_", " ")}</span></td>
                    <td className="px-4 py-2.5 text-sm font-bold text-foreground text-right">{formatCurrency(o.value)} {o.currency}</td>
                    <td className="px-4 py-2.5 text-center"><ExternalLink size={12} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" /></td>
                  </tr>
                ))}</tbody>
              </table>
            )}
           </div>
          </div>
          </div>
        )}

        {/* Facturi */}
        {activeTab === "facturi" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{clientInvoices.length} factur{clientInvoices.length === 1 ? 'ă' : 'i'}</p>
              <Link href={`/finance?clientId=${id}&newInvoice=true`}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                <Plus size={12} /> Factură Nouă
              </Link>
            </div>
          <div className="bg-surface rounded-xl border border-border overflow-hidden">
           <div className="overflow-x-auto">
            {clientInvoices.length === 0 ? (
              <div className="p-8 text-center">
                <Receipt size={28} className="text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm font-medium text-foreground mb-1">Nicio factură</p>
                <p className="text-xs text-muted-foreground mb-4">Emite prima factură pentru acest client</p>
                <Link href={`/finance?clientId=${id}&newInvoice=true`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                  <Plus size={12} /> Emite Factură
                </Link>
              </div>
            ) : (
              <table className="w-full min-w-[500px]">
                <thead><tr className="border-b border-border bg-muted/30 text-[10px] font-semibold text-muted-foreground uppercase">
                  <th className="px-4 py-2.5 text-left">Nr.</th><th className="px-4 py-2.5 text-left">Tip</th><th className="px-4 py-2.5 text-left">Status</th><th className="px-4 py-2.5 text-right">Sumă</th><th className="px-4 py-2.5 text-left">Scadent</th>
                </tr></thead>
                <tbody>{clientInvoices.map((inv: any) => {
                  const invColor = inv.status === "platita" ? "text-emerald-400" : inv.status === "restanta" ? "text-red-400" : "text-blue-400"
                  return (
                    <tr key={inv.id} className="border-b border-border/50 hover:bg-muted/20">
                      <td className="px-4 py-2.5 text-sm font-medium text-foreground">{inv.number}</td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground capitalize">{inv.type || inv.direction}</td>
                      <td className="px-4 py-2.5"><span className={cn("text-[10px] font-bold uppercase", invColor)}>{inv.status}</span></td>
                      <td className="px-4 py-2.5 text-sm font-bold text-foreground text-right">{formatCurrency(inv.amount)}</td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{formatDate(inv.dueDate)}</td>
                    </tr>
                  )
                })}</tbody>
              </table>
            )}
           </div>
          </div>
          </div>
        )}

        {/* Proiecte */}
        {activeTab === "proiecte" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{clientProjects.length} proiect{clientProjects.length === 1 ? '' : 'e'}</p>
              <button
                onClick={() => setShowNewProject(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Plus size={12} /> Proiect Nou
              </button>
            </div>
            {clientProjects.length === 0 ? (
              <div className="bg-surface rounded-xl border border-dashed border-border p-8 text-center">
                <FolderKanban size={28} className="text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm font-medium text-foreground mb-1">Niciun proiect</p>
                <p className="text-xs text-muted-foreground mb-4">Creează primul proiect pentru acest client</p>
                <button
                  onClick={() => setShowNewProject(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  <Plus size={12} /> Creează Proiect
                </button>
              </div>
            ) : clientProjects.map((proj: any) => (
              <Link key={proj.id} href={`/projects/${proj.id}`} className="block bg-surface rounded-xl border border-border p-4 hover:border-primary/30 transition-all group">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{proj.name}</p>
                    <span className={cn("text-[10px] font-bold uppercase", projectStatusColors[proj.status])}>{proj.status?.replace("_", " ")}</span>
                  </div>
                  <ExternalLink size={13} className="text-muted-foreground/30 group-hover:text-primary transition-colors" />
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${proj.progress || 0}%` }} />
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Contracte */}
        {activeTab === "contracte" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{clientContracts.length} contract{clientContracts.length === 1 ? '' : 'e'}</p>
              <div className="flex items-center gap-2">
                {clientOffers.length > 0 && clientOffers.slice(0, 2).map((o: any) => (
                  <Link key={o.id} href={`/contracts/generate?offerId=${o.id}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors">
                    <CreditCard size={12} /> Contract din {o.number}
                  </Link>
                ))}
                <Link href={`/contracts/generate?clientId=${id}&clientName=${encodeURIComponent(client.companyName)}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                  <Plus size={12} /> Contract Nou
                </Link>
              </div>
            </div>
            {clientContracts.length === 0 ? (
              <div className="bg-surface rounded-xl border border-border p-8 text-center">
                <CreditCard size={24} className="text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Niciun contract</p>
                {clientOffers.length > 0 && <p className="text-[10px] text-muted-foreground mt-1">Generează un contract din una din ofertele existente ↑</p>}
              </div>
            ) : (
              <div className="bg-surface rounded-xl border border-border overflow-hidden">
               <div className="overflow-x-auto">
                <table className="w-full min-w-[500px]">
                  <thead><tr className="border-b border-border bg-muted/30 text-[10px] font-semibold text-muted-foreground uppercase">
                    <th className="px-4 py-2.5 text-left">Nr. Contract</th>
                    <th className="px-4 py-2.5 text-left">Status</th>
                    <th className="px-4 py-2.5 text-right">Valoare</th>
                    <th className="px-4 py-2.5 text-left">Perioadă</th>
                    <th className="px-4 py-2.5 text-center w-10"></th>
                  </tr></thead>
                  <tbody>{clientContracts.map((c: any) => (
                    <tr key={c.id} className="border-b border-border/50 hover:bg-muted/20 group">
                      <td className="px-4 py-2.5 text-sm font-medium text-primary cursor-pointer" onClick={() => router.push(`/contracts/${c.id}`)}>{c.number}</td>
                      <td className="px-4 py-2.5"><span className={cn("text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full", contractStatusColors[c.status] || "text-muted-foreground bg-muted")}>{c.status}</span></td>
                      <td className="px-4 py-2.5 text-sm font-bold text-foreground text-right">{c.value} {c.currency}</td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{c.duration ? `${c.duration} luni` : "—"}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); router.push(`/contracts/${c.id}?send=true`) }}
                            title="Trimite pe email"
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-blue-400 hover:bg-blue-500/10 transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Send size={12} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); router.push(`/contracts/${c.id}`) }}
                            title="Deschide contract"
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all opacity-0 group-hover:opacity-100"
                          >
                            <ExternalLink size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}</tbody>
                </table>
               </div>
              </div>
            )}
          </div>
        )}

        {/* Retainer Tab */}
        {activeTab === "retainer" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{clientRetainers.length} retainer{clientRetainers.length === 1 ? '' : 'e'}</p>
              <Link href={`/finance?tab=retainere&clientId=${id}`}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                <Plus size={12} /> Retainer Nou
              </Link>
            </div>
            {clientRetainers.length === 0 ? (
              <div className="bg-surface rounded-xl border border-dashed border-border p-8 text-center">
                <Repeat size={28} className="text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm font-medium text-foreground mb-1">Niciun retainer activ</p>
                <p className="text-xs text-muted-foreground mb-4">Configurează un pachet recurent pentru acest client</p>
                <Link href={`/finance?tab=retainere&clientId=${id}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                  <Plus size={12} /> Adaugă Retainer
                </Link>
              </div>
            ) : (
              clientRetainers.map(r => <RetainerCard key={r.id} retainer={r} />)
            )}
          </div>
        )}

        {/* Comunicații — v8: uses CommunicationTimeline */}
        {activeTab === "comunicatii" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{clientCommunications.length} comunicăr{clientCommunications.length === 1 ? 'e' : 'i'}</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowCallModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-500/10 text-emerald-400 rounded-lg hover:bg-emerald-500/20 transition-colors"
                >
                  <Phone size={12} /> Apel Nou
                </button>
                <Link href={`/communications`}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                  <Plus size={12} /> Comunicare Nouă
                </Link>
              </div>
            </div>
            {clientCommunications.length > 0 ? (
              <CommunicationTimeline entries={clientCommunications} />
            ) : (
              <div className="bg-surface rounded-xl border border-dashed border-border p-8 text-center">
                <MessageSquare size={28} className="text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm font-medium text-foreground mb-1">Nicio comunicare</p>
                <p className="text-xs text-muted-foreground mb-4">Înregistrează primul apel sau email pentru acest client</p>
                <button
                  onClick={() => setShowCallModal(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-emerald-500/10 text-emerald-400 rounded-lg hover:bg-emerald-500/20 transition-colors"
                >
                  <Phone size={12} /> Înregistrează Apel
                </button>
              </div>
            )}
          </div>
        )}

        {/* Performance (Client-level KPIs) */}
        {activeTab === "performance" && (
          <ClientPerformanceTab clientId={id} />
        )}

        {/* Website Health */}
        {activeTab === "website-health" && (
          <ClientWebsiteHealthTab clientId={id} />
        )}

        {/* Brand DNA */}
        {activeTab === "brand-dna" && (
          <BrandDNACard
            clientId={id}
            clientWebsite={client.website}
            clientWebsites={client.websites}
          />
        )}

        {/* Rapoarte */}
        {activeTab === "rapoarte" && (
          <ClientReportsTab clientId={id} clientName={client.companyName} />
        )}

        {/* Formulare */}
        {activeTab === "formulare" && (
          <FormLeadsTab clientId={id} clientName={client.companyName} />
        )}

        {/* Activitate */}
        {activeTab === "activitate" && (
          <div className="bg-surface rounded-xl border border-border p-4">
            {clientActivities.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Nicio activitate.</p>
            ) : (
              <div className="space-y-3">
                {clientActivities.map((act: any) => (
                  <div key={act.id} className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">{act.action} — {act.entityType}</p>
                      <p className="text-[11px] text-muted-foreground">{act.entityName}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground flex-shrink-0">{formatDate(act.createdAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* New Project Modal */}
      <NewProjectModal
        open={showNewProject}
        onClose={() => setShowNewProject(false)}
        clientId={id}
        clientName={client.companyName}
      />

      {/* Call Log Modal */}
      <CallLogModal
        open={showCallModal}
        onClose={() => setShowCallModal(false)}
        onSave={(entry) => {
          console.log("Call logged for client:", client.companyName, entry)
          setShowCallModal(false)
        }}
      />
    </div>
  )
}

// ─── Client Performance Tab ───

function ClientPerformanceTab({ clientId }: { clientId: string }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/clients/${clientId}/kpis`)
      .then(r => r.json())
      .then(j => { if (j.data) setData(j.data) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [clientId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={24} className="text-primary animate-spin" />
        <span className="ml-3 text-sm text-muted-foreground">Se încarcă metricile...</span>
      </div>
    )
  }

  if (!data || !data.domains?.length) {
    return (
      <div className="bg-surface rounded-xl border border-dashed border-border p-8 text-center">
        <TrendingUp size={28} className="text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm font-medium text-foreground mb-1">Fără date de performanță</p>
        <p className="text-xs text-muted-foreground">Configurează integrări PostHog sau Telnyx pe proiecte.</p>
      </div>
    )
  }

  const healthColor = (score: number | null) => {
    if (!score) return 'text-muted-foreground'
    if (score >= 80) return 'text-emerald-400'
    if (score >= 50) return 'text-amber-400'
    return 'text-red-400'
  }

  const healthBg = (score: number | null) => {
    if (!score) return 'bg-muted/30'
    if (score >= 80) return 'bg-emerald-500/5 border-emerald-500/20'
    if (score >= 50) return 'bg-amber-500/5 border-amber-500/20'
    return 'bg-red-500/5 border-red-500/20'
  }

  return (
    <div className="space-y-5">
      {/* Global Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-surface rounded-xl border border-border p-4 text-center">
          <p className={cn("text-2xl font-bold", healthColor(data.avgHealthScore))}>
            {data.avgHealthScore !== null ? `${data.avgHealthScore}%` : '—'}
          </p>
          <p className="text-[10px] text-muted-foreground uppercase mt-1">Health Mediu</p>
        </div>
        <div className="bg-surface rounded-xl border border-border p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{data.totalProjects}</p>
          <p className="text-[10px] text-muted-foreground uppercase mt-1">Proiecte</p>
        </div>
        <div className="bg-surface rounded-xl border border-border p-4 text-center">
          <p className="text-2xl font-bold text-green-400">{data.totalCalls}</p>
          <p className="text-[10px] text-muted-foreground uppercase mt-1">Apeluri Total</p>
        </div>
        <div className="bg-surface rounded-xl border border-border p-4 text-center">
          <p className="text-2xl font-bold text-emerald-400">{Math.round(data.totalCallDuration / 60)}m</p>
          <p className="text-[10px] text-muted-foreground uppercase mt-1">Minute Convorbiri</p>
        </div>
      </div>

      {/* Per-Domain Cards */}
      {data.domains.map((domain: any, idx: number) => {
        const health = domain.posthog?.health
        const vitals = domain.posthog?.webVitals
        const telnyx = domain.telnyx
        const score = health?.healthScore ?? null

        return (
          <div key={idx} className={cn("rounded-xl border p-5 space-y-4", healthBg(score))}>
            {/* Domain Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold", healthColor(score), "bg-background/50")}>
                  {score !== null ? `${score}` : '—'}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    🌐 {domain.domainLabel || (domain.posthogId ? `PostHog #${domain.posthogId}` : 'Fără integrare')}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {domain.projects.map((p: any) => (
                      <Link key={p.id} href={`/projects/${p.id}`}
                        className="text-[10px] text-primary hover:underline">
                        {p.name}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
              {score !== null && (
                <span className={cn("text-xs font-bold px-2 py-1 rounded-full",
                  score >= 80 ? 'bg-emerald-500/10 text-emerald-400' :
                  score >= 50 ? 'bg-amber-500/10 text-amber-400' :
                  'bg-red-500/10 text-red-400'
                )}>
                  {score >= 80 ? '🟢 Sănătos' : score >= 50 ? '🟡 Atenție' : '🔴 Probleme'}
                </span>
              )}
            </div>

            {/* Metrics Grid */}
            {(health || vitals) && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {health && (
                  <>
                    <div className="text-center p-2 bg-background/40 rounded-lg">
                      <p className="text-sm font-bold text-foreground">{health.totalPageviews ?? '—'}</p>
                      <p className="text-[9px] text-muted-foreground">Pageviews</p>
                    </div>
                    <div className="text-center p-2 bg-background/40 rounded-lg">
                      <p className="text-sm font-bold text-foreground">{health.totalSessions ?? '—'}</p>
                      <p className="text-[9px] text-muted-foreground">Sesiuni</p>
                    </div>
                    <div className="text-center p-2 bg-background/40 rounded-lg">
                      <p className="text-sm font-bold text-foreground">{health.jsErrors ?? '—'}</p>
                      <p className="text-[9px] text-muted-foreground">JS Errors</p>
                    </div>
                  </>
                )}
                {vitals && (
                  <>
                    <div className="text-center p-2 bg-background/40 rounded-lg">
                      <p className="text-sm font-bold text-foreground">
                        {vitals.lcp ? `${(vitals.lcp / 1000).toFixed(1)}s` : '—'}
                      </p>
                      <p className="text-[9px] text-muted-foreground">
                        {vitals.lcpStatus === 'good' ? '🟢' : vitals.lcpStatus === 'needs-improvement' ? '🟡' : '🔴'} LCP
                      </p>
                    </div>
                    <div className="text-center p-2 bg-background/40 rounded-lg">
                      <p className="text-sm font-bold text-foreground">{vitals.cls ?? '—'}</p>
                      <p className="text-[9px] text-muted-foreground">
                        {vitals.clsStatus === 'good' ? '🟢' : vitals.clsStatus === 'needs-improvement' ? '🟡' : '🔴'} CLS
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Call Stats per domain */}
            {telnyx && !telnyx.error && telnyx.totalCalls > 0 && (
              <div className="bg-background/30 rounded-lg p-3">
                <p className="text-[10px] text-muted-foreground uppercase font-medium mb-2">📞 Apeluri</p>
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-foreground font-medium">{telnyx.totalCalls} apeluri</span>
                  <span className="text-muted-foreground">durata medie: {telnyx.avgDuration}s</span>
                  <span className="text-muted-foreground">{Math.round(telnyx.totalDuration / 60)} minute total</span>
                </div>
                {telnyx.bySource?.length > 0 && (
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {telnyx.bySource.map((s: any, i: number) => (
                      <span key={i} className={cn(
                        "text-[9px] px-2 py-0.5 rounded-full font-medium",
                        s.source === 'google_ads' ? 'bg-blue-500/10 text-blue-400' :
                        s.source === 'organic' || s.source === 'seo' ? 'bg-green-500/10 text-green-400' :
                        s.source === 'facebook' ? 'bg-purple-500/10 text-purple-400' :
                        'bg-muted text-muted-foreground'
                      )}>
                        {s.label}: {s.count}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}


// ─── Client Reports Tab ───

interface ClientReport {
  id: string; token: string; title: string; domain: string | null; status: string
  viewCount: number; sentAt: string | null; viewedAt: string | null
  createdAt: string; publicUrl: string
  snapshots: Array<{ id: string; dateFrom: string; dateTo: string; createdAt: string }>
}

function ClientReportsTab({ clientId, clientName }: { clientId: string; clientName: string }) {
  const [reports, setReports] = useState<ClientReport[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [domains, setDomains] = useState<string[]>([])
  const [selectedDomain, setSelectedDomain] = useState("")
  const [reportTitle, setReportTitle] = useState("")
  const [sendTarget, setSendTarget] = useState<ClientReport | null>(null)
  const [sendTo, setSendTo] = useState("")
  const [sendCc, setSendCc] = useState("")
  const [sendMsg, setSendMsg] = useState("")
  const [sendFiles, setSendFiles] = useState<File[]>([])
  const [sending, setSending] = useState(false)
  const [clientEmail, setClientEmail] = useState("")

  useEffect(() => {
    fetchReports()
    fetchDomains()
  }, [clientId])

  async function fetchReports() {
    setLoading(true)
    try {
      const res = await fetch(`/api/reports?clientId=${clientId}`)
      const json = await res.json()
      setReports(json.data || [])
    } catch {} finally { setLoading(false) }
  }

  async function fetchDomains() {
    try {
      const [clientRes, projRes] = await Promise.all([
        fetch(`/api/clients/${clientId}`),
        fetch(`/api/projects?clientId=${clientId}`),
      ])
      const clientJson = await clientRes.json()
      const projJson = await projRes.json()
      const client = clientJson.data || clientJson
      const projects = projJson.data || []
      if (client.email) setClientEmail(client.email)

      const domainSet = new Set<string>()
      if (client.website) {
        const d = client.website.replace(/^https?:\/\//, '').replace(/\/.*$/, '')
        if (d) domainSet.add(d)
      }
      if (client.websites?.length) {
        for (const w of client.websites) {
          const d = w.replace(/^https?:\/\//, '').replace(/\/.*$/, '')
          if (d) domainSet.add(d)
        }
      }
      for (const p of projects) {
        const meta = p.metadata || {}
        if (meta.gscSiteUrl) {
          const d = meta.gscSiteUrl.replace('sc-domain:', '').replace(/^https?:\/\//, '')
          if (d) domainSet.add(d)
        }
        const match = p.name?.match(/[\w-]+\.\w{2,}/)
        if (match) domainSet.add(match[0])
      }
      setDomains(Array.from(domainSet).sort())
    } catch {}
  }

  async function createReport() {
    if (domains.length > 0 && !selectedDomain) return
    setCreating(true)
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          domain: selectedDomain || undefined,
          title: reportTitle || undefined,
          widgets: [
            { type: "conversions_hero", label: "🏆 Rezultate", enabled: true },
            { type: "source_attribution", label: "📊 Surse", enabled: true },
            { type: "conversion_details", label: "📊 Conversii Detaliate", enabled: true },
            { type: "google_ads_kpis", label: "📣 Ads KPIs", enabled: true },
            { type: "google_ads_trend", label: "📣 Ads Trend", enabled: true },
            { type: "google_ads_tables", label: "📣 Ads Tables", enabled: true },
            { type: "google_ads_extended", label: "📣 Ads Analiză Extinsă", enabled: true },
            { type: "seo_kpis", label: "🔍 SEO KPIs", enabled: true },
            { type: "seo_trend", label: "🔍 SEO Trend", enabled: true },
            { type: "seo_tables", label: "🔍 SEO Tables", enabled: true },
            { type: "seo_articles", label: "📝 Articole", enabled: true },
            { type: "seo_page_keywords", label: "🔗 SEO Pagini & Recomandări", enabled: true },
            { type: "social_breakdown", label: "🌐 Social", enabled: true },
            { type: "site_health", label: "📈 Health", enabled: true },
          ],
        }),
      })
      const json = await res.json()
      if (res.ok) {
        show(`✅ Raport creat! URL: ${json.data.publicUrl}`)
        setShowCreate(false)
        setSelectedDomain("")
        setReportTitle("")
        fetchReports()
      } else {
        show(`❌ ${json.error}`)
      }
    } finally { setCreating(false) }
  }

  async function generateSnapshot(report: ClientReport) {
    const now = new Date()
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const to = new Date(now.getFullYear(), now.getMonth(), 0)
    try {
      const res = await fetch(`/api/reports/${report.id}/snapshot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dateFrom: from.toISOString().slice(0, 10), dateTo: to.toISOString().slice(0, 10) }),
      })
      show(res.ok ? "✅ Interpretare AI generată!" : `❌ ${(await res.json()).error}`)
      fetchReports()
    } catch (err: any) { show(`❌ ${err.message}`) }
  }

  function copyUrl(url: string) {
    navigator.clipboard.writeText(url)
    show("📋 Link copiat!")
  }

  function show(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  function openSend(report: ClientReport) {
    setSendTarget(report)
    setSendTo(clientEmail)
    setSendCc("")
    setSendMsg("")
    setSendFiles([])
  }

  async function handleSend() {
    if (!sendTarget || !sendTo.trim()) return
    setSending(true)
    try {
      const formData = new FormData()
      formData.append("to", sendTo.trim())
      formData.append("cc", sendCc)
      formData.append("message", sendMsg)
      for (const f of sendFiles) formData.append("attachments", f)
      const res = await fetch(`/api/reports/${sendTarget.id}/send`, { method: "POST", body: formData })
      const json = await res.json()
      show(res.ok ? `✅ Email trimis la ${sendTo}` : `❌ ${json.error}`)
      setSendTarget(null)
      fetchReports()
    } catch (err: any) { show(`❌ ${err.message}`) }
    finally { setSending(false) }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={24} className="text-primary animate-spin" />
        <span className="ml-3 text-sm text-muted-foreground">Se încarcă rapoartele...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {toast && (
        <div className="bg-surface border border-border rounded-xl px-4 py-3 shadow-lg text-sm text-foreground">
          {toast}
        </div>
      )}

      {/* ── Create Report Modal ── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-surface rounded-2xl border border-border shadow-2xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-foreground">Raport Nou — {clientName}</h2>
              <button onClick={() => setShowCreate(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            {domains.length > 0 ? (
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-1.5">
                  <Globe size={12} /> Domeniu *
                </label>
                <select value={selectedDomain} onChange={e => { setSelectedDomain(e.target.value); setReportTitle(`Raport Performanță — ${e.target.value}`) }}
                  className="w-full px-3 py-2.5 bg-muted/20 border border-border rounded-lg text-sm text-foreground focus:ring-2 focus:ring-primary/30">
                  <option value="">Selectează domeniu...</option>
                  {domains.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            ) : (
              <div className="bg-muted/20 rounded-lg p-3 text-xs text-muted-foreground">
                Clientul nu are domenii configurate. Raportul va folosi integrările la nivel de client.
              </div>
            )}
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Titlu</label>
              <input value={reportTitle} onChange={e => setReportTitle(e.target.value)} placeholder="Raport Performanță"
                className="w-full px-3 py-2 bg-muted/20 border border-border rounded-lg text-sm text-foreground" />
            </div>
            <button onClick={createReport} disabled={creating || (domains.length > 0 && !selectedDomain)}
              className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50">
              {creating ? "Se creează..." : "Creează Raport"}
            </button>
          </div>
        </div>
      )}

      {/* ── Send Email Modal ── */}
      {sendTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSendTarget(null)}>
          <div className="bg-surface rounded-2xl border border-border shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-primary/10 to-accent/10 px-6 py-4 border-b border-border">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-foreground">Trimite Raport</h2>
                  <p className="text-[11px] text-muted-foreground">{sendTarget.title}{sendTarget.domain ? ` · ${sendTarget.domain}` : ''}</p>
                </div>
                <button onClick={() => setSendTarget(null)} className="text-muted-foreground hover:text-foreground">✕</button>
              </div>
            </div>
            <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">📧 Destinatar *</label>
                <input type="email" value={sendTo} onChange={e => setSendTo(e.target.value)} placeholder="email@client.ro"
                  className="w-full px-3 py-2.5 bg-muted/20 border border-border rounded-lg text-sm text-foreground focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">👥 CC <span className="font-normal text-[10px]">(separat cu virgulă)</span></label>
                <input type="text" value={sendCc} onChange={e => setSendCc(e.target.value)} placeholder="manager@client.ro"
                  className="w-full px-3 py-2.5 bg-muted/20 border border-border rounded-lg text-sm text-foreground focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">💬 Mesaj <span className="font-normal text-[10px]">(opțional)</span></label>
                <textarea value={sendMsg} onChange={e => setSendMsg(e.target.value)} rows={3} placeholder="Vă transmitem raportul..."
                  className="w-full px-3 py-2.5 bg-muted/20 border border-border rounded-lg text-sm text-foreground resize-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">📎 Facturi PDF</label>
                <input type="file" accept=".pdf" multiple onChange={e => { if (e.target.files) setSendFiles(prev => [...prev, ...Array.from(e.target.files!)]) }}
                  className="w-full text-xs text-muted-foreground file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-muted file:text-foreground" />
                {sendFiles.length > 0 && <div className="mt-2 space-y-1">{sendFiles.map((f, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-1.5 bg-muted/20 rounded-lg text-xs">
                    <span className="truncate text-foreground">{f.name}</span>
                    <button onClick={() => setSendFiles(prev => prev.filter((_, j) => j !== i))} className="text-destructive text-[10px] ml-2">✕</button>
                  </div>
                ))}</div>}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-border flex justify-end gap-2">
              <button onClick={() => setSendTarget(null)} className="px-4 py-2 text-sm text-muted-foreground rounded-lg hover:bg-muted/50">Anulează</button>
              <button onClick={handleSend} disabled={!sendTo.trim() || sending}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold disabled:opacity-50">
                {sending ? <><Loader2 size={14} className="animate-spin" /> Se trimite...</> : <><Send size={14} /> Trimite</>}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{reports.length} raport{reports.length !== 1 ? 'e' : ''}</p>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          <Plus size={12} />
          {reports.length === 0 ? "Creează Raport" : "Raport Nou"}
        </button>
      </div>

      {reports.length === 0 ? (
        <div className="bg-surface rounded-xl border border-dashed border-border p-8 text-center">
          <BarChart3 size={28} className="text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground mb-1">Niciun raport</p>
          <p className="text-xs text-muted-foreground mb-4">
            Creează un raport de performanță cu URL permanent pentru acest client.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus size={12} /> Creează Primul Raport
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map(r => (
            <div key={r.id} className="bg-surface rounded-xl border border-border p-4 hover:border-primary/30 transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <BarChart3 size={18} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{r.title}</p>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                      {r.domain && (
                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                          <Globe size={10} /> {r.domain}
                        </span>
                      )}
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${r.status === "active" ? "bg-emerald-500/10 text-emerald-400" : "bg-muted text-muted-foreground"}`}>
                        {r.status}
                      </span>
                      <span className="flex items-center gap-1"><Activity size={10} /> {r.viewCount} vizualizări</span>
                      {r.sentAt && <span className="flex items-center gap-1"><Send size={10} /> Trimis</span>}
                      <span>{r.snapshots?.length || 0} interpretări AI</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => copyUrl(r.publicUrl)}
                    title="Copiază link public"
                    className="p-2 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Copy size={14} />
                  </button>
                  <a
                    href={r.publicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Deschide raportul"
                    className="p-2 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ExternalLink size={14} />
                  </a>
                  <button
                    onClick={() => generateSnapshot(r)}
                    title="Generează interpretare AI"
                    className="p-2 rounded-lg hover:bg-accent/20 text-accent transition-colors"
                  >
                    <Sparkles size={14} />
                  </button>
                  <button
                    onClick={() => openSend(r)}
                    title="Trimite email"
                    className="p-2 rounded-lg hover:bg-primary/20 text-primary transition-colors"
                  >
                    <Send size={14} />
                  </button>
                </div>
              </div>

              {/* Quick URL preview */}
              <div className="mt-3 px-3 py-2 bg-muted/30 rounded-lg flex items-center justify-between">
                <code className="text-[11px] text-muted-foreground truncate mr-2">{r.publicUrl}</code>
                <button
                  onClick={() => copyUrl(r.publicUrl)}
                  className="text-[10px] text-primary font-semibold hover:underline flex-shrink-0"
                >
                  Copiază
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ────────────────────────────────────────────── */
/*  Tab: Formulare & Lead Tracking               */
/* ────────────────────────────────────────────── */

interface LeadAnalytics {
  total: number
  converted: number
  conversionRate: number
  byPage: { page: string; count: number; converted: number; conversionRate: number }[]
  byService: { service: string; count: number; converted: number }[]
  byDomain: { domain: string; count: number; converted: number }[]
  byUtmSource: { source: string; count: number; converted: number }[]
  byCampaign: { campaign: string; count: number }[]
  recent: { id: string; name: string; email: string; phone: string; domain: string; page: string; service: string; utmSource: string; createdAt: string }[]
}

interface ApiKeyData {
  id: string; key: string; domain: string; label: string; isActive: boolean; createdAt: string
}

function FormLeadsTab({ clientId, clientName }: { clientId: string; clientName: string }) {
  const [analytics, setAnalytics] = useState<LeadAnalytics | null>(null)
  const [apiKeys, setApiKeys] = useState<ApiKeyData[]>([])
  const [loading, setLoading] = useState(true)
  const [newDomain, setNewDomain] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [showCode, setShowCode] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    async function fetchAll() {
      setLoading(true)
      const [analyticsRes, keysRes] = await Promise.all([
        fetch(`/api/analytics/leads?clientId=${clientId}`).then(r => r.json()).catch(() => null),
        fetch(`/api/clients/${clientId}/api-keys`).then(r => r.json()).catch(() => ({ data: [] })),
      ])
      setAnalytics(analyticsRes)
      setApiKeys(keysRes.data || [])
      setLoading(false)
    }
    fetchAll()
  }, [clientId])

  const handleCreateKey = async () => {
    if (!newDomain.trim()) return
    const res = await fetch(`/api/clients/${clientId}/api-keys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain: newDomain, label: newLabel }),
    })
    const data = await res.json()
    if (data.data) {
      setApiKeys(prev => [data.data, ...prev])
      setNewDomain('')
      setNewLabel('')
    }
  }

  const handleDeleteKey = async (keyId: string) => {
    await fetch(`/api/clients/${clientId}/api-keys`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyId }),
    })
    setApiKeys(prev => prev.filter(k => k.id !== keyId))
  }

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  )

  const getSnippet = (apiKey: string) =>
    `<script src="https://admin.asns.ro/asns-forms.js"\n        data-key="${apiKey}"\n        data-service="general">\n</script>`

  return (
    <div className="space-y-4">
      {/* ── KPI Hero ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-surface rounded-xl border border-border p-4 text-center">
          <p className="text-2xl font-bold text-foreground tabular-nums">{analytics?.total || 0}</p>
          <p className="text-[10px] text-muted-foreground">Total cereri</p>
        </div>
        <div className="bg-surface rounded-xl border border-border p-4 text-center">
          <p className="text-2xl font-bold text-emerald-400 tabular-nums">{analytics?.converted || 0}</p>
          <p className="text-[10px] text-muted-foreground">Convertite</p>
        </div>
        <div className="bg-surface rounded-xl border border-border p-4 text-center">
          <p className="text-2xl font-bold text-primary tabular-nums">{analytics?.conversionRate || 0}%</p>
          <p className="text-[10px] text-muted-foreground">Rată conversie</p>
        </div>
        <div className="bg-surface rounded-xl border border-border p-4 text-center">
          <p className="text-2xl font-bold text-blue-400 tabular-nums">{apiKeys.length}</p>
          <p className="text-[10px] text-muted-foreground">API Keys active</p>
        </div>
      </div>

      {/* ── Breakdown by Page & Service ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* By Page */}
        <div className="bg-surface rounded-xl border border-border p-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
            <Globe size={14} className="text-blue-400" />
            Top pagini conversie
          </h3>
          {(analytics?.byPage || []).length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3">Încă nu sunt date</p>
          ) : (
            <div className="space-y-2">
              {analytics!.byPage.slice(0, 8).map(p => (
                <div key={p.page} className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{p.page}</p>
                    <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden mt-0.5">
                      <div
                        className="h-full bg-primary/60 rounded-full"
                        style={{ width: `${analytics!.total > 0 ? (p.count / analytics!.total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs font-bold text-foreground tabular-nums">{p.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* By Service */}
        <div className="bg-surface rounded-xl border border-border p-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
            <Zap size={14} className="text-amber-400" />
            Servicii solicitate
          </h3>
          {(analytics?.byService || []).length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3">Încă nu sunt date</p>
          ) : (
            <div className="space-y-2">
              {analytics!.byService.slice(0, 8).map(s => (
                <div key={s.service} className="flex items-center justify-between">
                  <span className="text-xs text-foreground">{s.service}</span>
                  <span className="text-xs font-bold text-foreground tabular-nums">{s.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── UTM Sources ── */}
      {(analytics?.byUtmSource || []).length > 0 && (
        <div className="bg-surface rounded-xl border border-border p-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
            <TrendingUp size={14} className="text-green-400" />
            Surse trafic (UTM)
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {analytics!.byUtmSource.slice(0, 8).map(u => (
              <div key={u.source} className="bg-muted/30 rounded-lg p-2 text-center">
                <p className="text-sm font-bold text-foreground tabular-nums">{u.count}</p>
                <p className="text-[10px] text-muted-foreground">{u.source}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Recent Leads ── */}
      {(analytics?.recent || []).length > 0 && (
        <div className="bg-surface rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Ultimele cereri</h3>
          </div>
          <div className="divide-y divide-border">
            {analytics!.recent.map(l => (
              <div key={l.id} className="px-4 py-2.5 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{l.name}</p>
                  <p className="text-[10px] text-muted-foreground">{l.email} • {l.page || '/'}</p>
                </div>
                <span className="text-[10px] text-muted-foreground flex-shrink-0 tabular-nums">
                  {formatDate(l.createdAt)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── API Keys Management ── */}
      <div className="bg-surface rounded-xl border border-border p-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
          <Key size={14} className="text-purple-400" />
          API Keys — Integrare Formulare
        </h3>
        <p className="text-[11px] text-muted-foreground mb-3">
          Generează un API key pentru fiecare domeniu al clientului. Adaugă snippet-ul JS pe site.
        </p>

        {/* Create new key */}
        <div className="flex gap-2 mb-3">
          <input
            placeholder="Domeniu (ex: qualitycontrol.com.ro)"
            value={newDomain}
            onChange={e => setNewDomain(e.target.value)}
            className="flex-1 px-3 py-1.5 text-xs bg-muted/30 border border-border rounded-lg text-foreground placeholder:text-muted-foreground"
          />
          <input
            placeholder="Label (opțional)"
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
            className="w-36 px-3 py-1.5 text-xs bg-muted/30 border border-border rounded-lg text-foreground placeholder:text-muted-foreground"
          />
          <button
            onClick={handleCreateKey}
            disabled={!newDomain.trim()}
            className="px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-lg font-medium disabled:opacity-50 flex items-center gap-1"
          >
            <Plus size={12} /> Generează
          </button>
        </div>

        {/* Existing keys */}
        {apiKeys.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-3">Nicio cheie API. Creează una pentru a începe tracking-ul formularelor.</p>
        ) : (
          <div className="space-y-2">
            {apiKeys.map(k => (
              <div key={k.id} className="bg-muted/20 rounded-lg p-3 border border-border/50">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Globe size={12} className="text-blue-400" />
                    <span className="text-xs font-medium text-foreground">{k.domain}</span>
                    {k.label && <span className="text-[10px] text-muted-foreground">— {k.label}</span>}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setShowCode(showCode === k.id ? null : k.id)}
                      className="text-[10px] text-primary hover:underline"
                    >
                      {showCode === k.id ? 'Ascunde cod' : 'Cod integrare'}
                    </button>
                    <button
                      onClick={() => handleDeleteKey(k.id)}
                      className="text-[10px] text-red-400 hover:underline ml-2"
                    >
                      Șterge
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <code className="text-[10px] text-muted-foreground bg-muted/30 px-2 py-0.5 rounded font-mono truncate flex-1">
                    {k.key}
                  </code>
                  <button
                    onClick={() => handleCopy(k.key, k.id)}
                    className="text-[10px] text-primary hover:underline flex items-center gap-0.5 flex-shrink-0"
                  >
                    {copiedId === k.id ? '✓' : <><Copy size={10} /> Copiază</>}
                  </button>
                </div>

                {/* Integration code snippet */}
                {showCode === k.id && (
                  <div className="mt-2 relative">
                    <pre className="text-[10px] bg-zinc-900 text-emerald-300 rounded-lg p-3 overflow-x-auto font-mono">
                      {getSnippet(k.key)}
                    </pre>
                    <button
                      onClick={() => handleCopy(getSnippet(k.key), `snippet-${k.id}`)}
                      className="absolute top-2 right-2 text-[10px] text-zinc-400 hover:text-white bg-zinc-800 px-2 py-0.5 rounded"
                    >
                      {copiedId === `snippet-${k.id}` ? '✓ Copiat' : 'Copiază'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

"use client"

import { useState, useEffect } from "react"
import { useBusinessLine } from "@/components/business-line-context"
import {
  Send, Plus, X, Megaphone, Filter, FileText,
  Play, Pause, Eye, MousePointerClick, Users,
  MessageSquare, Mail, Linkedin, Facebook, Instagram, Music,
  Calendar, Clock, Zap, CheckCircle2, CreditCard, Copy, Trash2,
  AlertTriangle,
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

interface Campaign {
  id: string
  name: string
  channel: string
  campaignType: string
  status: string
  totalLeads: number
  totalSent: number
  totalOpened: number
  totalConverted: number
  segment: { id: string; name: string } | null
  template: { id: string; name: string; channel: string } | null
  scheduledAt: string | null
  sentAt: string | null
  createdAt: string
}

const CHANNEL_CONFIG: Record<string, { icon: any; label: string; color: string }> = {
  sms: { icon: MessageSquare, label: "SMS", color: "text-green-600 bg-green-50" },
  email: { icon: Mail, label: "Email", color: "text-blue-600 bg-blue-50" },
  linkedin: { icon: Linkedin, label: "LinkedIn", color: "text-[#0077B5] bg-blue-50" },
  facebook: { icon: Facebook, label: "Facebook", color: "text-[#1877F2] bg-blue-50" },
  instagram: { icon: Instagram, label: "Instagram", color: "text-[#E1306C] bg-pink-50" },
  tiktok: { icon: Music, label: "TikTok", color: "text-black bg-gray-50" },
}

const STATUS_BADGES: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  scheduled: "bg-purple-100 text-purple-700",
  running: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  paused: "bg-yellow-100 text-yellow-700",
}

export default function MarketingCampaignsPage() {
  const { activeLineId, activeLine } = useBusinessLine()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean; title: string; message: string;
    onConfirm: () => void; variant?: 'danger' | 'primary'
  }>({ open: false, title: '', message: '', onConfirm: () => {} })

  // Create form state
  const [form, setForm] = useState({
    name: "", channel: "sms", segmentId: "", templateId: "",
    launchMode: "now" as "now" | "schedule",
    scheduledDate: "",
    scheduledTime: "",
  })
  const [segments, setSegments] = useState<any[]>([])
  const [templates, setTemplates] = useState<any[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadCampaigns()
    loadSegments()
    loadTemplates()
  }, [activeLineId])

  // Reload templates when channel changes
  useEffect(() => {
    loadTemplates()
  }, [form.channel])

  const loadCampaigns = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/marketing/campaigns?businessLine=${activeLineId}`)
      const data = await res.json()
      setCampaigns(data.data || [])
    } catch (err) { console.error(err) }
    setLoading(false)
  }

  const loadSegments = async () => {
    try {
      const res = await fetch(`/api/marketing/segments?businessLine=${activeLineId}`)
      const data = await res.json()
      setSegments(data.data || [])
    } catch (err) { console.error(err) }
  }

  const loadTemplates = async () => {
    try {
      const res = await fetch(`/api/marketing/templates?businessLine=${activeLineId}&channel=${form.channel}`)
      const data = await res.json()
      setTemplates(data.data || [])
    } catch (err) { console.error(err) }
  }

  const showConfirm = (title: string, message: string, onConfirm: () => void, variant: 'danger' | 'primary' = 'primary') => {
    setConfirmDialog({ open: true, title, message, onConfirm, variant })
  }

  const handleCreate = async () => {
    if (!form.name || !form.templateId) {
      toast.warning('Completează numele campaniei și selectează un șablon.')
      return
    }
    if (!activeLine?.id) {
      toast.warning('Selectează un business line specific (nu "Toate").')
      return
    }
    if (form.launchMode === 'schedule' && (!form.scheduledDate || !form.scheduledTime)) {
      toast.warning('Selectează data și ora pentru programare.')
      return
    }
    setSaving(true)
    try {
      const scheduledAt = form.launchMode === 'schedule'
        ? new Date(`${form.scheduledDate}T${form.scheduledTime}:00`).toISOString()
        : null
      const status = form.launchMode === 'schedule' ? 'scheduled' : 'draft'

      const res = await fetch('/api/marketing/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessLineSlug: activeLine.id,
          name: form.name,
          channel: form.channel,
          segmentId: form.segmentId || null,
          templateId: form.templateId,
          scheduledAt,
          status,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error || 'Nu s-a putut crea campania')
      } else {
        setShowCreate(false)
        setForm({ name: "", channel: "sms", segmentId: "", templateId: "", launchMode: "now", scheduledDate: "", scheduledTime: "" })
        toast.success(form.launchMode === 'schedule' ? 'Campanie programată!' : 'Campanie creată!')
        loadCampaigns()
      }
    } catch (err) {
      console.error(err)
      toast.error('Eroare de rețea')
    }
    setSaving(false)
  }

  const handleAction = async (id: string, action: string) => {
    try {
      if (action === 'generate' || action === 'send') {
        if (action === 'send') toast.loading('Se trimit mesajele...', { id: 'sending' })
        if (action === 'generate') toast.loading('Se generează...', { id: 'generating' })
        const res = await fetch(`/api/marketing/campaigns/${id}?action=${action}`, { method: 'POST' })
        const data = await res.json()
        if (action === 'send') {
          toast.dismiss('sending')
          if (data.data) toast.success(`Trimise: ${data.data.sent} mesaje`)
          else if (data.error) toast.error(data.error)
        } else {
          toast.dismiss('generating')
          if (data.data) toast.success(`Generat: ${data.data.generated} lead-uri`)
          else if (data.error) toast.error(data.error)
        }
      } else {
        await fetch(`/api/marketing/campaigns/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: action }),
        })
        toast.success('Status actualizat')
      }
      loadCampaigns()
    } catch (err) {
      console.error(err)
      toast.error('Eroare la procesarea acțiunii')
    }
  }

  const handleDelete = async (campaign: Campaign) => {
    showConfirm(
      'Șterge campania',
      `Sigur vrei să ștergi "${campaign.name}"? Se vor șterge și lead-urile asociate.`,
      async () => {
        try {
          const res = await fetch(`/api/marketing/campaigns/${campaign.id}`, { method: 'DELETE' })
          if (res.ok) { toast.success('Campanie ștearsă'); loadCampaigns() }
          else { const d = await res.json(); toast.error(d.error || 'Eroare') }
        } catch { toast.error('Eroare la ștergere') }
      },
      'danger'
    )
  }

  const handleCopy = async (campaign: Campaign) => {
    if (!activeLine?.id) { toast.warning('Selectează un business line.'); return }
    try {
      const res = await fetch('/api/marketing/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessLineSlug: activeLine.id,
          name: `${campaign.name} (copie)`,
          channel: campaign.channel,
          segmentId: campaign.segment?.id || null,
          templateId: campaign.template?.id || '',
        }),
      })
      if (res.ok) { toast.success('Campanie copiată!'); loadCampaigns() }
      else { const d = await res.json(); toast.error(d.error || 'Eroare') }
    } catch { toast.error('Eroare la copiere') }
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-primary" />
            Campanii
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Creează și gestionează campanii SMS, Email și Social Media
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" /> Campanie Nouă
        </button>
      </div>

      {/* Create Campaign */}
      {showCreate && (
        <div className="bg-card border rounded-xl p-6 shadow-lg space-y-5 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">Campanie Nouă</h3>
            <button onClick={() => setShowCreate(false)} className="p-1 rounded hover:bg-muted"><X className="w-5 h-5" /></button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Nume Campanie</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="Ex: Prospectare Instalatori Aprilie 2026"
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Canal</label>
              <div className="flex gap-2">
                {Object.entries(CHANNEL_CONFIG).map(([key, conf]) => {
                  const Icon = conf.icon
                  return (
                    <button
                      key={key}
                      onClick={() => setForm(p => ({ ...p, channel: key, templateId: "" }))}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                        form.channel === key
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      <Icon className="w-4 h-4" /> {conf.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Segment</label>
              <select
                value={form.segmentId}
                onChange={e => setForm(p => ({ ...p, segmentId: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
              >
                <option value="">-- Selectează segment --</option>
                {segments.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.contactCount} contacte)</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Șablon</label>
              <select
                value={form.templateId}
                onChange={e => setForm(p => ({ ...p, templateId: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
              >
                <option value="">-- Selectează șablon --</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              {templates.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Niciun șablon {form.channel}. <Link href="/marketing/templates" className="text-primary underline">Creează unul</Link>
                </p>
              )}
            </div>
          </div>

          {/* Launch Mode */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase mb-2">Mod lansare</label>
            <div className="flex gap-3">
              <button
                onClick={() => setForm(p => ({ ...p, launchMode: 'now' }))}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                  form.launchMode === 'now'
                    ? 'border-primary bg-primary/5 text-primary ring-2 ring-primary/20'
                    : 'hover:bg-muted text-muted-foreground'
                }`}
              >
                <Zap className="w-4 h-4" /> Lansează manual (draft)
              </button>
              <button
                onClick={() => setForm(p => ({ ...p, launchMode: 'schedule' }))}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                  form.launchMode === 'schedule'
                    ? 'border-purple-500 bg-purple-500/5 text-purple-600 ring-2 ring-purple-500/20'
                    : 'hover:bg-muted text-muted-foreground'
                }`}
              >
                <Calendar className="w-4 h-4" /> Programează
              </button>
            </div>
          </div>

          {/* Schedule Picker */}
          {form.launchMode === 'schedule' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-lg border border-purple-200 bg-purple-50/30 dark:bg-purple-500/5 dark:border-purple-500/20">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                  <Calendar className="w-3 h-3 inline mr-1" />Data
                </label>
                <input
                  type="date"
                  value={form.scheduledDate}
                  onChange={e => setForm(p => ({ ...p, scheduledDate: e.target.value }))}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-purple-500/20"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                  <Clock className="w-3 h-3 inline mr-1" />Ora
                </label>
                <input
                  type="time"
                  value={form.scheduledTime}
                  onChange={e => setForm(p => ({ ...p, scheduledTime: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-purple-500/20"
                />
              </div>
              <p className="text-xs text-muted-foreground col-span-2">
                ⏰ Campania va fi trimisă automat la data și ora selectate. Asigură-te că segmentul și șablonul sunt configurate corect.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowCreate(false)}
              className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted"
            >
              Anulează
            </button>
            <button
              onClick={handleCreate}
              disabled={saving || !form.name || !form.templateId}
              className={`px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2 ${
                form.launchMode === 'schedule'
                  ? 'bg-purple-600 text-white hover:bg-purple-700'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90'
              }`}
            >
              {saving ? "Se creează..." : form.launchMode === 'schedule' ? (
                <><Calendar className="w-4 h-4" /> Programează Campanie</>
              ) : (
                "Creează Campanie"
              )}
            </button>
          </div>
        </div>
      )}

      {/* Campaigns List */}
      <div className="space-y-3">
        {loading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />
          ))
        ) : campaigns.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Megaphone className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="font-medium">Nicio campanie creată</p>
            <p className="text-sm">Creează prima campanie pentru a începe prospectarea</p>
          </div>
        ) : (
          campaigns.map(c => {
            const chConf = CHANNEL_CONFIG[c.channel] ?? CHANNEL_CONFIG.sms
            const ChIcon = chConf!.icon
            return (
              <div key={c.id} className="bg-card border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${chConf.color}`}>
                      <ChIcon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Link href={`/marketing/campaigns/${c.id}`} className="font-semibold text-sm hover:text-primary transition-colors truncate">
                          {c.name}
                        </Link>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${STATUS_BADGES[c.status] || ''}`}>
                          {c.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        {c.segment && (
                          <span className="flex items-center gap-1">
                            <Filter className="w-3 h-3" /> {c.segment.name}
                          </span>
                        )}
                        {c.template && (
                          <span className="flex items-center gap-1">
                            <FileText className="w-3 h-3" /> {c.template.name}
                          </span>
                        )}
                        <span>
                          {new Date(c.createdAt).toLocaleDateString('ro-RO')}
                        </span>
                        {c.scheduledAt && (
                          <span className="flex items-center gap-1 text-purple-600">
                            <Calendar className="w-3 h-3" />
                            {new Date(c.scheduledAt).toLocaleDateString('ro-RO')}{' '}
                            {new Date(c.scheduledAt).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-center">
                      <p className="font-bold">{c.totalLeads}</p>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Users className="w-3 h-3" /> Lead-uri</p>
                    </div>
                    <div className="text-center">
                      <p className="font-bold">{c.totalSent}</p>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Send className="w-3 h-3" /> Trimise</p>
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-amber-600">{c.totalOpened}</p>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Eye className="w-3 h-3" /> Deschise</p>
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-green-600">{c.totalConverted}</p>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-0.5"><MousePointerClick className="w-3 h-3" /> Conversii</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1.5">
                    {c.status === 'draft' && (
                      <>
                        <button
                          onClick={() => handleAction(c.id, 'generate')}
                          className="px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted"
                          title="Generează lista de lead-uri"
                        >
                          <Users className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => showConfirm(
                            'Trimite campania',
                            `Trimiți campania "${c.name}"?`,
                            () => handleAction(c.id, 'send')
                          )}
                          className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90"
                          title="Trimite campania"
                        >
                          <Play className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                    {c.status === 'scheduled' && (
                      <button
                        onClick={() => showConfirm(
                          'Anulează programarea',
                          'Campania va trece în draft. Continuă?',
                          () => handleAction(c.id, 'draft'),
                          'danger'
                        )}
                        className="px-3 py-1.5 rounded-lg border border-purple-300 text-xs font-medium text-purple-600 hover:bg-purple-50"
                        title="Anulează programarea"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {c.status === 'running' && (
                      <button
                        onClick={() => handleAction(c.id, 'paused')}
                        className="px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-yellow-50"
                        title="Pauză"
                      >
                        <Pause className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {c.status === 'completed' && (
                      <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Finalizat
                      </span>
                    )}
                    {c.status === 'paused' && (
                      <button
                        onClick={() => handleAction(c.id, 'running')}
                        className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium"
                        title="Reia"
                      >
                        <Play className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* ── Copy / Delete (always visible) ── */}
                    <div className="border-l pl-1.5 ml-1 flex gap-1">
                      <button
                        onClick={() => handleCopy(c)}
                        className="px-2 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        title="Copiază campania"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(c)}
                        className="px-2 py-1.5 rounded-lg border text-xs font-medium hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"
                        title="Șterge campania"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* ── Confirm Dialog ── */}
      {confirmDialog.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-card border rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4 animate-in zoom-in-95 slide-in-from-bottom-2 duration-200">
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                confirmDialog.variant === 'danger' ? 'bg-red-100 text-red-600' : 'bg-primary/10 text-primary'
              }`}>
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-base">{confirmDialog.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{confirmDialog.message}</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setConfirmDialog(d => ({ ...d, open: false }))}
                className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
              >
                Anulează
              </button>
              <button
                onClick={() => {
                  confirmDialog.onConfirm()
                  setConfirmDialog(d => ({ ...d, open: false }))
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  confirmDialog.variant === 'danger'
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-primary text-primary-foreground hover:bg-primary/90'
                }`}
              >
                Confirmă
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

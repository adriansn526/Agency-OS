"use client"

import { useEffect, useState, useRef } from "react"
import { BarChart3, Plus, Copy, Send, Sparkles, ExternalLink, Eye, Trash2, X, Paperclip, Mail, Users, FileText, Loader2 } from "lucide-react"

interface Report {
  id: string; token: string; title: string; status: string; viewCount: number
  sentAt: string | null; viewedAt: string | null; createdAt: string
  client: { id: string; companyName: string; contactPerson: string; email: string }
  businessLine: { slug: string; name: string; color: string }
  widgets: Array<{ type: string; label: string; enabled: boolean }>
  snapshotCount: number; publicUrl: string
}

interface Client {
  id: string; companyName: string; businessLineId: string
}

const DEFAULT_WIDGETS = [
  { type: "conversions_hero", label: "🏆 Rezultate", enabled: true },
  { type: "source_attribution", label: "📊 Surse Conversii", enabled: true },
  { type: "google_ads_kpis", label: "📣 Google Ads KPIs", enabled: true },
  { type: "google_ads_trend", label: "📣 Google Ads Trend", enabled: true },
  { type: "google_ads_tables", label: "📣 Google Ads Tables", enabled: true },
  { type: "seo_kpis", label: "🔍 SEO KPIs", enabled: true },
  { type: "seo_trend", label: "🔍 SEO Trend", enabled: true },
  { type: "seo_tables", label: "🔍 SEO Tables", enabled: true },
  { type: "seo_articles", label: "📝 Articole Noi", enabled: true },
  { type: "social_breakdown", label: "🌐 Social", enabled: true },
  { type: "site_health", label: "📈 Site Health", enabled: true },
]

/* ============================================================
   Send Report Modal
   ============================================================ */

function SendReportModal({
  report,
  onClose,
  onSuccess,
}: {
  report: Report
  onClose: () => void
  onSuccess: (msg: string) => void
}) {
  const [to, setTo] = useState(report.client.email || "")
  const [cc, setCc] = useState("")
  const [message, setMessage] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [sending, setSending] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleSend() {
    if (!to.trim()) return
    setSending(true)
    try {
      const formData = new FormData()
      formData.append("to", to.trim())
      formData.append("cc", cc)
      formData.append("message", message)
      for (const file of files) {
        formData.append("attachments", file)
      }

      const res = await fetch(`/api/reports/${report.id}/send`, {
        method: "POST",
        body: formData,
      })
      const json = await res.json()
      if (res.ok) {
        onSuccess(`✅ Email trimis la ${to}${cc ? ` (CC: ${cc})` : ""}${files.length > 0 ? ` cu ${files.length} atașament(e)` : ""}`)
        onClose()
      } else {
        onSuccess(`❌ ${json.error}`)
      }
    } catch (err: any) {
      onSuccess(`❌ ${err.message}`)
    } finally {
      setSending(false)
    }
  }

  function addFiles(newFiles: FileList | null) {
    if (!newFiles) return
    const arr = Array.from(newFiles).filter(f => f.type === "application/pdf" || f.name.endsWith(".pdf"))
    setFiles(prev => [...prev, ...arr])
  }

  function removeFile(index: number) {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const totalSize = files.reduce((s, f) => s + f.size, 0)
  const maxSize = 10 * 1024 * 1024 // 10MB SES limit

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-surface rounded-2xl border border-border shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-primary/10 to-accent/10 px-6 py-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Send size={18} className="text-primary" />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">Trimite Raport</h2>
                <p className="text-[11px] text-muted-foreground">
                  {report.client.companyName} · {report.title}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* To */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-1.5">
              <Mail size={12} /> Destinatar *
            </label>
            <input
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="email@client.ro"
              className="w-full px-3 py-2.5 bg-muted/20 border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
            />
          </div>

          {/* CC */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-1.5">
              <Users size={12} /> CC <span className="font-normal text-[10px]">(opțional, separat cu virgulă)</span>
            </label>
            <input
              type="text"
              value={cc}
              onChange={(e) => setCc(e.target.value)}
              placeholder="manager@client.ro, echipa@client.ro"
              className="w-full px-3 py-2.5 bg-muted/20 border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
            />
          </div>

          {/* Message */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-1.5">
              <FileText size={12} /> Mesaj personalizat <span className="font-normal text-[10px]">(opțional)</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder="Ex: Vă transmitem raportul pentru luna mai. Am observat o creștere semnificativă a conversiilor..."
              className="w-full px-3 py-2.5 bg-muted/20 border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all resize-none"
            />
          </div>

          {/* File Upload */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-1.5">
              <Paperclip size={12} /> Facturi atașate (PDF) <span className="font-normal text-[10px]">(max 10MB total)</span>
            </label>

            <input
              ref={fileRef}
              type="file"
              accept=".pdf,application/pdf"
              multiple
              onChange={(e) => addFiles(e.target.files)}
              className="hidden"
            />

            {/* Upload button */}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full py-3 border-2 border-dashed border-border rounded-lg text-xs text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-primary/5 transition-all flex items-center justify-center gap-2"
            >
              <Paperclip size={14} />
              Click pentru a adăuga PDF
            </button>

            {/* File list */}
            {files.length > 0 && (
              <div className="mt-2 space-y-1.5">
                {files.map((file, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2 bg-muted/20 rounded-lg border border-border/50">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
                        <FileText size={14} className="text-red-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{file.name}</p>
                        <p className="text-[10px] text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFile(i)}
                      className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
                {totalSize > maxSize && (
                  <p className="text-[11px] text-destructive font-medium px-1">
                    ⚠️ Dimensiunea totală depășește limita de 10MB
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Preview info */}
          <div className="bg-muted/20 rounded-lg border border-border/50 p-3">
            <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider mb-2">Previzualizare email</p>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>📊 <span className="text-foreground font-medium">{report.title}</span> — {report.client.companyName}</p>
              <p>🔗 Buton: „Vizualizează Raportul" → link public</p>
              {message && <p>💬 Mesaj personalizat inclus</p>}
              {files.length > 0 && <p>📎 {files.length} factură(i) atașată(e)</p>}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-muted/10 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50 transition-colors"
          >
            Anulează
          </button>
          <button
            onClick={handleSend}
            disabled={!to.trim() || sending || totalSize > maxSize}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-all"
          >
            {sending ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Se trimite...
              </>
            ) : (
              <>
                <Send size={14} />
                Trimite Email
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ============================================================
   Main Page
   ============================================================ */

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [sendReport, setSendReport] = useState<Report | null>(null)

  // Create form state
  const [selectedClient, setSelectedClient] = useState("")
  const [reportTitle, setReportTitle] = useState("Raport Performanță")
  const [widgets, setWidgets] = useState(DEFAULT_WIDGETS)
  const [notes, setNotes] = useState("")

  useEffect(() => {
    fetchReports()
    fetchClients()
  }, [])

  async function fetchReports() {
    setLoading(true)
    try {
      const res = await fetch("/api/reports?status=all")
      const json = await res.json()
      setReports(json.data || [])
    } finally {
      setLoading(false)
    }
  }

  async function fetchClients() {
    try {
      const res = await fetch("/api/clients?limit=200")
      const json = await res.json()
      setClients((json.data || []).map((c: any) => ({ id: c.id, companyName: c.companyName, businessLineId: c.businessLineId })))
    } catch {}
  }

  async function createReport() {
    if (!selectedClient) return
    setCreating(true)
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: selectedClient, title: reportTitle, widgets, notes: notes || undefined }),
      })
      const json = await res.json()
      if (res.ok) {
        showToast(`✅ Raport creat: ${json.data.publicUrl}`)
        setShowCreate(false)
        setSelectedClient("")
        setNotes("")
        setWidgets(DEFAULT_WIDGETS)
        fetchReports()
      } else {
        showToast(`❌ ${json.error}`)
      }
    } finally {
      setCreating(false)
    }
  }

  async function deleteReport(id: string) {
    if (!confirm("Sigur ștergi raportul?")) return
    await fetch(`/api/reports/${id}`, { method: "DELETE" })
    fetchReports()
    showToast("🗑️ Raport șters")
  }

  async function generateSnapshot(report: Report) {
    const now = new Date()
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const to = new Date(now.getFullYear(), now.getMonth(), 0)
    try {
      const res = await fetch(`/api/reports/${report.id}/snapshot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dateFrom: from.toISOString().slice(0, 10),
          dateTo: to.toISOString().slice(0, 10),
        }),
      })
      const json = await res.json()
      showToast(res.ok ? "✅ Interpretare AI generată!" : `❌ ${json.error}`)
      fetchReports()
    } catch (err: any) {
      showToast(`❌ ${err.message}`)
    }
  }

  function copyUrl(url: string) {
    navigator.clipboard.writeText(url)
    showToast("📋 Link copiat!")
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }

  function toggleWidget(type: string) {
    setWidgets(ws => ws.map(w => w.type === type ? { ...w, enabled: !w.enabled } : w))
  }

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-[60] bg-surface border border-border rounded-xl px-4 py-3 shadow-lg text-sm text-foreground max-w-sm animate-fade-in">
          {toast}
        </div>
      )}

      {/* Send Report Modal */}
      {sendReport && (
        <SendReportModal
          report={sendReport}
          onClose={() => { setSendReport(null); fetchReports() }}
          onSuccess={(msg) => showToast(msg)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Rapoarte Client</h1>
          <p className="text-sm text-muted-foreground">Dashboard-uri de performanță per client cu link public</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          <Plus size={16} /> Raport Nou
        </button>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-surface rounded-2xl border border-border shadow-2xl w-full max-w-lg p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">Raport Nou</h2>
              <button onClick={() => setShowCreate(false)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
            </div>

            {/* Client select */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Client *</label>
              <select
                value={selectedClient}
                onChange={e => setSelectedClient(e.target.value)}
                className="w-full px-3 py-2 bg-muted/30 border border-border rounded-lg text-sm text-foreground"
              >
                <option value="">Selectează client...</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.companyName}</option>
                ))}
              </select>
            </div>

            {/* Title */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Titlu</label>
              <input
                value={reportTitle}
                onChange={e => setReportTitle(e.target.value)}
                className="w-full px-3 py-2 bg-muted/30 border border-border rounded-lg text-sm text-foreground"
              />
            </div>

            {/* Widgets */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-2 block">Widget-uri (bifate = vizibile)</label>
              <div className="grid grid-cols-2 gap-2">
                {widgets.map(w => (
                  <label key={w.type} className="flex items-center gap-2 text-xs text-foreground cursor-pointer p-1.5 rounded-lg hover:bg-muted/30">
                    <input
                      type="checkbox"
                      checked={w.enabled}
                      onChange={() => toggleWidget(w.type)}
                      className="rounded"
                    />
                    {w.label}
                  </label>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Mesaj (opțional)</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 bg-muted/30 border border-border rounded-lg text-sm text-foreground resize-none"
                placeholder="Mesaj pentru client..."
              />
            </div>

            <button
              onClick={createReport}
              disabled={!selectedClient || creating}
              className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50"
            >
              {creating ? "Se creează..." : "Creează Raport"}
            </button>
          </div>
        </div>
      )}

      {/* Reports Table */}
      {loading ? (
        <div className="bg-surface rounded-xl border border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">Se încarcă...</p>
        </div>
      ) : reports.length === 0 ? (
        <div className="bg-surface rounded-xl border border-dashed border-border p-10 text-center">
          <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mb-4 mx-auto"><BarChart3 size={28} className="text-accent" /></div>
          <h2 className="text-lg font-semibold text-foreground mb-2">Niciun Raport</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">Creează primul raport de performanță pentru un client.</p>
        </div>
      ) : (
        <div className="bg-surface rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Client</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Titlu</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">Views</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">AI</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Status</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Acțiuni</th>
              </tr>
            </thead>
            <tbody>
              {reports.map(r => (
                <tr key={r.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-foreground">{r.client.companyName}</p>
                    <p className="text-[11px] text-muted-foreground">{r.businessLine.name}</p>
                  </td>
                  <td className="px-4 py-3 text-foreground">{r.title}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Eye size={12} /> {r.viewCount}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-xs text-muted-foreground">{r.snapshotCount} interpretări</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 text-[11px] font-semibold rounded-full ${r.status === "active" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                      {r.status}
                    </span>
                    {r.sentAt && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Trimis: {new Date(r.sentAt).toLocaleDateString('ro-RO')}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => copyUrl(r.publicUrl)} title="Copy URL" className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground"><Copy size={14} /></button>
                      <a href={r.publicUrl} target="_blank" title="Deschide" className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground"><ExternalLink size={14} /></a>
                      <button onClick={() => generateSnapshot(r)} title="Generează Interpretare AI" className="p-1.5 rounded-lg hover:bg-accent/20 text-accent"><Sparkles size={14} /></button>
                      <button onClick={() => setSendReport(r)} title="Trimite Email" className="p-1.5 rounded-lg hover:bg-primary/20 text-primary"><Send size={14} /></button>
                      <button onClick={() => deleteReport(r.id)} title="Șterge" className="p-1.5 rounded-lg hover:bg-destructive/20 text-destructive"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

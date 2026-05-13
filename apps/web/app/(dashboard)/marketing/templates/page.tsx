"use client"

import { useState, useEffect } from "react"
import { useBusinessLine } from "@/components/business-line-context"
import {
  FileText, Plus, X, Trash2, Edit, MessageSquare, Mail,
  Linkedin, Facebook, Instagram, Music, Eye, Code, Copy,
} from "lucide-react"

const CHANNEL_OPTIONS = [
  { value: "sms", label: "SMS", icon: MessageSquare },
  { value: "email", label: "Email", icon: Mail },
  { value: "linkedin", label: "LinkedIn", icon: Linkedin },
  { value: "facebook", label: "Facebook", icon: Facebook },
  { value: "instagram", label: "Instagram", icon: Instagram },
  { value: "tiktok", label: "TikTok", icon: Music },
]

const AVAILABLE_VARIABLES = [
  { key: "company_name", label: "Nume companie", example: "SC Instalații SRL" },
  { key: "contact_name", label: "Persoana contact", example: "Ion Popescu" },
  { key: "city", label: "Oraș", example: "Cluj-Napoca" },
  { key: "county", label: "Județ", example: "Cluj" },
  { key: "phone", label: "Telefon", example: "0745123456" },
  { key: "email", label: "Email", example: "ion@example.com" },
  { key: "unique_code", label: "Cod unic LP", example: "a1b2c3d4e5f6" },
  { key: "bl_name", label: "Business Line", example: "ClimaticPRO" },
]

interface Template {
  id: string
  name: string
  channel: string
  subject: string | null
  body: string
  mediaUrl: string | null
  mediaType: string | null
  variables: string[]
  _count: { campaigns: number }
  createdAt: string
}

export default function MarketingTemplatesPage() {
  const { activeLineId, activeLine } = useBusinessLine()
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [previewMode, setPreviewMode] = useState(false)

  // Form
  const [form, setForm] = useState({
    name: "", channel: "sms", subject: "", body: "", mediaUrl: "",
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadTemplates()
  }, [activeLineId])

  const loadTemplates = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/marketing/templates?businessLine=${activeLineId}`)
      const data = await res.json()
      setTemplates(data.data || [])
    } catch (err) { console.error(err) }
    setLoading(false)
  }

  const handleSave = async () => {
    if (!form.name || !form.body || !activeLine?.id) return
    setSaving(true)
    try {
      const endpoint = editingId
        ? `/api/marketing/templates/${editingId}`
        : '/api/marketing/templates'

      await fetch(endpoint, {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessLineSlug: activeLine.id,
          name: form.name,
          channel: form.channel,
          subject: form.subject || null,
          body: form.body,
          mediaUrl: form.mediaUrl || null,
        }),
      })
      resetForm()
      loadTemplates()
    } catch (err) { console.error(err) }
    setSaving(false)
  }

  const handleEdit = (t: Template) => {
    setEditingId(t.id)
    setForm({
      name: t.name, channel: t.channel,
      subject: t.subject || "", body: t.body,
      mediaUrl: t.mediaUrl || "",
    })
    setShowCreate(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Sigur vrei să ștergi acest șablon?")) return
    await fetch(`/api/marketing/templates/${id}`, { method: 'DELETE' })
    loadTemplates()
  }

  const resetForm = () => {
    setShowCreate(false)
    setEditingId(null)
    setPreviewMode(false)
    setForm({ name: "", channel: "sms", subject: "", body: "", mediaUrl: "" })
  }

  const insertVariable = (varKey: string) => {
    setForm(p => ({ ...p, body: p.body + `{{${varKey}}}` }))
  }

  // Preview: replace variables with example values
  const previewBody = AVAILABLE_VARIABLES.reduce(
    (text, v) => text.replace(new RegExp(`\\{\\{${v.key}\\}\\}`, 'g'), v.example),
    form.body
  )

  const showSubject = form.channel === 'email' || form.channel === 'linkedin'
  const showMedia = ['facebook', 'instagram', 'tiktok', 'linkedin'].includes(form.channel)

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" />
            Șabloane
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Mesaje predefinite cu variabile pentru personalizare automată
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowCreate(true) }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
        >
          <Plus className="w-4 h-4" /> Șablon Nou
        </button>
      </div>

      {/* Template Editor */}
      {showCreate && (
        <div className="bg-card border rounded-xl p-6 shadow-lg space-y-5 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">{editingId ? "Editare Șablon" : "Șablon Nou"}</h3>
            <button onClick={resetForm} className="p-1 rounded hover:bg-muted"><X className="w-5 h-5" /></button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Nume</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="Ex: Invitație Instalatori"
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Canal</label>
              <select
                value={form.channel}
                onChange={e => setForm(p => ({ ...p, channel: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
              >
                {CHANNEL_OPTIONS.map(ch => (
                  <option key={ch.value} value={ch.value}>{ch.label}</option>
                ))}
              </select>
            </div>
            {showSubject && (
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Subiect</label>
                <input
                  type="text"
                  value={form.subject}
                  onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
                  placeholder="Subiect email / titlu"
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-primary/20"
                />
              </div>
            )}
          </div>

          {showMedia && (
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">URL Media (imagine/video)</label>
              <input
                type="text"
                value={form.mediaUrl}
                onChange={e => setForm(p => ({ ...p, mediaUrl: e.target.value }))}
                placeholder="https://example.com/image.jpg"
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-primary/20"
              />
            </div>
          )}

          {/* Body Editor + Variables */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Corp Mesaj</label>
                <div className="flex gap-1">
                  <button
                    onClick={() => setPreviewMode(false)}
                    className={`px-2 py-0.5 text-xs rounded ${!previewMode ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
                  >
                    <Code className="w-3 h-3 inline mr-1" />Editor
                  </button>
                  <button
                    onClick={() => setPreviewMode(true)}
                    className={`px-2 py-0.5 text-xs rounded ${previewMode ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
                  >
                    <Eye className="w-3 h-3 inline mr-1" />Preview
                  </button>
                </div>
              </div>
              {previewMode ? (
                <div className="border rounded-lg p-4 bg-muted/20 min-h-[180px] text-sm whitespace-pre-wrap">
                  {previewBody || <span className="text-muted-foreground italic">Scrie conținutul mesajului...</span>}
                </div>
              ) : (
                <textarea
                  value={form.body}
                  onChange={e => setForm(p => ({ ...p, body: e.target.value }))}
                  placeholder="Bună ziua {{contact_name}},&#10;&#10;Vă contactăm de la {{bl_name}} cu o propunere..."
                  rows={7}
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-primary/20 resize-y font-mono"
                />
              )}
              {form.channel === 'sms' && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  {form.body.length} caractere · {Math.ceil(form.body.length / 160)} SMS-uri
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Variabile Disponibile</label>
              <div className="border rounded-lg p-3 space-y-1 max-h-[240px] overflow-y-auto">
                {AVAILABLE_VARIABLES.map(v => (
                  <button
                    key={v.key}
                    onClick={() => insertVariable(v.key)}
                    className="w-full flex items-center justify-between px-2 py-1.5 rounded hover:bg-muted text-left text-xs group"
                  >
                    <span>
                      <code className="text-primary font-mono">{`{{${v.key}}}`}</code>
                      <span className="text-muted-foreground ml-1.5">{v.label}</span>
                    </span>
                    <Copy className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button onClick={resetForm} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">
              Anulează
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !form.name || !form.body}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? "Se salvează..." : editingId ? "Actualizează" : "Salvează"}
            </button>
          </div>
        </div>
      )}

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          [...Array(6)].map((_, i) => <div key={i} className="h-44 bg-muted animate-pulse rounded-xl" />)
        ) : templates.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="font-medium">Niciun șablon creat</p>
            <p className="text-sm">Creează un șablon pentru a putea lansa campanii</p>
          </div>
        ) : (
          templates.map(t => {
            const chOpt = CHANNEL_OPTIONS.find(c => c.value === t.channel)
            const ChIcon = chOpt?.icon || MessageSquare
            return (
              <div key={t.id} className="bg-card border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow group">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <ChIcon className="w-4 h-4 text-muted-foreground" />
                    <h3 className="font-semibold text-sm">{t.name}</h3>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleEdit(t)} className="p-1.5 rounded hover:bg-muted">
                      <Edit className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                    <button onClick={() => handleDelete(t.id)} className="p-1.5 rounded hover:bg-red-50">
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground line-clamp-3 font-mono bg-muted/30 rounded p-2 mb-3">
                  {t.body}
                </div>

                <div className="flex items-center gap-2 text-[10px]">
                  <span className="px-1.5 py-0.5 bg-primary/10 text-primary rounded font-medium uppercase">{t.channel}</span>
                  {t.variables.map(v => (
                    <span key={v} className="px-1.5 py-0.5 bg-muted rounded">{`{{${v}}}`}</span>
                  ))}
                </div>

                <div className="flex items-center justify-between mt-3 text-[10px] text-muted-foreground">
                  <span>{t._count.campaigns} campanii</span>
                  <span>{new Date(t.createdAt).toLocaleDateString('ro-RO')}</span>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

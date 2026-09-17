"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import {
  ArrowLeft, Plus, FileText, Pencil, Trash2, Save,
  ChevronDown, ChevronRight, Copy, Star, Check, X,
  GripVertical, Settings, Eye,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Types (mirroring API store) ───
interface ContractSection {
  id: string
  title: string
  content: string
  editable: boolean
}

interface ContractTemplate {
  id: string
  name: string
  description: string
  businessLines: string[]
  sections: ContractSection[]
  anexa2: any | null
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

// ─── Available Variables Reference ───
const AVAILABLE_VARIABLES = [
  { var: '{{client_legal_name}}', label: 'Denumire client', mandatory: true },
  { var: '{{client_cif}}', label: 'CIF client', mandatory: true },
  { var: '{{client_reg_com}}', label: 'Reg. Com. client', mandatory: true },
  { var: '{{client_address}}', label: 'Adresă client', mandatory: true },
  { var: '{{company_legal_name}}', label: 'Denumire firmă prestator', mandatory: true },
  { var: '{{company_cif}}', label: 'CIF prestator', mandatory: true },
  { var: '{{company_reg_com}}', label: 'Reg. Com. prestator', mandatory: true },
  { var: '{{company_address}}', label: 'Adresă prestator', mandatory: true },
  { var: '{{contract_value}}', label: 'Valoare contract', mandatory: true },
  { var: '{{currency}}', label: 'Monedă', mandatory: true },
  { var: '{{start_date}}', label: 'Data început', mandatory: true },
  { var: '{{end_date}}', label: 'Data sfârșit', mandatory: true },
  
  { var: '{{client_iban}}', label: 'IBAN client', mandatory: false },
  { var: '{{client_bank}}', label: 'Bancă client', mandatory: false },
  { var: '{{client_representative}}', label: 'Reprezentant client', mandatory: false },
  { var: '{{company_iban}}', label: 'IBAN prestator', mandatory: false },
  { var: '{{company_bank}}', label: 'Bancă prestator', mandatory: false },
  { var: '{{company_representative}}', label: 'Reprezentant prestator', mandatory: false },
  { var: '{{duration}}', label: 'Durată contract', mandatory: false },
]

export default function ContractTemplatesPage() {
  const [templates, setTemplates] = useState<ContractTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null)
  const [showVarRef, setShowVarRef] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  // ─── Fetch templates ───
  useEffect(() => {
    fetch('/api/settings/contract-templates')
      .then(r => r.json())
      .then(json => {
        const data = json.data || []
        setTemplates(data)
        if (data.length > 0 && !selectedId) {
          setSelectedId(data[0].id)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const selected = templates.find(t => t.id === selectedId) || null

  // ─── Update template locally ───
  const updateTemplate = useCallback((updates: Partial<ContractTemplate>) => {
    setTemplates(prev => prev.map(t =>
      t.id === selectedId ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
    ))
    setHasChanges(true)
  }, [selectedId])

  const updateSection = useCallback((sectionId: string, updates: Partial<ContractSection>) => {
    setTemplates(prev => prev.map(t =>
      t.id === selectedId
        ? { ...t, sections: t.sections.map(s => s.id === sectionId ? { ...s, ...updates } : s), updatedAt: new Date().toISOString() }
        : t
    ))
    setHasChanges(true)
  }, [selectedId])

  // ─── Save template to API ───
  const saveTemplate = async () => {
    if (!selected) return
    setSaving(true)
    try {
      const res = await fetch('/api/settings/contract-templates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selected),
      })
      if (res.ok) {
        setHasChanges(false)
      }
    } catch { /* silent */ }
    setSaving(false)
  }

  // ─── Create new template ───
  const createTemplate = async () => {
    try {
      const res = await fetch('/api/settings/contract-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Șablon Nou',
          description: 'Contract de prestări servicii',
          businessLines: ['*'],
          sections: [
            { id: 'art-1', title: 'Art. 1 — Părțile Contractante', content: '1.1. **{{company_legal_name}}** ... în calitate de PRESTATOR,\n\nși\n\n1.2. **{{client_legal_name}}** ... în calitate de BENEFICIAR.', editable: true },
            { id: 'art-2', title: 'Art. 2 — Obiectul Contractului', content: '2.1. Obiectul prezentului contract îl constituie ...', editable: true },
          ],
          isDefault: false,
        }),
      })
      const json = await res.json()
      if (res.ok && json.data) {
        setTemplates(prev => [...prev, json.data])
        setSelectedId(json.data.id)
        setHasChanges(false)
      }
    } catch { /* silent */ }
  }

  // ─── Duplicate template ───
  const duplicateTemplate = async () => {
    if (!selected) return
    try {
      const res = await fetch('/api/settings/contract-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${selected.name} (Copie)`,
          description: selected.description,
          businessLines: selected.businessLines,
          sections: selected.sections.map(s => ({ ...s, id: `${s.id}-copy-${Date.now()}` })),
          anexa2: selected.anexa2,
          isDefault: false,
        }),
      })
      const json = await res.json()
      if (res.ok && json.data) {
        setTemplates(prev => [...prev, json.data])
        setSelectedId(json.data.id)
        setHasChanges(false)
      }
    } catch { /* silent */ }
  }

  // ─── Delete template ───
  const deleteTemplate = async (id: string) => {
    if (!confirm('Sigur dorești să ștergi acest template?')) return
    try {
      const res = await fetch(`/api/settings/contract-templates?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setTemplates(prev => {
          const remaining = prev.filter(t => t.id !== id)
          if (selectedId === id && remaining.length > 0) {
            setSelectedId(remaining[0]!.id)
          }
          return remaining
        })
        setHasChanges(false)
      }
    } catch { /* silent */ }
  }

  // ─── Add section ───
  const addSection = () => {
    if (!selected) return
    const nextIdx = selected.sections.length + 1
    const newSection: ContractSection = {
      id: `art-${nextIdx}-${Date.now()}`,
      title: `Art. ${nextIdx} — Articol Nou`,
      content: `${nextIdx}.1. Conținutul articolului...`,
      editable: true,
    }
    updateTemplate({ sections: [...selected.sections, newSection] })
    setEditingSectionId(newSection.id)
  }

  // ─── Remove section ───
  const removeSection = (sectionId: string) => {
    if (!selected) return
    updateTemplate({ sections: selected.sections.filter(s => s.id !== sectionId) })
    if (editingSectionId === sectionId) setEditingSectionId(null)
  }

  // ─── Set as default ───
  const setAsDefault = async () => {
    if (!selected || selected.isDefault) return
    try {
      await fetch('/api/settings/contract-templates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selected.id, isDefault: true }),
      })
      setTemplates(prev => prev.map(t => ({
        ...t,
        isDefault: t.id === selected.id,
      })))
    } catch { /* silent */ }
  }

  // ─── Loading ───
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Se încarcă șabloanele...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ── TOP BAR ── */}
      <div className="h-14 border-b border-border bg-surface/80 backdrop-blur-sm flex items-center justify-between px-4 flex-shrink-0 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <Link href="/settings" className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-sm font-bold text-foreground flex items-center gap-2">
              <FileText size={14} className="text-primary" />
              Șabloane Contracte
            </h1>
            <p className="text-[10px] text-muted-foreground">{templates.length} template{templates.length !== 1 ? '-uri' : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowVarRef(!showVarRef)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors",
              showVarRef ? "bg-amber-500/10 border-amber-500/30 text-amber-500" : "border-border bg-surface hover:bg-muted"
            )}
          >
            <Settings size={12} /> Variabile
          </button>
          {hasChanges && (
            <button
              onClick={saveTemplate}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={12} />}
              {saving ? 'Se salvează...' : 'Salvează'}
            </button>
          )}
        </div>
      </div>

      {/* ── MAIN LAYOUT ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* ── LEFT: TEMPLATE LIST ── */}
        <div className="w-[300px] flex-shrink-0 border-r border-border bg-surface/30 overflow-y-auto">
          <div className="p-3 space-y-2">
            <button
              onClick={createTemplate}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 border-dashed border-border text-xs font-medium text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
            >
              <Plus size={14} /> Șablon Nou
            </button>

            {templates.map(t => (
              <button
                key={t.id}
                onClick={() => { setSelectedId(t.id); setEditingSectionId(null) }}
                className={cn(
                  "w-full text-left p-3 rounded-xl border transition-all group",
                  selectedId === t.id
                    ? "bg-primary/5 border-primary/30 shadow-sm"
                    : "bg-surface border-border hover:border-primary/20"
                )}
              >
                <div className="flex items-center justify-between">
                  <p className={cn("text-xs font-bold truncate", selectedId === t.id ? "text-primary" : "text-foreground")}>
                    {t.name}
                  </p>
                  {t.isDefault && (
                    <span className="flex items-center gap-0.5 px-1.5 py-0.5 text-[8px] font-bold uppercase bg-amber-500/10 text-amber-500 rounded-full">
                      <Star size={8} /> implicit
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{t.description}</p>
                <p className="text-[9px] text-muted-foreground/60 mt-1">
                  {t.sections.length} secțiuni • {t.businessLines.includes('*') ? 'Toate BL' : t.businessLines.join(', ')}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* ── RIGHT: EDITOR ── */}
        <div className="flex-1 overflow-y-auto">
          {selected ? (
            <div className="p-5 max-w-4xl mx-auto space-y-5">
              {/* Template Info */}
              <div className="bg-surface rounded-xl border border-border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-foreground">Informații Template</h2>
                  <div className="flex items-center gap-1.5">
                    {!selected.isDefault && (
                      <button onClick={setAsDefault} className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded-lg bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 transition-colors">
                        <Star size={10} /> Setează Implicit
                      </button>
                    )}
                    <button onClick={duplicateTemplate} className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 transition-colors">
                      <Copy size={10} /> Duplică
                    </button>
                    {templates.length > 1 && (
                      <button onClick={() => deleteTemplate(selected.id)} className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors">
                        <Trash2 size={10} /> Șterge
                      </button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <div>
                    <label className="text-[9px] font-bold uppercase text-muted-foreground mb-0.5 block">Nume Template</label>
                    <input
                      value={selected.name}
                      onChange={e => updateTemplate({ name: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-muted/30 border border-border rounded-lg text-foreground font-medium outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold uppercase text-muted-foreground mb-0.5 block">Descriere</label>
                    <input
                      value={selected.description}
                      onChange={e => updateTemplate({ description: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-muted/30 border border-border rounded-lg text-foreground outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
              </div>

              {/* Variables Reference */}
              {showVarRef && (
                <div className="bg-amber-500/5 rounded-xl border border-amber-500/20 p-4">
                  <h3 className="text-xs font-bold text-amber-500 mb-2 flex items-center gap-2">
                    <Settings size={12} /> Variabile Disponibile
                  </h3>
                  <p className="text-[10px] text-muted-foreground mb-3">
                    Aceste variabile sunt înlocuite automat cu datele reale la generarea contractului. Folosește-le în conținutul secțiunilor.
                  </p>
                  <div className="grid grid-cols-2 gap-1 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                    {AVAILABLE_VARIABLES.map(v => (
                      <div key={v.var} className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-amber-500/10 transition-colors">
                        <code className="text-[9px] font-mono font-bold text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded">{v.var}</code>
                        <span className="text-[9px] text-muted-foreground flex-1">{v.label}</span>
                        {v.mandatory ? (
                          <span className="text-[8px] font-bold text-red-500 bg-red-500/10 px-1 py-0.5 rounded">Obligatoriu</span>
                        ) : (
                          <span className="text-[8px] font-bold text-emerald-500 bg-emerald-500/10 px-1 py-0.5 rounded">Opțional</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sections */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-foreground">Secțiuni Contract ({selected.sections.length})</h2>
                  <button
                    onClick={addSection}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-medium bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
                  >
                    <Plus size={10} /> Adaugă Secțiune
                  </button>
                </div>

                {selected.sections.map((section, idx) => {
                  const isEditing = editingSectionId === section.id
                  return (
                    <div
                      key={section.id}
                      className={cn(
                        "rounded-xl border transition-all",
                        isEditing
                          ? "bg-surface border-primary/30 shadow-sm"
                          : "bg-surface border-border hover:border-primary/20"
                      )}
                    >
                      {/* Section header */}
                      <div
                        className="flex items-center gap-2 px-4 py-3 cursor-pointer"
                        onClick={() => setEditingSectionId(isEditing ? null : section.id)}
                      >
                        <GripVertical size={12} className="text-muted-foreground/40" />
                        <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground flex-shrink-0">
                          {idx + 1}
                        </span>
                        {isEditing ? (
                          <input
                            value={section.title}
                            onChange={e => updateSection(section.id, { title: e.target.value })}
                            onClick={e => e.stopPropagation()}
                            className="flex-1 px-2 py-1 text-xs font-bold bg-muted/30 border border-border rounded-lg text-foreground outline-none focus:ring-1 focus:ring-primary"
                          />
                        ) : (
                          <span className="flex-1 text-xs font-semibold text-foreground truncate">{section.title}</span>
                        )}
                        <div className="flex items-center gap-1">
                          <label className="flex items-center gap-1 text-[9px] text-muted-foreground" onClick={e => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={section.editable}
                              onChange={e => updateSection(section.id, { editable: e.target.checked })}
                              className="w-3 h-3 rounded border-border text-primary"
                            />
                            Editabil
                          </label>
                          <button
                            onClick={e => { e.stopPropagation(); removeSection(section.id) }}
                            className="p-1 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={10} />
                          </button>
                          {isEditing ? <ChevronDown size={12} className="text-primary" /> : <ChevronRight size={12} className="text-muted-foreground" />}
                        </div>
                      </div>

                      {/* Section content editor */}
                      {isEditing && (
                        <div className="px-4 pb-4">
                          <textarea
                            value={section.content}
                            onChange={e => updateSection(section.id, { content: e.target.value })}
                            rows={Math.max(8, section.content.split('\n').length + 2)}
                            className="w-full px-3 py-2.5 text-xs font-mono bg-muted/20 border border-border rounded-lg text-foreground outline-none focus:ring-1 focus:ring-primary resize-y leading-relaxed"
                            placeholder="Conținutul secțiunii... Folosește {{variabile}} pentru date dinamice."
                          />
                          <p className="text-[9px] text-muted-foreground mt-1">
                            Formatare: **bold**, *italic* • Variabile: {`{{company_legal_name}}`}, {`{{client_legal_name}}`}, etc.
                          </p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* ── ANEXA 2 — Statement of Work ── */}
              <div className="bg-surface rounded-xl border border-border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                    📎 Anexa 2 — Statement of Work (SoW)
                  </h2>
                  <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!selected.anexa2}
                      onChange={e => {
                        if (e.target.checked) {
                          updateTemplate({
                            anexa2: {
                              deliverables: [],
                              phases: [],
                              reporting: { frequency: 'Lunar', format: 'Raport PDF', meetingCadence: 'La cerere', kpis: [] },
                            },
                          })
                        } else {
                          updateTemplate({ anexa2: null })
                        }
                      }}
                      className="w-3.5 h-3.5 rounded border-border text-primary"
                    />
                    <span className="font-medium">Activează Anexa 2</span>
                  </label>
                </div>

                {selected.anexa2 && (
                  <div className="space-y-4 pt-2">
                    {/* ── Livrabile ── */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold text-foreground">A) Livrabile & KPI-uri ({(selected.anexa2.deliverables || []).length})</h3>
                        <button
                          onClick={() => {
                            const deliverables = [...(selected.anexa2.deliverables || [])]
                            deliverables.push({
                              id: `del-${Date.now()}`,
                              service: 'Serviciu Nou',
                              description: '',
                              frequency: 'lunar' as const,
                              kpi: '',
                              details: [],
                            })
                            updateTemplate({ anexa2: { ...selected.anexa2, deliverables } })
                          }}
                          className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
                        >
                          <Plus size={10} /> Adaugă Livrabil
                        </button>
                      </div>

                      {(selected.anexa2.deliverables || []).map((del: any, di: number) => (
                        <div key={del.id} className="bg-muted/10 rounded-lg border border-border p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-bold text-muted-foreground">LIVRABIL #{di + 1}</span>
                            <button
                              onClick={() => {
                                const deliverables = (selected.anexa2.deliverables || []).filter((_: any, i: number) => i !== di)
                                updateTemplate({ anexa2: { ...selected.anexa2, deliverables } })
                              }}
                              className="p-1 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                            >
                              <Trash2 size={10} />
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[8px] font-bold uppercase text-muted-foreground mb-0.5 block">Serviciu</label>
                              <input
                                value={del.service}
                                onChange={e => {
                                  const deliverables = [...(selected.anexa2.deliverables || [])]
                                  deliverables[di] = { ...deliverables[di], service: e.target.value }
                                  updateTemplate({ anexa2: { ...selected.anexa2, deliverables } })
                                }}
                                className="w-full px-2 py-1.5 text-xs bg-muted/30 border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[8px] font-bold uppercase text-muted-foreground mb-0.5 block">Frecvență</label>
                                <select
                                  value={del.frequency}
                                  onChange={e => {
                                    const deliverables = [...(selected.anexa2.deliverables || [])]
                                    deliverables[di] = { ...deliverables[di], frequency: e.target.value }
                                    updateTemplate({ anexa2: { ...selected.anexa2, deliverables } })
                                  }}
                                  className="w-full px-2 py-1.5 text-xs bg-muted/30 border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary"
                                >
                                  <option value="one-time">One-time</option>
                                  <option value="lunar">Lunar</option>
                                  <option value="trimestrial">Trimestrial</option>
                                  <option value="la cerere">La cerere</option>
                                </select>
                              </div>
                              <div>
                                <label className="text-[8px] font-bold uppercase text-muted-foreground mb-0.5 block">KPI</label>
                                <input
                                  value={del.kpi}
                                  onChange={e => {
                                    const deliverables = [...(selected.anexa2.deliverables || [])]
                                    deliverables[di] = { ...deliverables[di], kpi: e.target.value }
                                    updateTemplate({ anexa2: { ...selected.anexa2, deliverables } })
                                  }}
                                  className="w-full px-2 py-1.5 text-xs bg-muted/30 border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary"
                                  placeholder="ex: Raport complet"
                                />
                              </div>
                            </div>
                          </div>
                          <div>
                            <label className="text-[8px] font-bold uppercase text-muted-foreground mb-0.5 block">Descriere</label>
                            <input
                              value={del.description || ''}
                              onChange={e => {
                                const deliverables = [...(selected.anexa2.deliverables || [])]
                                deliverables[di] = { ...deliverables[di], description: e.target.value }
                                updateTemplate({ anexa2: { ...selected.anexa2, deliverables } })
                              }}
                              className="w-full px-2 py-1.5 text-xs bg-muted/30 border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary"
                              placeholder="Descriere detaliată a livrabilului..."
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* ── Faze de Implementare ── */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold text-foreground">B) Faze de Implementare ({(selected.anexa2.phases || []).length})</h3>
                        <button
                          onClick={() => {
                            const phases = [...(selected.anexa2.phases || [])]
                            const nextIdx = phases.length + 1
                            phases.push({
                              id: `phase-${Date.now()}`,
                              name: `Faza ${nextIdx}`,
                              period: `Luna ${nextIdx}`,
                              tasks: ['Task nou'],
                              deliverable: 'Livrabil fază',
                            })
                            updateTemplate({ anexa2: { ...selected.anexa2, phases } })
                          }}
                          className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
                        >
                          <Plus size={10} /> Adaugă Fază
                        </button>
                      </div>

                      {(selected.anexa2.phases || []).map((phase: any, pi: number) => (
                        <div key={phase.id} className="bg-muted/10 rounded-lg border border-border p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-bold text-muted-foreground">FAZA #{pi + 1}</span>
                            <button
                              onClick={() => {
                                const phases = (selected.anexa2.phases || []).filter((_: any, i: number) => i !== pi)
                                updateTemplate({ anexa2: { ...selected.anexa2, phases } })
                              }}
                              className="p-1 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                            >
                              <Trash2 size={10} />
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[8px] font-bold uppercase text-muted-foreground mb-0.5 block">Nume Fază</label>
                              <input
                                value={phase.name}
                                onChange={e => {
                                  const phases = [...(selected.anexa2.phases || [])]
                                  phases[pi] = { ...phases[pi], name: e.target.value }
                                  updateTemplate({ anexa2: { ...selected.anexa2, phases } })
                                }}
                                className="w-full px-2 py-1.5 text-xs bg-muted/30 border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary"
                              />
                            </div>
                            <div>
                              <label className="text-[8px] font-bold uppercase text-muted-foreground mb-0.5 block">Perioadă</label>
                              <input
                                value={phase.period}
                                onChange={e => {
                                  const phases = [...(selected.anexa2.phases || [])]
                                  phases[pi] = { ...phases[pi], period: e.target.value }
                                  updateTemplate({ anexa2: { ...selected.anexa2, phases } })
                                }}
                                className="w-full px-2 py-1.5 text-xs bg-muted/30 border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary"
                                placeholder="ex: Luna 1, Lunile 2-3"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-[8px] font-bold uppercase text-muted-foreground mb-0.5 block">Task-uri (câte unul pe linie)</label>
                            <textarea
                              value={(phase.tasks || []).join('\n')}
                              onChange={e => {
                                const phases = [...(selected.anexa2.phases || [])]
                                phases[pi] = { ...phases[pi], tasks: e.target.value.split('\n').filter((t: string) => t.trim()) }
                                updateTemplate({ anexa2: { ...selected.anexa2, phases } })
                              }}
                              rows={3}
                              className="w-full px-2 py-1.5 text-xs font-mono bg-muted/30 border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary resize-y"
                              placeholder="Un task pe fiecare linie..."
                            />
                          </div>
                          <div>
                            <label className="text-[8px] font-bold uppercase text-muted-foreground mb-0.5 block">Livrabil Final</label>
                            <input
                              value={phase.deliverable}
                              onChange={e => {
                                const phases = [...(selected.anexa2.phases || [])]
                                phases[pi] = { ...phases[pi], deliverable: e.target.value }
                                updateTemplate({ anexa2: { ...selected.anexa2, phases } })
                              }}
                              className="w-full px-2 py-1.5 text-xs bg-muted/30 border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary"
                              placeholder="Ce se livrează la finalizarea fazei..."
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* ── Cadru Raportare ── */}
                    <div className="space-y-2">
                      <h3 className="text-xs font-bold text-foreground">C) Cadru de Raportare</h3>
                      <div className="bg-muted/10 rounded-lg border border-border p-3 space-y-2">
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="text-[8px] font-bold uppercase text-muted-foreground mb-0.5 block">Frecvență</label>
                            <input
                              value={selected.anexa2.reporting?.frequency || ''}
                              onChange={e => {
                                const reporting = { ...(selected.anexa2.reporting || {}), frequency: e.target.value }
                                updateTemplate({ anexa2: { ...selected.anexa2, reporting } })
                              }}
                              className="w-full px-2 py-1.5 text-xs bg-muted/30 border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary"
                              placeholder="ex: Lunar"
                            />
                          </div>
                          <div>
                            <label className="text-[8px] font-bold uppercase text-muted-foreground mb-0.5 block">Format</label>
                            <input
                              value={selected.anexa2.reporting?.format || ''}
                              onChange={e => {
                                const reporting = { ...(selected.anexa2.reporting || {}), format: e.target.value }
                                updateTemplate({ anexa2: { ...selected.anexa2, reporting } })
                              }}
                              className="w-full px-2 py-1.5 text-xs bg-muted/30 border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary"
                              placeholder="ex: Raport PDF"
                            />
                          </div>
                          <div>
                            <label className="text-[8px] font-bold uppercase text-muted-foreground mb-0.5 block">Cadență Meeting</label>
                            <input
                              value={selected.anexa2.reporting?.meetingCadence || ''}
                              onChange={e => {
                                const reporting = { ...(selected.anexa2.reporting || {}), meetingCadence: e.target.value }
                                updateTemplate({ anexa2: { ...selected.anexa2, reporting } })
                              }}
                              className="w-full px-2 py-1.5 text-xs bg-muted/30 border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary"
                              placeholder="ex: Bilunar"
                            />
                          </div>
                        </div>

                        {/* KPI Categories */}
                        <div className="pt-2 space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-[8px] font-bold uppercase text-muted-foreground">Categorii KPI ({(selected.anexa2.reporting?.kpis || []).length})</label>
                            <button
                              onClick={() => {
                                const kpis = [...(selected.anexa2.reporting?.kpis || [])]
                                kpis.push({ category: 'Categorie Nouă', metrics: ['Metric 1'] })
                                const reporting = { ...(selected.anexa2.reporting || {}), kpis }
                                updateTemplate({ anexa2: { ...selected.anexa2, reporting } })
                              }}
                              className="flex items-center gap-1 px-2 py-0.5 text-[9px] font-medium bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors"
                            >
                              <Plus size={8} /> Categorie
                            </button>
                          </div>
                          {(selected.anexa2.reporting?.kpis || []).map((kpi: any, ki: number) => (
                            <div key={ki} className="bg-background/50 rounded-lg border border-border/50 p-2 space-y-1.5">
                              <div className="flex items-center gap-2">
                                <input
                                  value={kpi.category}
                                  onChange={e => {
                                    const kpis = [...(selected.anexa2.reporting?.kpis || [])]
                                    kpis[ki] = { ...kpis[ki], category: e.target.value }
                                    const reporting = { ...(selected.anexa2.reporting || {}), kpis }
                                    updateTemplate({ anexa2: { ...selected.anexa2, reporting } })
                                  }}
                                  className="flex-1 px-2 py-1 text-[10px] font-bold bg-muted/30 border border-border rounded outline-none focus:ring-1 focus:ring-primary"
                                  placeholder="Nume categorie"
                                />
                                <button
                                  onClick={() => {
                                    const kpis = (selected.anexa2.reporting?.kpis || []).filter((_: any, i: number) => i !== ki)
                                    const reporting = { ...(selected.anexa2.reporting || {}), kpis }
                                    updateTemplate({ anexa2: { ...selected.anexa2, reporting } })
                                  }}
                                  className="p-0.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                                >
                                  <Trash2 size={9} />
                                </button>
                              </div>
                              <textarea
                                value={(kpi.metrics || []).join('\n')}
                                onChange={e => {
                                  const kpis = [...(selected.anexa2.reporting?.kpis || [])]
                                  kpis[ki] = { ...kpis[ki], metrics: e.target.value.split('\n').filter((m: string) => m.trim()) }
                                  const reporting = { ...(selected.anexa2.reporting || {}), kpis }
                                  updateTemplate({ anexa2: { ...selected.anexa2, reporting } })
                                }}
                                rows={2}
                                className="w-full px-2 py-1 text-[10px] font-mono bg-muted/30 border border-border rounded outline-none focus:ring-1 focus:ring-primary resize-y"
                                placeholder="Un metric pe linie..."
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Preview mini */}
              <div className="bg-surface rounded-xl border border-border p-4">
                <h3 className="text-xs font-bold text-foreground mb-2 flex items-center gap-2">
                  <Eye size={12} className="text-emerald-500" /> Preview Rapid
                </h3>
                <div className="bg-muted/20 rounded-lg p-4 max-h-[300px] overflow-y-auto">
                  <div className="text-center mb-4">
                    <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-muted-foreground mb-1">— Contract —</p>
                    <h2 className="text-sm font-bold text-foreground uppercase">Contract de Prestări Servicii</h2>
                    <p className="text-[10px] text-primary font-semibold mt-0.5">{selected.name}</p>
                  </div>
                  {selected.sections.map((s, i) => (
                    <div key={s.id} className="mb-3">
                      <h4 className="text-[10px] font-bold text-foreground mb-1">{s.title}</h4>
                      <p className="text-[9px] text-muted-foreground line-clamp-3 whitespace-pre-line">
                        {s.content.substring(0, 200)}{s.content.length > 200 ? '...' : ''}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-3">
                <FileText size={48} className="mx-auto text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Selectează un template din lista din stânga</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

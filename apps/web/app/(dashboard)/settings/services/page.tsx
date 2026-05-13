"use client"

import { useState, useEffect, useCallback } from "react"
import { cn, formatCurrency } from "@/lib/utils"
import {
  Plus, Pencil, Trash2, Check, X, Save, ChevronDown, ChevronRight,
  Package, Loader2, AlertCircle, Undo2, Zap, Crown, Infinity, Globe,
  TrendingUp, Target, Settings, FileText, Search, Shield, Palette,
  MessageSquare, BarChart3, Sparkles, Image, Monitor, Rocket,
  LayoutTemplate, GripVertical, Settings2,
} from "lucide-react"

/* ── Icon Map ── */
const iconMap: Record<string, React.ElementType> = {
  Globe, TrendingUp, Target, Settings, FileText, Search, Shield,
  Palette, MessageSquare, BarChart3, Package, Sparkles, Zap, Crown,
  Infinity, Image, Monitor, Rocket, LayoutTemplate, GripVertical,
}
const iconOptions = Object.keys(iconMap)
function SvcIcon({ icon, className }: { icon?: string | null; className?: string }) {
  const Icon = (icon && iconMap[icon]) || Package
  return <Icon size={16} className={className} />
}

const categoryOptions = [
  { value: 'development', label: '🔧 Development' },
  { value: 'marketing', label: '📈 Marketing' },
  { value: 'consultancy', label: '🔍 Consultanță' },
  { value: 'saas', label: '🚀 SaaS Platform' },
]

const pricingUnits = [
  { value: 'fix', label: 'Preț Fix' },
  { value: 'lunar', label: 'Lunar' },
  { value: 'per_hour', label: 'Pe Oră' },
  { value: 'one_time', label: 'One-Time' },
]

function unitLabel(u: string): string {
  return pricingUnits.find(p => p.value === u)?.label || u
}

interface ServiceTemplate {
  id: string
  businessLineId: string
  name: string
  shortName: string
  icon: string | null
  description: string | null
  category: string
  defaultPrice: number
  pricingUnit: string
  setupFee: number | null
  currency: string
  isActive: boolean
  sortOrder: number
  businessLine?: { slug: string; name: string; color: string }
}

interface BL { id: string; name: string; slug: string; icon?: string; color?: string }

/* ═══════════════════════════════════════════════════
   ADMIN: Catalog Servicii per Business Line
   ═══════════════════════════════════════════════════ */

export default function ServicesSettingsPage() {
  const [businessLines, setBusinessLines] = useState<BL[]>([])
  const [services, setServices] = useState<ServiceTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedBL, setExpandedBL] = useState("")
  const [toast, setToast] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<ServiceTemplate>>({})

  // Add state
  const [addingToBL, setAddingToBL] = useState<string | null>(null)
  const [newForm, setNewForm] = useState({
    name: '', shortName: '', icon: 'Package', description: '',
    category: 'development', defaultPrice: 0, pricingUnit: 'fix',
    setupFee: 0, currency: 'EUR',
  })

  // Delete confirm
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  // ─── Load Data ───
  useEffect(() => {
    Promise.all([
      fetch('/api/settings/business-lines').then(r => r.json()),
      fetch('/api/services?active=false').then(r => r.json()),
    ])
      .then(([blRes, svcRes]) => {
        const lines = blRes.data || blRes || []
        setBusinessLines(lines)
        setServices(svcRes.data || [])
        if (lines.length > 0) setExpandedBL(lines[0].id)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  // ─── CRUD ───
  const createService = useCallback(async (blId: string) => {
    if (!newForm.name.trim() || !newForm.shortName.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newForm,
          businessLineId: blId,
          setupFee: newForm.setupFee || null,
        }),
      })
      if (!res.ok) throw new Error('Failed')
      const { data } = await res.json()
      setServices(prev => [...prev, data])
      setAddingToBL(null)
      setNewForm({ name: '', shortName: '', icon: 'Package', description: '', category: 'development', defaultPrice: 0, pricingUnit: 'fix', setupFee: 0, currency: 'EUR' })
      showToast(`Serviciu "${data.name}" creat cu succes!`)
    } catch { showToast('Eroare la creare serviciu') }
    finally { setSaving(false) }
  }, [newForm])

  const updateService = useCallback(async (id: string) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/services/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })
      if (!res.ok) throw new Error('Failed')
      const { data } = await res.json()
      setServices(prev => prev.map(s => s.id === id ? { ...s, ...data } : s))
      setEditingId(null)
      showToast(`Serviciu "${data.name}" actualizat!`)
    } catch { showToast('Eroare la actualizare') }
    finally { setSaving(false) }
  }, [editForm])

  const deleteService = useCallback(async (id: string) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/services/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed')
      setServices(prev => prev.map(s => s.id === id ? { ...s, isActive: false } : s))
      setConfirmDeleteId(null)
      showToast('Serviciu dezactivat')
    } catch { showToast('Eroare la ștergere') }
    finally { setSaving(false) }
  }, [])

  const reactivateService = useCallback(async (id: string) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/services/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: true }),
      })
      if (!res.ok) throw new Error('Failed')
      setServices(prev => prev.map(s => s.id === id ? { ...s, isActive: true } : s))
      showToast('Serviciu reactivat!')
    } catch { showToast('Eroare la reactivare') }
    finally { setSaving(false) }
  }, [])

  const startEdit = (svc: ServiceTemplate) => {
    setEditingId(svc.id)
    setEditForm({
      name: svc.name,
      shortName: svc.shortName,
      icon: svc.icon,
      description: svc.description,
      category: svc.category,
      defaultPrice: svc.defaultPrice,
      pricingUnit: svc.pricingUnit,
      setupFee: svc.setupFee,
      currency: svc.currency,
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 size={24} className="animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-5 animate-fade-in max-w-5xl mx-auto pb-24">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Package size={18} className="text-primary" />
          <h1 className="text-xl font-bold text-foreground">Catalog Servicii</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Gestionează serviciile disponibile per linie de business. Acestea sunt folosite la crearea ofertelor.
        </p>
      </div>

      {/* BL Accordion Cards */}
      <div className="space-y-3">
        {businessLines.map(bl => {
          const isExpanded = expandedBL === bl.id
          const blServices = services.filter(s => s.businessLineId === bl.id)
          const activeCount = blServices.filter(s => s.isActive).length
          const inactiveCount = blServices.filter(s => !s.isActive).length

          // group by category
          const groupedActive = new Map<string, ServiceTemplate[]>()
          blServices.filter(s => s.isActive).forEach(s => {
            if (!groupedActive.has(s.category)) groupedActive.set(s.category, [])
            groupedActive.get(s.category)!.push(s)
          })
          const inactiveServices = blServices.filter(s => !s.isActive)

          return (
            <div key={bl.id} className="bg-surface rounded-xl border border-border overflow-hidden">
              {/* BL Header */}
              <button
                onClick={() => setExpandedBL(isExpanded ? '' : bl.id)}
                className="w-full flex items-center gap-3 px-5 py-4 hover:bg-muted/20 transition-colors"
              >
                <span className="text-lg">{bl.icon || '📦'}</span>
                <div className="text-left flex-1">
                  <p className="text-sm font-semibold text-foreground">{bl.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {activeCount} serviciu{activeCount !== 1 ? 'ri' : ''} active
                    {inactiveCount > 0 && <span className="text-muted-foreground/50"> • {inactiveCount} dezactivate</span>}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {/* mini price badges */}
                  <div className="hidden md:flex items-center gap-1">
                    {blServices.filter(s => s.isActive).slice(0, 3).map(s => (
                      <span key={s.id} className="text-[9px] font-mono font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                        {formatCurrency(s.defaultPrice)}
                      </span>
                    ))}
                    {activeCount > 3 && (
                      <span className="text-[9px] text-muted-foreground">+{activeCount - 3}</span>
                    )}
                  </div>
                  {isExpanded ? <ChevronDown size={16} className="text-muted-foreground" /> : <ChevronRight size={16} className="text-muted-foreground" />}
                </div>
              </button>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="px-5 pb-5 border-t border-border pt-4 space-y-4">
                  {/* Active services grouped by category */}
                  {Array.from(groupedActive.entries()).map(([cat, items]) => (
                    <div key={cat}>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-2">
                        {categoryOptions.find(c => c.value === cat)?.label || cat}
                      </p>
                      <div className="space-y-1.5">
                        {items.map(svc => {
                          const isEditing = editingId === svc.id
                          const isDeleting = confirmDeleteId === svc.id

                          if (isEditing) {
                            return (
                              <div key={svc.id} className="p-4 rounded-xl border-2 border-primary/30 bg-primary/5 space-y-3 animate-fade-in">
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="text-[9px] font-bold uppercase text-muted-foreground mb-1 block">Nume</label>
                                    <input value={editForm.name || ''} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                                      className="w-full px-2.5 py-2 text-sm bg-muted/30 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
                                  </div>
                                  <div>
                                    <label className="text-[9px] font-bold uppercase text-muted-foreground mb-1 block">Nume Scurt</label>
                                    <input value={editForm.shortName || ''} onChange={e => setEditForm(f => ({ ...f, shortName: e.target.value }))}
                                      className="w-full px-2.5 py-2 text-sm bg-muted/30 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
                                  </div>
                                </div>
                                <div>
                                  <label className="text-[9px] font-bold uppercase text-muted-foreground mb-1 block">Descriere</label>
                                  <textarea value={editForm.description || ''} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} rows={2}
                                    className="w-full px-2.5 py-2 text-sm bg-muted/30 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
                                </div>
                                <div className="grid grid-cols-4 gap-3">
                                  <div>
                                    <label className="text-[9px] font-bold uppercase text-muted-foreground mb-1 block">Categorie</label>
                                    <select value={editForm.category || ''} onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}
                                      className="w-full px-2 py-2 text-sm bg-muted/30 border border-border rounded-lg text-foreground focus:outline-none">
                                      {categoryOptions.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="text-[9px] font-bold uppercase text-muted-foreground mb-1 block">Preț</label>
                                    <input type="number" value={editForm.defaultPrice ?? 0} onChange={e => setEditForm(f => ({ ...f, defaultPrice: +e.target.value }))}
                                      className="w-full px-2.5 py-2 text-sm bg-muted/30 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
                                  </div>
                                  <div>
                                    <label className="text-[9px] font-bold uppercase text-muted-foreground mb-1 block">Tip Preț</label>
                                    <select value={editForm.pricingUnit || ''} onChange={e => setEditForm(f => ({ ...f, pricingUnit: e.target.value }))}
                                      className="w-full px-2 py-2 text-sm bg-muted/30 border border-border rounded-lg text-foreground focus:outline-none">
                                      {pricingUnits.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="text-[9px] font-bold uppercase text-muted-foreground mb-1 block">Setup Fee</label>
                                    <input type="number" value={editForm.setupFee ?? 0} onChange={e => setEditForm(f => ({ ...f, setupFee: +e.target.value || null }))}
                                      className="w-full px-2.5 py-2 text-sm bg-muted/30 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
                                  </div>
                                </div>
                                <div>
                                  <label className="text-[9px] font-bold uppercase text-muted-foreground mb-1 block">Iconiță</label>
                                  <div className="flex flex-wrap gap-1">
                                    {iconOptions.map(ico => (
                                      <button key={ico} onClick={() => setEditForm(f => ({ ...f, icon: ico }))}
                                        className={cn("w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                                          editForm.icon === ico ? "bg-primary/20 ring-2 ring-primary/30" : "bg-muted/30 hover:bg-muted/50"
                                        )}>
                                        <SvcIcon icon={ico} className={editForm.icon === ico ? "text-primary" : "text-muted-foreground"} />
                                      </button>
                                    ))}
                                  </div>
                                </div>
                                <div className="flex items-center justify-end gap-2 pt-1">
                                  <button onClick={() => setEditingId(null)} className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                                    Anulează
                                  </button>
                                  <button onClick={() => updateService(svc.id)} disabled={saving}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50">
                                    {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Salvează
                                  </button>
                                </div>
                              </div>
                            )
                          }

                          return (
                            <div key={svc.id} className="group flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border/50 bg-muted/10 hover:bg-muted/30 transition-all">
                              <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                                <SvcIcon icon={svc.icon} className="text-muted-foreground" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground">{svc.name}</p>
                                <p className="text-[10px] text-muted-foreground truncate">{svc.description}</p>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="text-xs font-mono font-bold text-primary">{formatCurrency(svc.defaultPrice)}</p>
                                <p className="text-[9px] text-muted-foreground">{unitLabel(svc.pricingUnit)}{svc.setupFee ? ` + ${formatCurrency(svc.setupFee)} setup` : ''}</p>
                              </div>

                              {isDeleting ? (
                                <div className="flex items-center gap-1.5 animate-fade-in">
                                  <span className="text-[10px] text-red-400 font-medium">Dezactivezi?</span>
                                  <button onClick={() => deleteService(svc.id)} className="w-6 h-6 rounded-md flex items-center justify-center bg-red-500/10 hover:bg-red-500/20 text-red-400"><Check size={12} /></button>
                                  <button onClick={() => setConfirmDeleteId(null)} className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-muted text-muted-foreground"><X size={12} /></button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => startEdit(svc)} className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground"><Pencil size={12} /></button>
                                  <button onClick={() => setConfirmDeleteId(svc.id)} className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-red-500/10 text-muted-foreground hover:text-red-400"><Trash2 size={12} /></button>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}

                  {/* Inactive services */}
                  {inactiveServices.length > 0 && (
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/40 mb-2">
                        🚫 Dezactivate
                      </p>
                      <div className="space-y-1">
                        {inactiveServices.map(svc => (
                          <div key={svc.id} className="flex items-center gap-3 px-3 py-2 rounded-lg border border-border/30 bg-muted/5 opacity-50 hover:opacity-80 transition-opacity">
                            <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center">
                              <SvcIcon icon={svc.icon} className="text-muted-foreground/50" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-foreground/70 line-through">{svc.name}</p>
                            </div>
                            <button onClick={() => reactivateService(svc.id)}
                              className="text-[10px] font-medium text-primary hover:underline">
                              Reactivează
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Add new service */}
                  {addingToBL === bl.id ? (
                    <div className="p-4 rounded-xl border-2 border-primary/20 bg-primary/5 space-y-3 animate-fade-in">
                      <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <Plus size={12} className="text-primary" /> Serviciu Nou — {bl.name}
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[9px] font-bold uppercase text-muted-foreground mb-1 block">Nume *</label>
                          <input value={newForm.name} onChange={e => setNewForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: SEO Optimization"
                            className="w-full px-2.5 py-2 text-sm bg-muted/30 border border-border rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30" />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold uppercase text-muted-foreground mb-1 block">Nume Scurt *</label>
                          <input value={newForm.shortName} onChange={e => setNewForm(f => ({ ...f, shortName: e.target.value }))} placeholder="Ex: SEO"
                            className="w-full px-2.5 py-2 text-sm bg-muted/30 border border-border rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30" />
                        </div>
                      </div>
                      <div>
                        <label className="text-[9px] font-bold uppercase text-muted-foreground mb-1 block">Descriere</label>
                        <textarea value={newForm.description} onChange={e => setNewForm(f => ({ ...f, description: e.target.value }))} rows={2} placeholder="Descrie ce include acest serviciu..."
                          className="w-full px-2.5 py-2 text-sm bg-muted/30 border border-border rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
                      </div>
                      <div className="grid grid-cols-4 gap-3">
                        <div>
                          <label className="text-[9px] font-bold uppercase text-muted-foreground mb-1 block">Categorie</label>
                          <select value={newForm.category} onChange={e => setNewForm(f => ({ ...f, category: e.target.value }))}
                            className="w-full px-2 py-2 text-sm bg-muted/30 border border-border rounded-lg text-foreground focus:outline-none">
                            {categoryOptions.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-[9px] font-bold uppercase text-muted-foreground mb-1 block">Preț (EUR)</label>
                          <input type="number" value={newForm.defaultPrice} onChange={e => setNewForm(f => ({ ...f, defaultPrice: +e.target.value }))}
                            className="w-full px-2.5 py-2 text-sm bg-muted/30 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold uppercase text-muted-foreground mb-1 block">Tip Preț</label>
                          <select value={newForm.pricingUnit} onChange={e => setNewForm(f => ({ ...f, pricingUnit: e.target.value }))}
                            className="w-full px-2 py-2 text-sm bg-muted/30 border border-border rounded-lg text-foreground focus:outline-none">
                            {pricingUnits.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-[9px] font-bold uppercase text-muted-foreground mb-1 block">Setup Fee</label>
                          <input type="number" value={newForm.setupFee} onChange={e => setNewForm(f => ({ ...f, setupFee: +e.target.value }))}
                            className="w-full px-2.5 py-2 text-sm bg-muted/30 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
                        </div>
                      </div>
                      <div>
                        <label className="text-[9px] font-bold uppercase text-muted-foreground mb-1 block">Iconiță</label>
                        <div className="flex flex-wrap gap-1">
                          {iconOptions.map(ico => (
                            <button key={ico} onClick={() => setNewForm(f => ({ ...f, icon: ico }))}
                              className={cn("w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                                newForm.icon === ico ? "bg-primary/20 ring-2 ring-primary/30" : "bg-muted/30 hover:bg-muted/50"
                              )}>
                              <SvcIcon icon={ico} className={newForm.icon === ico ? "text-primary" : "text-muted-foreground"} />
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button onClick={() => setAddingToBL(null)} className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
                          Anulează
                        </button>
                        <button onClick={() => createService(bl.id)} disabled={saving || !newForm.name.trim() || !newForm.shortName.trim()}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50">
                          {saving ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Adaugă Serviciu
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setAddingToBL(bl.id); setNewForm(f => ({ ...f, name: '', shortName: '', description: '' })) }}
                      className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg border border-dashed border-border/50 transition-all w-full justify-center"
                    >
                      <Plus size={12} /> Adaugă Serviciu în {bl.name}
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Info */}
      <div className="bg-primary/5 border border-primary/10 rounded-xl p-4">
        <p className="text-xs text-muted-foreground">
          <strong className="text-foreground">💡 Notă:</strong> Serviciile definite aici apar automat la crearea ofertelor, filtrate pe linia de business selectată.
          Dezactivarea unui serviciu nu afectează ofertele existente, dar îl scoate din catalogul disponibil pentru oferte noi.
        </p>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-[60] animate-fade-in">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-surface border border-border rounded-xl shadow-xl">
            <Check size={14} className="text-emerald-400" />
            <span className="text-xs font-medium text-foreground">{toast}</span>
          </div>
        </div>
      )}
    </div>
  )
}

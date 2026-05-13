"use client"

import { useState, useMemo, useCallback } from "react"
import { serviceCatalog, businessLines } from "@repo/mock-data"
import type { ServiceCatalogItem, OfferModule, OfferDiscount, OfferBlock, PricingUnit } from "@repo/mock-data"
import { cn, formatCurrency } from "@/lib/utils"
import {
  X, Plus, Minus, Trash2, Send, Eye, ChevronRight, CheckCircle2,
  Globe, TrendingUp, Target, Settings, FileText, Search, Shield,
  Palette, MessageSquare, BarChart3, Package, Sparkles, Gift,
} from "lucide-react"

/* ── Icon Map ── */

const iconMap: Record<string, React.ElementType> = {
  Globe, TrendingUp, Target, Settings, FileText, Search, Shield,
  Palette, MessageSquare, BarChart3, Package, Sparkles,
}

/* ── Types ── */

export interface ConfiguratorPrefill {
  businessLineId?: string
  entityName?: string
  entityId?: string
  projectName?: string
}

interface Props {
  onClose: () => void
  prefill?: ConfiguratorPrefill
}

interface ModuleDraft {
  serviceId: string
  service: ServiceCatalogItem
  price: number
  pricingUnit: PricingUnit
  setupFee: number
  status: 'priced' | 'included_free'
  discount?: OfferDiscount
  enabledBlocks: Set<string>   // block IDs that are active
}

interface CustomService {
  name: string
  description: string
  price: number
  pricingUnit: PricingUnit
}

/* ── Helper: price format ── */
function unitLabel(unit: PricingUnit): string {
  return unit === 'lunar' ? '/lună' : unit === 'per_hour' ? '/oră' : ''
}

/* ══════════════════════════════════════════════════════════
   OFFER CONFIGURATOR — replaces the old linear wizard
   ══════════════════════════════════════════════════════════ */

export function OfferConfigurator({ onClose, prefill }: Props) {
  // ─── State ──────────────────────────────────
  const [entityName, setEntityName] = useState(prefill?.entityName || "")
  const [projectName, setProjectName] = useState(prefill?.projectName || "")
  const [selectedBL, setSelectedBL] = useState(prefill?.businessLineId || "agency")

  // Active modules
  const [modules, setModules] = useState<ModuleDraft[]>([])
  const [activeModuleIdx, setActiveModuleIdx] = useState<number | null>(null)

  // Custom service form
  const [showCustomForm, setShowCustomForm] = useState(false)
  const [customDraft, setCustomDraft] = useState<CustomService>({ name: "", description: "", price: 0, pricingUnit: 'fix' })

  // Bundle discount
  const [bundleDiscount, setBundleDiscount] = useState<OfferDiscount | null>(null)

  // ─── Derived ────────────────────────────────
  const selectedServiceIds = useMemo(() => new Set(modules.map(m => m.serviceId)), [modules])

  // Services that are automatically included (free) based on selected paid ones
  const autoIncludedIds = useMemo(() => {
    const ids = new Set<string>()
    serviceCatalog.forEach(svc => {
      if (svc.includedWith && !selectedServiceIds.has(svc.id)) {
        const hasParent = svc.includedWith.some(parentId => selectedServiceIds.has(parentId))
        if (hasParent) ids.add(svc.id)
      }
    })
    return ids
  }, [selectedServiceIds])

  // Totals
  const totals = useMemo(() => {
    let monthly = 0
    let fixed = 0
    let setup = 0

    modules.forEach(m => {
      if (m.status === 'included_free') return
      let price = m.price
      if (m.discount) {
        price = m.discount.type === 'percent'
          ? price * (1 - m.discount.value / 100)
          : price - m.discount.value
      }
      if (m.pricingUnit === 'lunar') monthly += price
      else fixed += price
      setup += m.setupFee
    })

    // Bundle discount
    if (bundleDiscount) {
      if (bundleDiscount.type === 'percent') {
        monthly *= (1 - bundleDiscount.value / 100)
        fixed *= (1 - bundleDiscount.value / 100)
      } else {
        monthly -= bundleDiscount.value
      }
    }

    return { monthly: Math.max(0, monthly), fixed: Math.max(0, fixed), setup }
  }, [modules, bundleDiscount])

  // ─── Actions ────────────────────────────────

  const toggleService = useCallback((svc: ServiceCatalogItem) => {
    if (selectedServiceIds.has(svc.id)) {
      // Remove it
      setModules(prev => prev.filter(m => m.serviceId !== svc.id))
      if (activeModuleIdx !== null) {
        const activeModule = modules[activeModuleIdx]
        if (activeModule?.serviceId === svc.id) setActiveModuleIdx(null)
      }
    } else {
      // Add it
      const isIncludedFree = svc.includedWith?.some(pid => selectedServiceIds.has(pid)) || false
      const newModule: ModuleDraft = {
        serviceId: svc.id,
        service: svc,
        price: isIncludedFree ? 0 : svc.defaultPrice,
        pricingUnit: svc.pricingUnit,
        setupFee: svc.setupFee || 0,
        status: isIncludedFree ? 'included_free' : 'priced',
        enabledBlocks: new Set(svc.defaultBlocks.map(b => b.id)),
      }
      setModules(prev => [...prev, newModule])
      setActiveModuleIdx(modules.length)
    }
  }, [selectedServiceIds, activeModuleIdx, modules])

  const addAutoIncluded = useCallback((svcId: string) => {
    const svc = serviceCatalog.find(s => s.id === svcId)
    if (!svc || selectedServiceIds.has(svcId)) return
    const newModule: ModuleDraft = {
      serviceId: svc.id,
      service: svc,
      price: 0,
      pricingUnit: svc.pricingUnit,
      setupFee: 0,
      status: 'included_free',
      enabledBlocks: new Set(svc.defaultBlocks.map(b => b.id)),
    }
    setModules(prev => [...prev, newModule])
  }, [selectedServiceIds])

  const addCustomService = useCallback(() => {
    if (!customDraft.name) return
    const customSvc: ServiceCatalogItem = {
      id: `custom-${Date.now()}`,
      name: customDraft.name,
      shortName: customDraft.name.slice(0, 15),
      icon: 'Package',
      description: customDraft.description,
      category: 'consultancy',
      defaultPrice: customDraft.price,
      pricingUnit: customDraft.pricingUnit,
      defaultBlocks: customDraft.description ? [{
        id: `custom-text-${Date.now()}`,
        type: 'text' as const,
        title: customDraft.name,
        data: { content: customDraft.description },
      }] : [],
    }
    const newModule: ModuleDraft = {
      serviceId: customSvc.id,
      service: customSvc,
      price: customSvc.defaultPrice,
      pricingUnit: customSvc.pricingUnit,
      setupFee: 0,
      status: 'priced',
      enabledBlocks: new Set(customSvc.defaultBlocks.map(b => b.id)),
    }
    setModules(prev => [...prev, newModule])
    setCustomDraft({ name: "", description: "", price: 0, pricingUnit: 'fix' })
    setShowCustomForm(false)
    setActiveModuleIdx(modules.length)
  }, [customDraft, modules.length])

  const updateModule = useCallback((idx: number, updates: Partial<ModuleDraft>) => {
    setModules(prev => prev.map((m, i) => i === idx ? { ...m, ...updates } : m))
  }, [])

  // ─── Render ─────────────────────────────────

  const paidServices = serviceCatalog.filter(s => !s.includedWith)
  const includableServices = serviceCatalog.filter(s => s.includedWith)
  const activeModule = activeModuleIdx !== null ? modules[activeModuleIdx] : null

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" />
      <div className="relative flex w-full max-w-6xl mx-auto my-4 md:my-8 animate-scale-in" onClick={e => e.stopPropagation()}>
        <div className="flex flex-col md:flex-row w-full bg-surface rounded-2xl border border-border shadow-2xl overflow-hidden">

          {/* ═══ LEFT PANEL — Service Catalog ═══ */}
          <div className="w-full md:w-72 lg:w-80 border-b md:border-b-0 md:border-r border-border bg-muted/30 flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-foreground">Configurator Ofertă</h2>
                <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                  <X size={14} />
                </button>
              </div>

              {/* Client info */}
              <div className="space-y-2">
                <input
                  value={entityName} onChange={e => setEntityName(e.target.value)}
                  placeholder="Numele firmei..."
                  className="w-full px-3 py-1.5 text-xs bg-surface border border-border rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
                />
                <input
                  value={projectName} onChange={e => setProjectName(e.target.value)}
                  placeholder="Numele proiectului (opțional)..."
                  className="w-full px-3 py-1.5 text-xs bg-surface border border-border rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
                />
              </div>
            </div>

            {/* Service checkboxes */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Servicii Disponibile</p>

              {/* Development */}
              <p className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground/50 mt-3 mb-1">Development</p>
              {paidServices.filter(s => s.category === 'development').map(svc => (
                <ServiceCheckbox key={svc.id} svc={svc} selected={selectedServiceIds.has(svc.id)}
                  onToggle={() => toggleService(svc)}
                  onSelect={() => { toggleService(svc); setActiveModuleIdx(modules.findIndex(m => m.serviceId === svc.id) !== -1 ? modules.findIndex(m => m.serviceId === svc.id) : modules.length) }}
                  isActive={activeModule?.serviceId === svc.id} />
              ))}

              {/* Marketing */}
              <p className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground/50 mt-3 mb-1">Marketing</p>
              {paidServices.filter(s => s.category === 'marketing').map(svc => (
                <ServiceCheckbox key={svc.id} svc={svc} selected={selectedServiceIds.has(svc.id)}
                  onToggle={() => toggleService(svc)}
                  onSelect={() => { if (!selectedServiceIds.has(svc.id)) toggleService(svc); setActiveModuleIdx(modules.findIndex(m => m.serviceId === svc.id)) }}
                  isActive={activeModule?.serviceId === svc.id} />
              ))}

              {/* Consultanță */}
              <p className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground/50 mt-3 mb-1">Consultanță</p>
              {paidServices.filter(s => s.category === 'consultancy').map(svc => (
                <ServiceCheckbox key={svc.id} svc={svc} selected={selectedServiceIds.has(svc.id)}
                  onToggle={() => toggleService(svc)}
                  onSelect={() => { if (!selectedServiceIds.has(svc.id)) toggleService(svc); setActiveModuleIdx(modules.findIndex(m => m.serviceId === svc.id)) }}
                  isActive={activeModule?.serviceId === svc.id} />
              ))}

              {/* Auto-included */}
              {autoIncludedIds.size > 0 && (
                <>
                  <div className="flex items-center gap-2 mt-4 mb-2">
                    <Gift size={10} className="text-success" />
                    <p className="text-[8px] font-bold uppercase tracking-wider text-success">Incluse Gratuit</p>
                  </div>
                  {Array.from(autoIncludedIds).map(svcId => {
                    const svc = serviceCatalog.find(s => s.id === svcId)!
                    const alreadyAdded = selectedServiceIds.has(svcId)
                    return (
                      <button key={svcId} onClick={() => !alreadyAdded && addAutoIncluded(svcId)}
                        className={cn("w-full flex items-center gap-2 p-2 rounded-lg text-left transition-all text-[11px]",
                          alreadyAdded ? "bg-success/10 border border-success/20 text-success" : "bg-muted/50 border border-border hover:border-success/30")}>
                        <CheckCircle2 size={12} className={alreadyAdded ? "text-success" : "text-muted-foreground/30"} />
                        <span className={alreadyAdded ? "font-semibold" : "text-muted-foreground"}>{svc.shortName}</span>
                        <span className="ml-auto text-[9px] text-success font-bold">GRATIS</span>
                      </button>
                    )
                  })}
                </>
              )}

              {/* Custom service */}
              <div className="mt-4 pt-3 border-t border-border">
                {showCustomForm ? (
                  <div className="space-y-2 p-2 bg-surface border border-border rounded-lg">
                    <input value={customDraft.name} onChange={e => setCustomDraft(d => ({ ...d, name: e.target.value }))}
                      placeholder="Nume serviciu..." className="w-full px-2 py-1.5 text-xs bg-muted/30 border border-border rounded text-foreground placeholder:text-muted-foreground/50 focus:outline-none" />
                    <textarea value={customDraft.description} onChange={e => setCustomDraft(d => ({ ...d, description: e.target.value }))}
                      placeholder="Descriere (opțional)..." rows={2} className="w-full px-2 py-1.5 text-xs bg-muted/30 border border-border rounded text-foreground placeholder:text-muted-foreground/50 focus:outline-none resize-none" />
                    <div className="flex gap-2">
                      <input type="number" value={customDraft.price} onChange={e => setCustomDraft(d => ({ ...d, price: +e.target.value }))}
                        placeholder="Preț" className="flex-1 px-2 py-1.5 text-xs bg-muted/30 border border-border rounded text-foreground focus:outline-none" />
                      <select value={customDraft.pricingUnit} onChange={e => setCustomDraft(d => ({ ...d, pricingUnit: e.target.value as PricingUnit }))}
                        className="px-2 py-1.5 text-xs bg-muted/30 border border-border rounded text-foreground">
                        <option value="fix">Fix</option>
                        <option value="lunar">Lunar</option>
                        <option value="per_hour">Per oră</option>
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setShowCustomForm(false)} className="flex-1 px-2 py-1.5 text-[10px] text-muted-foreground hover:text-foreground rounded bg-muted transition-colors">Anulează</button>
                      <button onClick={addCustomService} className="flex-1 px-2 py-1.5 text-[10px] font-semibold text-primary-foreground bg-primary rounded hover:bg-primary-hover transition-colors">Adaugă</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setShowCustomForm(true)}
                    className="w-full flex items-center justify-center gap-1.5 p-2 rounded-lg border border-dashed border-border hover:border-primary/30 text-[11px] text-muted-foreground hover:text-primary transition-all">
                    <Plus size={12} /> Serviciu Custom
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ═══ RIGHT PANEL — Module Config + Summary ═══ */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Module Config Area */}
            <div className="flex-1 overflow-y-auto p-5">
              {activeModule ? (
                <ModuleEditor
                  module={activeModule}
                  index={activeModuleIdx!}
                  onUpdate={updateModule}
                  onRemove={() => {
                    setModules(prev => prev.filter((_, i) => i !== activeModuleIdx))
                    setActiveModuleIdx(null)
                  }}
                />
              ) : modules.length > 0 ? (
                <div className="space-y-4">
                  <p className="text-sm font-semibold text-foreground">Module Selectate ({modules.length})</p>
                  <p className="text-[11px] text-muted-foreground">Selectează un modul din stânga pentru a-l configura, sau revizuiește sumar:</p>
                  <div className="grid gap-3">
                    {modules.map((m, idx) => (
                      <button key={m.serviceId} onClick={() => setActiveModuleIdx(idx)}
                        className="flex items-center gap-3 p-3 rounded-xl border border-border bg-surface hover:border-primary/30 text-left transition-all">
                        <ServiceIcon icon={m.service.icon} className="text-primary" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">{m.service.name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {m.status === 'included_free' ? 'GRATIS' : `${formatCurrency(m.price)} EUR${unitLabel(m.pricingUnit)}`}
                            {m.setupFee > 0 && ` + ${formatCurrency(m.setupFee)} setup`}
                          </p>
                        </div>
                        <ChevronRight size={14} className="text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                    <Package size={24} className="text-muted-foreground" />
                  </div>
                  <p className="text-sm font-semibold text-foreground mb-1">Selectează servicii</p>
                  <p className="text-[11px] text-muted-foreground max-w-xs">
                    Bifează serviciile din panoul din stânga pentru a construi oferta compusă.
                  </p>
                </div>
              )}
            </div>

            {/* ═══ BOTTOM — Summary Bar ═══ */}
            {modules.length > 0 && (
              <div className="border-t border-border bg-muted/20 p-4">
                {/* Bundle discount */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Bundle Discount:</span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setBundleDiscount(bundleDiscount ? null : { type: 'percent', value: 10, reason: 'Pachet combinat' })}
                        className={cn("px-2 py-1 text-[10px] rounded-lg border transition-all",
                          bundleDiscount ? "border-success/30 bg-success/5 text-success font-semibold" : "border-border text-muted-foreground hover:border-primary/30")}>
                        {bundleDiscount ? `−${bundleDiscount.value}%` : 'Adaugă'}
                      </button>
                      {bundleDiscount && (
                        <div className="flex items-center gap-0.5 ml-1">
                          <button onClick={() => setBundleDiscount(d => d ? { ...d, value: Math.max(1, d.value - 5) } : null)} className="w-5 h-5 rounded flex items-center justify-center bg-muted text-muted-foreground hover:text-foreground"><Minus size={10} /></button>
                          <span className="text-[10px] font-mono text-foreground w-6 text-center">{bundleDiscount.value}%</span>
                          <button onClick={() => setBundleDiscount(d => d ? { ...d, value: Math.min(50, d.value + 5) } : null)} className="w-5 h-5 rounded flex items-center justify-center bg-muted text-muted-foreground hover:text-foreground"><Plus size={10} /></button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Totals */}
                <div className="flex items-end justify-between">
                  <div className="space-y-0.5">
                    <p className="text-[10px] text-muted-foreground">
                      {modules.filter(m => m.status === 'priced').length} module • {modules.filter(m => m.status === 'included_free').length} incluse gratis
                    </p>
                    <div className="flex items-baseline gap-3">
                      {totals.monthly > 0 && (
                        <p className="text-lg font-bold text-foreground font-mono">{formatCurrency(totals.monthly)} <span className="text-xs text-muted-foreground font-normal">EUR/lună</span></p>
                      )}
                      {totals.fixed > 0 && (
                        <p className="text-lg font-bold text-foreground font-mono">{formatCurrency(totals.fixed)} <span className="text-xs text-muted-foreground font-normal">EUR fix</span></p>
                      )}
                      {totals.setup > 0 && (
                        <p className="text-xs text-muted-foreground">+ {formatCurrency(totals.setup)} EUR setup</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button onClick={onClose} className="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground rounded-lg bg-muted transition-colors">
                      Anulează
                    </button>
                    <button className="px-4 py-2 text-xs font-medium bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors flex items-center gap-1.5">
                      <Eye size={12} /> Preview
                    </button>
                    <button onClick={onClose} className="px-4 py-2 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary-hover transition-colors flex items-center gap-1.5">
                      <Send size={12} /> Salvează Draft
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════
   SUB-COMPONENTS
   ══════════════════════════════════════════════════════════ */

function ServiceIcon({ icon, className }: { icon: string; className?: string }) {
  const Icon = iconMap[icon] || Package
  return <Icon size={16} className={className} />
}

function ServiceCheckbox({ svc, selected, onToggle, onSelect, isActive }: {
  svc: ServiceCatalogItem; selected: boolean; onToggle: () => void; onSelect: () => void; isActive: boolean;
}) {
  return (
    <div className={cn(
      "flex items-center gap-2 p-2 rounded-lg transition-all cursor-pointer group",
      isActive ? "bg-primary/10 border border-primary/30" :
      selected ? "bg-surface border border-border" :
      "hover:bg-muted/50 border border-transparent"
    )}>
      <button onClick={onToggle} className={cn(
        "w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all",
        selected ? "bg-primary border-primary" : "border-muted-foreground/30 group-hover:border-primary/50"
      )}>
        {selected && <CheckCircle2 size={10} className="text-primary-foreground" />}
      </button>
      <button onClick={onSelect} className="flex items-center gap-2 flex-1 min-w-0 text-left">
        <ServiceIcon icon={svc.icon} className={selected ? "text-primary" : "text-muted-foreground"} />
        <div className="min-w-0">
          <p className={cn("text-[11px] font-semibold truncate", selected ? "text-foreground" : "text-muted-foreground")}>{svc.shortName}</p>
          <p className="text-[9px] text-muted-foreground">
            {formatCurrency(svc.defaultPrice)} EUR{unitLabel(svc.pricingUnit)}
          </p>
        </div>
      </button>
    </div>
  )
}

/* ── Module Editor ── */

function ModuleEditor({ module: m, index, onUpdate, onRemove }: {
  module: ModuleDraft; index: number; onUpdate: (idx: number, updates: Partial<ModuleDraft>) => void; onRemove: () => void;
}) {
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center",
            m.status === 'included_free' ? "bg-success/10" : "bg-primary/10")}>
            <ServiceIcon icon={m.service.icon} className={m.status === 'included_free' ? "text-success" : "text-primary"} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">{m.service.name}</h3>
            <p className="text-[11px] text-muted-foreground">{m.service.description}</p>
          </div>
        </div>
        <button onClick={onRemove} className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors" title="Elimina modul">
          <Trash2 size={14} />
        </button>
      </div>

      {/* Status badge */}
      {m.status === 'included_free' && (
        <div className="flex items-center gap-2 p-3 bg-success/5 border border-success/20 rounded-xl">
          <Gift size={14} className="text-success" />
          <div>
            <p className="text-[11px] font-semibold text-success">Inclus gratuit</p>
            <p className="text-[10px] text-muted-foreground">
              Acest serviciu este inclus fără cost adițional cu{' '}
              {m.service.includedWith?.map(id => serviceCatalog.find(s => s.id === id)?.shortName).filter(Boolean).join(', ')}.
            </p>
          </div>
        </div>
      )}

      {/* Pricing — only for priced modules */}
      {m.status !== 'included_free' && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Preț ({unitLabel(m.pricingUnit) || 'fix'})</label>
            <div className="flex items-center gap-1">
              <input type="number" value={m.price} onChange={e => onUpdate(index, { price: +e.target.value })}
                className="flex-1 px-3 py-2 text-sm font-mono bg-muted/30 border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30" />
              <span className="text-xs text-muted-foreground">EUR</span>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Setup Fee</label>
            <div className="flex items-center gap-1">
              <input type="number" value={m.setupFee} onChange={e => onUpdate(index, { setupFee: +e.target.value })}
                className="flex-1 px-3 py-2 text-sm font-mono bg-muted/30 border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30" />
              <span className="text-xs text-muted-foreground">EUR</span>
            </div>
          </div>
        </div>
      )}

      {/* Discount per module */}
      {m.status !== 'included_free' && (
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Discount Modul</label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onUpdate(index, { discount: m.discount ? undefined : { type: 'percent', value: 10, reason: 'Promoție' } })}
              className={cn("px-3 py-1.5 text-[10px] rounded-lg border transition-all",
                m.discount ? "border-success/30 bg-success/5 text-success" : "border-border text-muted-foreground hover:border-primary/30")}>
              {m.discount ? `−${m.discount.value}${m.discount.type === 'percent' ? '%' : ' EUR'}` : '+ Adaugă discount'}
            </button>
            {m.discount && (
              <>
                <div className="flex items-center gap-0.5">
                  <button onClick={() => onUpdate(index, { discount: { ...m.discount!, value: Math.max(1, m.discount!.value - 5) } })}
                    className="w-5 h-5 rounded flex items-center justify-center bg-muted text-muted-foreground hover:text-foreground"><Minus size={10} /></button>
                  <span className="text-[10px] font-mono text-foreground w-8 text-center">{m.discount.value}%</span>
                  <button onClick={() => onUpdate(index, { discount: { ...m.discount!, value: Math.min(50, m.discount!.value + 5) } })}
                    className="w-5 h-5 rounded flex items-center justify-center bg-muted text-muted-foreground hover:text-foreground"><Plus size={10} /></button>
                </div>
                <button onClick={() => onUpdate(index, { discount: undefined })}
                  className="text-[9px] text-destructive hover:underline">Șterge</button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Blocks toggle */}
      <div className="space-y-2">
        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Blocuri conținut</label>
        <div className="space-y-1.5">
          {m.service.defaultBlocks.map(block => {
            const enabled = m.enabledBlocks.has(block.id)
            return (
              <button key={block.id} onClick={() => {
                const next = new Set(m.enabledBlocks)
                enabled ? next.delete(block.id) : next.add(block.id)
                onUpdate(index, { enabledBlocks: next })
              }}
                className={cn("w-full flex items-center gap-3 p-2.5 rounded-lg border text-left transition-all",
                  enabled ? "border-primary/20 bg-primary/5" : "border-border/50 bg-muted/10 opacity-50")}>
                <div className={cn("w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0",
                  enabled ? "bg-primary border-primary" : "border-muted-foreground/30")}>
                  {enabled && <CheckCircle2 size={8} className="text-primary-foreground" />}
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-foreground truncate">{block.title}</p>
                  <p className="text-[9px] text-muted-foreground uppercase">{block.type}</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

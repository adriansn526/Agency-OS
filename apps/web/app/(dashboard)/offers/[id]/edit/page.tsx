"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { serviceCatalog } from "@repo/mock-data"
import type { ServiceCatalogItem, OfferBlock, OfferBlockData, TextBlockData, FeaturesBlockData, StatsBlockData, ServicesBlockData, FAQBlockData, TimelineBlockData, PricingUnit } from "@repo/mock-data"
import { BlockRenderer } from "@/components/block-renderer"
import { ClientAutocomplete, type ClientOption } from "@/components/client-autocomplete"
import { cn, formatCurrency } from "@/lib/utils"
import {
  ArrowLeft, Save, Send, Eye, Plus, Minus, Trash2, ChevronDown, ChevronRight, Pencil,
  CheckCircle2, GripVertical, Settings, Package, Gift, X, Loader2,
  Globe, TrendingUp, Target, FileText, Search, Shield, Calendar, DollarSign,
  Palette, MessageSquare, BarChart3, Sparkles,
} from "lucide-react"

/* ── Icon Map ── */
const iconMap: Record<string, React.ElementType> = {
  Globe, TrendingUp, Target, Settings, FileText, Search, Shield,
  Palette, MessageSquare, BarChart3, Package, Sparkles,
}

function ServiceIcon({ icon, className }: { icon: string; className?: string }) {
  const Icon = iconMap[icon] || Package
  return <Icon size={16} className={className} />
}

/* ── Types ── */
interface ModuleDraft {
  serviceId: string
  service: ServiceCatalogItem
  price: number
  pricingUnit: PricingUnit
  setupFee: number
  status: 'priced' | 'included_free'
  discount?: { type: 'percent' | 'fixed'; value: number; reason?: string }
  enabledBlocks: Set<string>
  collapsed: boolean
  blocks: OfferBlock[]  // MUTABLE copies of blocks
}

function unitLabel(unit: PricingUnit): string {
  return unit === 'lunar' ? '/lună' : unit === 'per_hour' ? '/oră' : ''
}

/* ═══════════════════════════════════════════════════════
   OFFER EDITOR PAGE — Full-page split-view editor
   ═══════════════════════════════════════════════════════ */

export default function OfferEditorPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  // ─── API Data State ──────────────────────────
  const [offer, setOffer] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle')

  // ─── Meta Fields State ──────────────────────────
  const [entityName, setEntityName] = useState("")
  const [projectName, setProjectName] = useState("")
  const [selectedClient, setSelectedClient] = useState<ClientOption | null>(null)
  const [validUntil, setValidUntil] = useState("")
  const [offerValue, setOfferValue] = useState(0)
  const [currency, setCurrency] = useState("EUR")
  const [showMetaPanel, setShowMetaPanel] = useState(false)

  // ─── Modules State ──────────────────────────
  const [modules, setModules] = useState<ModuleDraft[]>([])
  const [activeModuleIdx, setActiveModuleIdx] = useState<number | null>(null)
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null)
  const [showCatalog, setShowCatalog] = useState(false)
  const [bundleDiscount, setBundleDiscount] = useState<{ type: 'percent' | 'fixed'; value: number } | null>(null)

  // Custom service form
  const [showCustomForm, setShowCustomForm] = useState(false)
  const [customName, setCustomName] = useState("")
  const [customDesc, setCustomDesc] = useState("")
  const [customPrice, setCustomPrice] = useState(0)
  const [customUnit, setCustomUnit] = useState<PricingUnit>("fix")

  // ─── Load offer from API ──────────────────────────
  useEffect(() => {
    async function loadOffer() {
      try {
        const res = await fetch(`/api/offers/${id}`)
        if (!res.ok) throw new Error('Not found')
        const json = await res.json()
        const data = json.data || json
        setOffer(data)
        setEntityName(data.entityName || '')
        setProjectName(data.templateName || '')
        setOfferValue(data.value || 0)
        setCurrency(data.currency || 'EUR')
        setValidUntil(data.validUntil ? data.validUntil.split('T')[0] : '')
        if (data.client) {
          setSelectedClient({
            id: data.client.id,
            companyName: data.client.companyName,
            contactPerson: data.client.contactPerson,
            email: data.client.email,
            status: 'activ',
          })
        }
        // Initialize modules from API data
        initModulesFromOffer(data)
      } catch {
        setOffer(null)
      } finally {
        setLoading(false)
      }
    }
    loadOffer()
  }, [id])

  function initModulesFromOffer(data: any) {
    if (data.modules && Array.isArray(data.modules) && data.modules.length > 0) {
      setModules(data.modules.map((m: any) => {
        const svc = serviceCatalog.find(s => s.id === m.serviceId)
        return {
          serviceId: m.serviceId,
          service: svc || { id: m.serviceId, name: m.serviceName, shortName: m.serviceName, icon: m.icon, description: '', category: 'marketing' as const, defaultPrice: m.price, pricingUnit: m.pricingUnit, defaultBlocks: m.blocks },
          price: m.price,
          pricingUnit: m.pricingUnit,
          setupFee: m.setupFee || 0,
          status: m.status === 'included_free' ? 'included_free' as const : 'priced' as const,
          discount: m.discount,
          enabledBlocks: new Set((m.blocks || []).map((b: any) => b.id)),
          collapsed: false,
          blocks: JSON.parse(JSON.stringify(m.blocks || [])),
        }
      }))
    } else if (data.blocks && Array.isArray(data.blocks) && data.blocks.length > 0) {
      const legacySvc: ServiceCatalogItem = {
        id: `legacy-${data.id}`,
        name: data.templateName || 'Ofertă',
        shortName: (data.templateName || 'Ofertă').slice(0, 20),
        icon: 'FileText',
        description: '',
        category: 'marketing',
        defaultPrice: data.value,
        pricingUnit: 'lunar',
        defaultBlocks: data.blocks,
      }
      setModules([{
        serviceId: legacySvc.id,
        service: legacySvc,
        price: data.value,
        pricingUnit: 'lunar' as PricingUnit,
        setupFee: 0,
        status: 'priced' as const,
        enabledBlocks: new Set(data.blocks.map((b: any) => b.id)),
        collapsed: false,
        blocks: JSON.parse(JSON.stringify(data.blocks)),
      }])
    }
  }

  // ─── Save to API ──────────────────────────
  const handleSave = useCallback(async () => {
    if (!offer) return
    setSaving(true)
    setSaveStatus('idle')
    try {
      // Compute total value from modules
      let totalValue = offerValue
      if (modules.length > 0) {
        totalValue = modules.reduce((sum, m) => {
          if (m.status === 'included_free') return sum
          let price = m.price
          if (m.discount) {
            price = m.discount.type === 'percent' ? price * (1 - m.discount.value / 100) : price - m.discount.value
          }
          return sum + price
        }, 0)
      }

      // Build blocks from all enabled module blocks
      const allBlocks = modules.flatMap(m =>
        m.blocks.filter(b => m.enabledBlocks.has(b.id))
      )

      // Build modules data for API
      const modulesData = modules.map(m => ({
        serviceId: m.serviceId,
        serviceName: m.service.name,
        icon: m.service.icon,
        price: m.price,
        pricingUnit: m.pricingUnit,
        setupFee: m.setupFee,
        status: m.status,
        discount: m.discount || null,
        blocks: m.blocks.filter(b => m.enabledBlocks.has(b.id)),
      }))

      const res = await fetch(`/api/offers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityName,
          templateName: projectName,
          clientId: selectedClient?.id || null,
          value: totalValue,
          currency,
          validUntil: validUntil || null,
          blocks: allBlocks,
          modules: modulesData,
        }),
      })

      if (!res.ok) throw new Error('Save failed')
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2500)
    } catch {
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } finally {
      setSaving(false)
    }
  }, [offer, id, entityName, projectName, selectedClient, offerValue, currency, validUntil, modules])

  // ─── Derived ────────────────────────
  const selectedServiceIds = useMemo(() => new Set(modules.map(m => m.serviceId)), [modules])

  const autoIncludedIds = useMemo(() => {
    const ids = new Set<string>()
    serviceCatalog.forEach(svc => {
      if (svc.includedWith && !selectedServiceIds.has(svc.id)) {
        if (svc.includedWith.some(pid => selectedServiceIds.has(pid))) ids.add(svc.id)
      }
    })
    return ids
  }, [selectedServiceIds])

  // All blocks for preview (from all active modules)
  const previewBlocks = useMemo(() => {
    const blocks: { moduleIdx: number; moduleName: string; moduleIcon: string; block: OfferBlock; status: string }[] = []
    modules.forEach((m, idx) => {
      m.service.defaultBlocks.forEach(block => {
        if (m.enabledBlocks.has(block.id)) {
          blocks.push({ moduleIdx: idx, moduleName: m.service.name, moduleIcon: m.service.icon, block, status: m.status })
        }
      })
    })
    return blocks
  }, [modules])

  // Also include legacy blocks from the offer
  const legacyBlocks: OfferBlock[] = useMemo(() => {
    if (modules.length > 0) return []
    return (offer?.blocks as OfferBlock[]) || []
  }, [modules, offer])

  // Totals
  const totals = useMemo(() => {
    let monthly = 0, fixed = 0, setup = 0
    modules.forEach(m => {
      if (m.status === 'included_free') return
      let price = m.price
      if (m.discount) {
        price = m.discount.type === 'percent' ? price * (1 - m.discount.value / 100) : price - m.discount.value
      }
      if (m.pricingUnit === 'lunar') monthly += price
      else fixed += price
      setup += m.setupFee
    })
    if (bundleDiscount) {
      if (bundleDiscount.type === 'percent') { monthly *= (1 - bundleDiscount.value / 100); fixed *= (1 - bundleDiscount.value / 100) }
      else monthly -= bundleDiscount.value
    }
    return { monthly: Math.max(0, monthly), fixed: Math.max(0, fixed), setup }
  }, [modules, bundleDiscount])

  // ─── Actions ────────────────────────
  const addService = useCallback((svc: ServiceCatalogItem, isFree = false) => {
    if (selectedServiceIds.has(svc.id)) return
    const newModule: ModuleDraft = {
      serviceId: svc.id, service: svc, price: isFree ? 0 : svc.defaultPrice, pricingUnit: svc.pricingUnit,
      setupFee: isFree ? 0 : (svc.setupFee || 0), status: isFree ? 'included_free' : 'priced',
      enabledBlocks: new Set(svc.defaultBlocks.map(b => b.id)), collapsed: false,
      blocks: JSON.parse(JSON.stringify(svc.defaultBlocks)),  // deep copy for editing
    }
    setModules(prev => [...prev, newModule])
    setActiveModuleIdx(modules.length)
    setShowCatalog(false)
  }, [selectedServiceIds, modules.length])

  const removeModule = useCallback((idx: number) => {
    setModules(prev => prev.filter((_, i) => i !== idx))
    if (activeModuleIdx === idx) setActiveModuleIdx(null)
    else if (activeModuleIdx !== null && activeModuleIdx > idx) setActiveModuleIdx(activeModuleIdx - 1)
  }, [activeModuleIdx])

  const updateModule = useCallback((idx: number, updates: Partial<ModuleDraft>) => {
    setModules(prev => prev.map((m, i) => i === idx ? { ...m, ...updates } : m))
  }, [])

  const addCustomService = useCallback(() => {
    if (!customName) return
    const svc: ServiceCatalogItem = {
      id: `custom-${Date.now()}`, name: customName, shortName: customName.slice(0, 15), icon: 'Package',
      description: customDesc, category: 'consultancy', defaultPrice: customPrice, pricingUnit: customUnit,
      defaultBlocks: customDesc ? [{ id: `ct-${Date.now()}`, type: 'text' as const, title: customName, data: { content: customDesc } }] : [],
    }
    addService(svc)
    setCustomName(""); setCustomDesc(""); setCustomPrice(0); setShowCustomForm(false)
  }, [customName, customDesc, customPrice, customUnit, addService])

  // Update a block's data within a module
  const updateBlockData = useCallback((moduleIdx: number, blockId: string, newData: OfferBlockData) => {
    setModules(prev => prev.map((m, i) => {
      if (i !== moduleIdx) return m
      return { ...m, blocks: m.blocks.map(b => b.id === blockId ? { ...b, data: newData } : b) }
    }))
  }, [])

  const updateBlockTitle = useCallback((moduleIdx: number, blockId: string, newTitle: string) => {
    setModules(prev => prev.map((m, i) => {
      if (i !== moduleIdx) return m
      return { ...m, blocks: m.blocks.map(b => b.id === blockId ? { ...b, title: newTitle } : b) }
    }))
  }, [])

  // ─── Loading / 404 ────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 size={28} className="text-primary animate-spin" />
        <span className="ml-3 text-sm text-muted-foreground">Se încarcă editorul...</span>
      </div>
    )
  }

  if (!offer) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <p className="text-lg font-semibold text-foreground mb-2">Ofertă negăsită</p>
          <Link href="/offers" className="text-primary text-sm hover:underline">← Înapoi la Oferte</Link>
        </div>
      </div>
    )
  }

  const paidCatalog = serviceCatalog.filter(s => !s.includedWith)
  const includableCatalog = serviceCatalog.filter(s => s.includedWith)

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] animate-fade-in">
      {/* ═══ TOP BAR ═══ */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-surface/80 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={14} /> Înapoi
          </button>
          <div className="w-px h-5 bg-border" />
          <div>
            <div className="flex items-center gap-2">
              <input value={entityName} onChange={e => setEntityName(e.target.value)} placeholder="Numele firmei..."
                className="text-sm font-bold text-foreground bg-transparent border-none outline-none placeholder:text-muted-foreground/50 w-48" />
              <span className="text-muted-foreground/30">•</span>
              <input value={projectName} onChange={e => setProjectName(e.target.value)} placeholder="Numele proiectului..."
                className="text-sm text-muted-foreground bg-transparent border-none outline-none placeholder:text-muted-foreground/50 w-48" />
            </div>
            <p className="text-[10px] text-muted-foreground">{offer.number} • {offer.status === 'draft' ? 'Draft' : offer.status}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Totals inline */}
          {modules.length > 0 && (
            <div className="flex items-baseline gap-2 mr-3 pr-3 border-r border-border">
              {totals.monthly > 0 && <span className="text-sm font-bold font-mono text-foreground">{formatCurrency(totals.monthly)} <span className="text-[10px] font-normal text-muted-foreground">EUR/lună</span></span>}
              {totals.fixed > 0 && <span className="text-sm font-bold font-mono text-foreground">{formatCurrency(totals.fixed)} <span className="text-[10px] font-normal text-muted-foreground">EUR</span></span>}
              {totals.setup > 0 && <span className="text-[10px] text-muted-foreground">+ {formatCurrency(totals.setup)} setup</span>}
            </div>
          )}
          <button onClick={() => setShowMetaPanel(!showMetaPanel)}
            className={cn("flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors", showMetaPanel ? "bg-primary/10 text-primary" : "bg-muted text-foreground hover:bg-muted/80")}>
            <Settings size={12} /> Meta
          </button>
          <Link href={`/offer/view/${offer.deliveries?.[0]?.token || offer.id}`} target="_blank" className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors">
            <Eye size={12} /> Preview
          </Link>
          <button onClick={handleSave} disabled={saving}
            className={cn("flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all", saveStatus === 'saved' ? "bg-emerald-600 text-white" : saveStatus === 'error' ? "bg-destructive text-white" : "bg-primary text-primary-foreground hover:bg-primary/90")}>
            {saving ? <Loader2 size={12} className="animate-spin" /> : saveStatus === 'saved' ? <CheckCircle2 size={12} /> : <Save size={12} />}
            {saving ? 'Salvez...' : saveStatus === 'saved' ? 'Salvat!' : saveStatus === 'error' ? 'Eroare!' : 'Salvează'}
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors">
            <Send size={12} /> Trimite
          </button>
        </div>
      </div>

      {/* ═══ MAIN SPLIT ═══ */}
      <div className="flex flex-1 overflow-hidden">

        {/* ─── LEFT: Module List + Config ─── */}
        <div className="w-80 lg:w-96 border-r border-border bg-muted/20 flex flex-col overflow-hidden flex-shrink-0">
          {/* ── Meta Panel (toggled) ── */}
          {showMetaPanel && (
            <div className="p-3 border-b border-border bg-surface space-y-3 animate-fade-in">
              <p className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground">Detalii Ofertă</p>

              {/* Client */}
              <div>
                <label className="text-[9px] font-bold uppercase text-muted-foreground mb-1 block">Client / Firmă</label>
                <ClientAutocomplete value={selectedClient} onChange={setSelectedClient} />
              </div>

              {/* Value + Currency */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] font-bold uppercase text-muted-foreground mb-1 block">Valoare</label>
                  <div className="flex items-center gap-1">
                    <input type="number" value={offerValue} onChange={e => setOfferValue(+e.target.value)}
                      className="flex-1 px-2 py-1.5 text-xs font-mono bg-muted/30 border border-border rounded text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 w-full" />
                  </div>
                </div>
                <div>
                  <label className="text-[9px] font-bold uppercase text-muted-foreground mb-1 block">Monedă</label>
                  <select value={currency} onChange={e => setCurrency(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs bg-muted/30 border border-border rounded text-foreground focus:outline-none">
                    <option value="EUR">EUR</option>
                    <option value="RON">RON</option>
                    <option value="USD">USD</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>
              </div>

              {/* Valid Until */}
              <div>
                <label className="text-[9px] font-bold uppercase text-muted-foreground mb-1 block">Validă până la</label>
                <input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs bg-muted/30 border border-border rounded text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30" />
              </div>

              {/* Info row */}
              <div className="flex items-center gap-3 pt-1 text-[10px] text-muted-foreground">
                <span>Nr: <strong className="text-foreground">{offer.number}</strong></span>
                <span>Status: <strong className="text-foreground">{offer.status}</strong></span>
                <span>Creat: {new Date(offer.createdAt).toLocaleDateString('ro-RO')}</span>
              </div>
            </div>
          )}

          <div className="p-3 border-b border-border flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Module Ofertă ({modules.length})</p>
            <button onClick={() => setShowCatalog(!showCatalog)}
              className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors">
              <Plus size={11} /> Adaugă Serviciu
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* Catalog Dropdown */}
            {showCatalog && (
              <div className="border-b border-border bg-surface p-3 space-y-1 animate-fade-in">
                <p className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Selectează din catalog</p>

                {/* Grouped */}
                {(['development', 'marketing', 'consultancy'] as const).map(cat => {
                  const items = paidCatalog.filter(s => s.category === cat && !selectedServiceIds.has(s.id))
                  if (items.length === 0) return null
                  return (
                    <div key={cat}>
                      <p className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground/50 mt-2 mb-1">
                        {cat === 'development' ? 'Development' : cat === 'marketing' ? 'Marketing' : 'Consultanță'}
                      </p>
                      {items.map(svc => (
                        <button key={svc.id} onClick={() => addService(svc)}
                          className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 text-left transition-all">
                          <ServiceIcon icon={svc.icon} className="text-primary" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-semibold text-foreground truncate">{svc.shortName}</p>
                            <p className="text-[9px] text-muted-foreground">{formatCurrency(svc.defaultPrice)} EUR{unitLabel(svc.pricingUnit)}</p>
                          </div>
                          <Plus size={12} className="text-muted-foreground" />
                        </button>
                      ))}
                    </div>
                  )
                })}

                {/* Auto-included */}
                {autoIncludedIds.size > 0 && (
                  <>
                    <p className="text-[8px] font-bold uppercase tracking-wider text-success mt-3 mb-1 flex items-center gap-1"><Gift size={9} /> Incluse Gratuit</p>
                    {Array.from(autoIncludedIds).filter(id => !selectedServiceIds.has(id)).map(svcId => {
                      const svc = serviceCatalog.find(s => s.id === svcId)!
                      return (
                        <button key={svcId} onClick={() => addService(svc, true)}
                          className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-success/5 text-left transition-all">
                          <ServiceIcon icon={svc.icon} className="text-success" />
                          <span className="text-[11px] text-foreground flex-1">{svc.shortName}</span>
                          <span className="text-[9px] text-success font-bold">GRATIS</span>
                        </button>
                      )
                    })}
                  </>
                )}

                {/* Custom */}
                <div className="pt-2 mt-2 border-t border-border">
                  {showCustomForm ? (
                    <div className="space-y-2 p-2 bg-muted/30 rounded-lg">
                      <input value={customName} onChange={e => setCustomName(e.target.value)} placeholder="Nume serviciu..."
                        className="w-full px-2 py-1.5 text-xs bg-surface border border-border rounded text-foreground placeholder:text-muted-foreground/50 focus:outline-none" />
                      <textarea value={customDesc} onChange={e => setCustomDesc(e.target.value)} placeholder="Descriere..." rows={2}
                        className="w-full px-2 py-1.5 text-xs bg-surface border border-border rounded text-foreground placeholder:text-muted-foreground/50 focus:outline-none resize-none" />
                      <div className="flex gap-2">
                        <input type="number" value={customPrice} onChange={e => setCustomPrice(+e.target.value)} placeholder="Preț"
                          className="flex-1 px-2 py-1.5 text-xs bg-surface border border-border rounded text-foreground focus:outline-none" />
                        <select value={customUnit} onChange={e => setCustomUnit(e.target.value as PricingUnit)}
                          className="px-2 py-1.5 text-xs bg-surface border border-border rounded text-foreground">
                          <option value="fix">Fix</option><option value="lunar">Lunar</option><option value="per_hour">Per oră</option>
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setShowCustomForm(false)} className="flex-1 px-2 py-1.5 text-[10px] text-muted-foreground rounded bg-muted">Anulează</button>
                        <button onClick={addCustomService} className="flex-1 px-2 py-1.5 text-[10px] font-semibold text-primary-foreground bg-primary rounded">Adaugă</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setShowCustomForm(true)}
                      className="w-full flex items-center justify-center gap-1.5 p-2 rounded-lg border border-dashed border-border hover:border-primary/30 text-[11px] text-muted-foreground hover:text-primary transition-all">
                      <Plus size={12} /> Serviciu Custom
                    </button>
                  )}
                </div>

                <button onClick={() => setShowCatalog(false)} className="w-full text-center text-[10px] text-muted-foreground hover:text-foreground mt-2 py-1">
                  Închide catalogul
                </button>
              </div>
            )}

            {/* Module Cards */}
            <div className="p-2 space-y-1">
              {modules.map((m, idx) => (
                <div key={m.serviceId}
                  className={cn("rounded-xl border transition-all", activeModuleIdx === idx ? "border-primary/40 bg-primary/5" : "border-border bg-surface")}>
                  {/* Module header — always visible */}
                  <button onClick={() => setActiveModuleIdx(activeModuleIdx === idx ? null : idx)}
                    className="w-full flex items-center gap-2.5 p-3 text-left">
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                      m.status === 'included_free' ? "bg-success/10" : "bg-primary/10")}>
                      <ServiceIcon icon={m.service.icon} className={m.status === 'included_free' ? "text-success" : "text-primary"} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{m.service.shortName}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {m.status === 'included_free' ? 'GRATIS' : `${formatCurrency(m.price)} EUR${unitLabel(m.pricingUnit)}`}
                        {m.discount && <span className="text-success ml-1">−{m.discount.value}%</span>}
                      </p>
                    </div>
                    <ChevronDown size={14} className={cn("text-muted-foreground transition-transform", activeModuleIdx === idx && "rotate-180")} />
                  </button>

                  {/* Module config — expanded */}
                  {activeModuleIdx === idx && (
                    <div className="px-3 pb-3 space-y-3 border-t border-border/50 pt-3 animate-fade-in">
                      {/* Price controls */}
                      {m.status !== 'included_free' && (
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[9px] font-bold uppercase text-muted-foreground">Preț</label>
                            <div className="flex items-center gap-1 mt-0.5">
                              <input type="number" value={m.price} onChange={e => updateModule(idx, { price: +e.target.value })}
                                className="flex-1 px-2 py-1.5 text-xs font-mono bg-muted/30 border border-border rounded text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 w-full" />
                              <span className="text-[9px] text-muted-foreground">€</span>
                            </div>
                          </div>
                          <div>
                            <label className="text-[9px] font-bold uppercase text-muted-foreground">Setup</label>
                            <div className="flex items-center gap-1 mt-0.5">
                              <input type="number" value={m.setupFee} onChange={e => updateModule(idx, { setupFee: +e.target.value })}
                                className="flex-1 px-2 py-1.5 text-xs font-mono bg-muted/30 border border-border rounded text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 w-full" />
                              <span className="text-[9px] text-muted-foreground">€</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Discount */}
                      {m.status !== 'included_free' && (
                        <div className="flex items-center gap-2">
                          <button onClick={() => updateModule(idx, { discount: m.discount ? undefined : { type: 'percent', value: 10 } })}
                            className={cn("px-2 py-1 text-[9px] rounded border transition-all",
                              m.discount ? "border-success/30 bg-success/5 text-success" : "border-border text-muted-foreground hover:border-primary/30")}>
                            {m.discount ? `−${m.discount.value}%` : '+ Discount'}
                          </button>
                          {m.discount && (
                            <div className="flex items-center gap-0.5">
                              <button onClick={() => updateModule(idx, { discount: { ...m.discount!, value: Math.max(1, m.discount!.value - 5) } })}
                                className="w-5 h-5 rounded flex items-center justify-center bg-muted text-muted-foreground hover:text-foreground"><Minus size={9} /></button>
                              <span className="text-[9px] font-mono text-foreground w-6 text-center">{m.discount.value}%</span>
                              <button onClick={() => updateModule(idx, { discount: { ...m.discount!, value: Math.min(50, m.discount!.value + 5) } })}
                                className="w-5 h-5 rounded flex items-center justify-center bg-muted text-muted-foreground hover:text-foreground"><Plus size={9} /></button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Included badge */}
                      {m.status === 'included_free' && (
                        <div className="flex items-center gap-1.5 p-2 bg-success/5 border border-success/20 rounded-lg">
                          <Gift size={11} className="text-success" />
                          <span className="text-[10px] text-success font-medium">Inclus gratuit</span>
                        </div>
                      )}

                      {/* Block toggles */}
                      <div>
                        <label className="text-[9px] font-bold uppercase text-muted-foreground mb-1 block">Blocuri ({m.enabledBlocks.size}/{m.blocks.length})</label>
                        <div className="space-y-0.5">
                          {m.blocks.map(block => {
                            const enabled = m.enabledBlocks.has(block.id)
                            return (
                              <button key={block.id} onClick={() => {
                                const next = new Set(m.enabledBlocks)
                                enabled ? next.delete(block.id) : next.add(block.id)
                                updateModule(idx, { enabledBlocks: next })
                              }}
                                className={cn("w-full flex items-center gap-2 p-1.5 rounded text-left transition-all text-[10px]",
                                  enabled ? "text-foreground" : "text-muted-foreground/50")}>
                                <div className={cn("w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0",
                                  enabled ? "bg-primary border-primary" : "border-muted-foreground/30")}>
                                  {enabled && <CheckCircle2 size={8} className="text-primary-foreground" />}
                                </div>
                                <span className="truncate">{block.title}</span>
                                <span className="text-[8px] text-muted-foreground/50 uppercase ml-auto">{block.type}</span>
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {/* Remove */}
                      <button onClick={() => removeModule(idx)}
                        className="flex items-center gap-1.5 text-[10px] text-destructive hover:text-destructive/80 transition-colors">
                        <Trash2 size={10} /> Șterge modul
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {modules.length === 0 && !showCatalog && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center mb-3">
                    <Package size={20} className="text-muted-foreground" />
                  </div>
                  <p className="text-xs font-semibold text-foreground mb-1">Niciun modul adăugat</p>
                  <p className="text-[10px] text-muted-foreground mb-3 max-w-[200px]">Apasă &ldquo;Adaugă Serviciu&rdquo; pentru a construi oferta.</p>
                  <button onClick={() => setShowCatalog(true)}
                    className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors">
                    <Plus size={11} /> Adaugă Serviciu
                  </button>
                </div>
              )}
            </div>

            {/* Bundle discount */}
            {modules.length > 1 && (
              <div className="p-3 border-t border-border">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-bold uppercase text-muted-foreground">Bundle:</span>
                  <button onClick={() => setBundleDiscount(bundleDiscount ? null : { type: 'percent', value: 10 })}
                    className={cn("px-2 py-1 text-[9px] rounded border transition-all",
                      bundleDiscount ? "border-success/30 bg-success/5 text-success font-semibold" : "border-border text-muted-foreground hover:border-primary/30")}>
                    {bundleDiscount ? `−${bundleDiscount.value}%` : '+ Discount pachet'}
                  </button>
                  {bundleDiscount && (
                    <div className="flex items-center gap-0.5">
                      <button onClick={() => setBundleDiscount(d => d ? { ...d, value: Math.max(1, d.value - 5) } : null)}
                        className="w-5 h-5 rounded flex items-center justify-center bg-muted text-muted-foreground hover:text-foreground"><Minus size={9} /></button>
                      <span className="text-[9px] font-mono text-foreground w-6 text-center">{bundleDiscount.value}%</span>
                      <button onClick={() => setBundleDiscount(d => d ? { ...d, value: Math.min(50, d.value + 5) } : null)}
                        className="w-5 h-5 rounded flex items-center justify-center bg-muted text-muted-foreground hover:text-foreground"><Plus size={9} /></button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ─── RIGHT: Live Preview ─── */}
        <div className="flex-1 overflow-y-auto bg-gradient-to-br from-orange-50/40 to-amber-50/40 dark:from-orange-950/10 dark:to-amber-950/10">
          <div className="max-w-4xl mx-auto p-6 space-y-4">
            {/* Preview Header */}
            <div className="text-center py-8">
              <p className="text-[10px] font-bold uppercase tracking-widest text-orange-500/80 mb-2">OFERTĂ DE SERVICII</p>
              <h1 className="text-2xl font-bold text-foreground mb-1">{projectName || entityName || "Proiect Nou"}</h1>
              <p className="text-sm text-muted-foreground">{entityName || "Client"}</p>
              {modules.length > 0 && (
                <div className="flex items-center justify-center gap-2 mt-3">
                  {modules.map(m => (
                    <span key={m.serviceId} className={cn("px-2 py-0.5 text-[9px] font-bold uppercase rounded-full",
                      m.status === 'included_free' ? "bg-success/10 text-success" : "bg-primary/10 text-primary")}>
                      {m.service.shortName}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Module sections */}
            {modules.length > 0 ? (
              modules.map((m, mIdx) => {
                const enabledBlocks = m.blocks.filter(b => m.enabledBlocks.has(b.id))
                if (enabledBlocks.length === 0) return null
                return (
                  <div key={m.serviceId}
                    className={cn("rounded-2xl border-2 overflow-hidden transition-all",
                      activeModuleIdx === mIdx ? "border-primary/30 shadow-lg shadow-primary/5" : "border-border/50",
                      m.status === 'included_free' ? "bg-success/[0.02]" : "bg-surface/50")}
                    onClick={() => setActiveModuleIdx(mIdx)}>
                    {/* Module header in preview */}
                    <div className={cn("flex items-center gap-3 px-5 py-3 border-b",
                      m.status === 'included_free' ? "bg-success/5 border-success/20" : "bg-primary/5 border-primary/10")}>
                      <ServiceIcon icon={m.service.icon} className={m.status === 'included_free' ? "text-success" : "text-primary"} />
                      <div className="flex-1">
                        <p className="text-sm font-bold text-foreground">{m.service.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {m.status === 'included_free' ? '✨ Inclus gratuit' : `${formatCurrency(m.price)} EUR${unitLabel(m.pricingUnit)}`}
                          {m.discount && <span className="text-success ml-1">(−{m.discount.value}% discount)</span>}
                        </p>
                      </div>
                      {activeModuleIdx === mIdx && (
                        <span className="px-2 py-0.5 text-[8px] font-bold uppercase bg-primary/10 text-primary rounded-full">Editare activă</span>
                      )}
                    </div>

                    {/* Blocks — EDITABLE */}
                    <div className="p-4 space-y-4">
                      {enabledBlocks.map(block => (
                        <EditableBlock
                          key={block.id}
                          block={block}
                          isEditing={editingBlockId === block.id}
                          onStartEdit={() => setEditingBlockId(block.id)}
                          onStopEdit={() => setEditingBlockId(null)}
                          onUpdateData={(data: OfferBlockData) => updateBlockData(mIdx, block.id, data)}
                          onUpdateTitle={(title: string) => updateBlockTitle(mIdx, block.id, title)}
                        />
                      ))}
                    </div>
                  </div>
                )
              })
            ) : legacyBlocks.length > 0 ? (
              /* Legacy: render existing blocks */
              legacyBlocks.map(block => (
                <BlockRenderer key={block.id} block={block} variant="public" />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-20 h-20 rounded-2xl bg-muted/30 flex items-center justify-center mb-4">
                  <Eye size={28} className="text-muted-foreground/40" />
                </div>
                <p className="text-sm font-semibold text-foreground mb-1">Preview Ofertă</p>
                <p className="text-xs text-muted-foreground max-w-sm">
                  Adaugă module din panoul din stânga. Blocurile vor apărea aici în timp real, exact cum le va vedea clientul.
                </p>
              </div>
            )}

            {/* Pricing summary in preview */}
            {modules.length > 0 && (
              <div className="rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 p-6">
                <h3 className="text-sm font-bold text-foreground mb-4 text-center">Sumar Investiție</h3>
                <div className="space-y-2 mb-4">
                  {modules.filter(m => m.status === 'priced').map(m => {
                    let finalPrice = m.price
                    if (m.discount) finalPrice = m.discount.type === 'percent' ? finalPrice * (1 - m.discount.value / 100) : finalPrice - m.discount.value
                    return (
                      <div key={m.serviceId} className="flex items-center justify-between text-xs">
                        <span className="text-foreground">{m.service.name}</span>
                        <div className="flex items-center gap-2">
                          {m.discount && <span className="text-[10px] text-muted-foreground line-through">{formatCurrency(m.price)} €</span>}
                          <span className="font-semibold text-foreground">{formatCurrency(finalPrice)} EUR{unitLabel(m.pricingUnit)}</span>
                        </div>
                      </div>
                    )
                  })}
                  {modules.filter(m => m.status === 'included_free').map(m => (
                    <div key={m.serviceId} className="flex items-center justify-between text-xs">
                      <span className="text-foreground">{m.service.name}</span>
                      <span className="font-bold text-success">GRATIS</span>
                    </div>
                  ))}
                  {modules.some(m => m.setupFee > 0) && (
                    <div className="flex items-center justify-between text-xs pt-2 border-t border-border/50">
                      <span className="text-muted-foreground">Setup fees</span>
                      <span className="font-semibold text-foreground">{formatCurrency(totals.setup)} EUR (o singură dată)</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between pt-3 border-t-2 border-primary/20">
                  <span className="text-sm font-bold text-foreground">TOTAL</span>
                  <div className="text-right">
                    {totals.monthly > 0 && <p className="text-lg font-bold text-foreground font-mono">{formatCurrency(totals.monthly)} EUR<span className="text-xs font-normal">/lună</span></p>}
                    {totals.fixed > 0 && <p className="text-lg font-bold text-foreground font-mono">{formatCurrency(totals.fixed)} EUR</p>}
                    {bundleDiscount && <p className="text-[10px] text-success">Include −{bundleDiscount.value}% discount pachet</p>}
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

/* ════════════════════════════════════════════════════════════════════
   EDITABLE BLOCK — Inline editing in preview pane
   ════════════════════════════════════════════════════════════════════ */

interface EditableBlockProps {
  block: OfferBlock
  isEditing: boolean
  onStartEdit: () => void
  onStopEdit: () => void
  onUpdateData: (data: OfferBlockData) => void
  onUpdateTitle: (title: string) => void
}

function EditableBlock({ block, isEditing, onStartEdit, onStopEdit, onUpdateData, onUpdateTitle }: EditableBlockProps) {
  if (!isEditing) {
    // Read-only view with edit hover overlay
    return (
      <div className="group relative cursor-pointer" onClick={(e) => { e.stopPropagation(); onStartEdit() }}>
        <BlockRenderer block={block} variant="public" />
        {/* Edit overlay on hover */}
        <div className="absolute inset-0 bg-primary/5 border-2 border-primary/20 rounded-xl opacity-0 group-hover:opacity-100 transition-all pointer-events-none flex items-start justify-end p-2">
          <span className="flex items-center gap-1 px-2 py-1 text-[9px] font-bold uppercase bg-primary text-primary-foreground rounded-md shadow-sm pointer-events-auto">
            <Pencil size={9} /> Click to edit
          </span>
        </div>
      </div>
    )
  }

  // ── Editing mode: render inline editors per block type ──
  const d = block.data

  return (
    <div className="relative bg-primary/[0.03] border-2 border-primary/30 rounded-xl p-4 space-y-3 animate-fade-in" onClick={e => e.stopPropagation()}>
      {/* Edit header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Pencil size={12} className="text-primary" />
          <input value={block.title} onChange={e => onUpdateTitle(e.target.value)}
            className="text-sm font-bold text-foreground bg-transparent border-b border-primary/30 outline-none focus:border-primary pb-0.5" />
          <span className="text-[8px] uppercase text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{block.type}</span>
        </div>
        <button onClick={onStopEdit} className="flex items-center gap-1 px-2 py-1 text-[9px] font-medium bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors">
          <CheckCircle2 size={9} /> Done
        </button>
      </div>

      {/* Type-specific editors */}
      {block.type === 'text' && <TextEditor data={d as unknown as TextBlockData} onChange={onUpdateData} />}
      {block.type === 'features' && <FeaturesEditor data={d as unknown as FeaturesBlockData} onChange={onUpdateData} />}
      {block.type === 'stats' && <StatsEditor data={d as unknown as StatsBlockData} onChange={onUpdateData} />}
      {block.type === 'services' && <ServicesEditor data={d as unknown as ServicesBlockData} onChange={onUpdateData} />}
      {block.type === 'timeline' && <TimelineEditor data={d as unknown as TimelineBlockData} onChange={onUpdateData} />}
      {block.type === 'faq' && <FAQEditor data={d as unknown as FAQBlockData} onChange={onUpdateData} />}

      {/* Fallback for unsupported types */}
      {!['text', 'features', 'stats', 'services', 'timeline', 'faq'].includes(block.type) && (
        <div className="p-3 bg-muted/30 rounded-lg text-xs text-muted-foreground text-center">
          Editare vizuală pentru tipul &ldquo;{block.type}&rdquo; va fi disponibilă curând. Folosește panoul din stânga pentru a configura acest bloc.
        </div>
      )}
    </div>
  )
}

/* ── TEXT EDITOR ── */
function TextEditor({ data, onChange }: { data: TextBlockData; onChange: (d: OfferBlockData) => void }) {
  return (
    <textarea
      value={data.content}
      onChange={e => onChange({ content: e.target.value })}
      rows={Math.max(3, data.content.split('\n').length + 1)}
      className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y font-serif leading-relaxed"
      placeholder="Scrie conținutul blocului..."
    />
  )
}

/* ── FEATURES EDITOR ── */
function FeaturesEditor({ data, onChange }: { data: FeaturesBlockData; onChange: (d: OfferBlockData) => void }) {
  const updateCategory = (catIdx: number, field: 'name', value: string) => {
    const cats = [...data.categories]
    cats[catIdx] = { ...cats[catIdx]!, [field]: value }
    onChange({ categories: cats })
  }
  const updateItem = (catIdx: number, itemIdx: number, value: string) => {
    const cats = [...data.categories]
    const items = [...cats[catIdx]!.items]
    items[itemIdx] = value
    cats[catIdx] = { ...cats[catIdx]!, items }
    onChange({ categories: cats })
  }
  const addItem = (catIdx: number) => {
    const cats = [...data.categories]
    cats[catIdx] = { ...cats[catIdx]!, items: [...cats[catIdx]!.items, ''] }
    onChange({ categories: cats })
  }
  const removeItem = (catIdx: number, itemIdx: number) => {
    const cats = [...data.categories]
    cats[catIdx] = { ...cats[catIdx]!, items: cats[catIdx]!.items.filter((_: string, i: number) => i !== itemIdx) }
    onChange({ categories: cats })
  }
  const addCategory = () => {
    onChange({ categories: [...data.categories, { name: 'Categorie Nouă', items: [''] }] })
  }
  const removeCategory = (catIdx: number) => {
    onChange({ categories: data.categories.filter((_, i) => i !== catIdx) })
  }

  return (
    <div className="space-y-3">
      {data.categories.map((cat, catIdx) => (
        <div key={catIdx} className="bg-surface rounded-lg border border-border p-3 space-y-2">
          <div className="flex items-center gap-2">
            <input value={cat.name} onChange={e => updateCategory(catIdx, 'name', e.target.value)}
              className="flex-1 text-xs font-bold text-foreground bg-transparent border-b border-border outline-none focus:border-primary pb-0.5" />
            <button onClick={() => removeCategory(catIdx)} className="text-destructive hover:text-destructive/80"><Trash2 size={11} /></button>
          </div>
          {cat.items.map((item: string, itemIdx: number) => (
            <div key={itemIdx} className="flex items-center gap-1.5 pl-2">
              <CheckCircle2 size={10} className="text-primary flex-shrink-0" />
              <input value={item} onChange={e => updateItem(catIdx, itemIdx, e.target.value)}
                className="flex-1 text-xs text-foreground bg-transparent border-b border-border/50 outline-none focus:border-primary pb-0.5" placeholder="Feature item..." />
              <button onClick={() => removeItem(catIdx, itemIdx)} className="text-muted-foreground hover:text-destructive"><X size={10} /></button>
            </div>
          ))}
          <button onClick={() => addItem(catIdx)}
            className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 pl-2"><Plus size={10} /> Add item</button>
        </div>
      ))}
      <button onClick={addCategory}
        className="w-full flex items-center justify-center gap-1 py-2 text-[10px] font-medium text-primary bg-primary/5 border border-dashed border-primary/30 rounded-lg hover:bg-primary/10 transition-colors">
        <Plus size={10} /> Adaugă categorie
      </button>
    </div>
  )
}

/* ── STATS EDITOR ── */
function StatsEditor({ data, onChange }: { data: StatsBlockData; onChange: (d: OfferBlockData) => void }) {
  const updateStat = (idx: number, field: 'value' | 'label' | 'sublabel', value: string) => {
    const items = [...data.items]
    items[idx] = { ...items[idx]!, [field]: value }
    onChange({ items })
  }
  const addStat = () => {
    onChange({ items: [...data.items, { value: '0', label: 'Label', sublabel: '', color: 'orange' as const }] })
  }
  const removeStat = (idx: number) => {
    onChange({ items: data.items.filter((_, i) => i !== idx) })
  }

  return (
    <div className="space-y-2">
      {data.items.map((stat, idx) => (
        <div key={idx} className="flex items-center gap-2 bg-surface rounded-lg border border-border p-2">
          <input value={stat.value} onChange={e => updateStat(idx, 'value', e.target.value)}
            className="w-16 text-sm font-bold font-mono text-foreground bg-transparent border-b border-border text-center outline-none focus:border-primary" />
          <div className="flex-1">
            <input value={stat.label} onChange={e => updateStat(idx, 'label', e.target.value)}
              className="w-full text-xs font-semibold text-foreground bg-transparent border-b border-border/50 outline-none focus:border-primary pb-0.5" />
            <input value={stat.sublabel || ''} onChange={e => updateStat(idx, 'sublabel', e.target.value)}
              placeholder="sublabel..." className="w-full text-[10px] text-muted-foreground bg-transparent outline-none mt-0.5" />
          </div>
          <button onClick={() => removeStat(idx)} className="text-muted-foreground hover:text-destructive"><Trash2 size={11} /></button>
        </div>
      ))}
      <button onClick={addStat}
        className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/80"><Plus size={10} /> Add stat</button>
    </div>
  )
}

/* ── SERVICES EDITOR ── */
function ServicesEditor({ data, onChange }: { data: ServicesBlockData; onChange: (d: OfferBlockData) => void }) {
  const updateService = (idx: number, field: string, value: unknown) => {
    const services = [...data.services]
    services[idx] = { ...services[idx]!, [field]: value }
    onChange({ services })
  }
  const updateFeature = (svcIdx: number, featIdx: number, value: string) => {
    const services = [...data.services]
    const features = [...services[svcIdx]!.features]
    features[featIdx] = value
    services[svcIdx] = { ...services[svcIdx]!, features }
    onChange({ services })
  }
  const addFeature = (svcIdx: number) => {
    const services = [...data.services]
    services[svcIdx] = { ...services[svcIdx]!, features: [...services[svcIdx]!.features, ''] }
    onChange({ services })
  }
  const removeFeature = (svcIdx: number, featIdx: number) => {
    const services = [...data.services]
    services[svcIdx] = { ...services[svcIdx]!, features: services[svcIdx]!.features.filter((_: string, i: number) => i !== featIdx) }
    onChange({ services })
  }
  const addService = () => {
    onChange({ services: [...data.services, { title: '', description: '', features: [''], icon: '' }] })
  }
  const removeService = (idx: number) => {
    onChange({ services: data.services.filter((_, i) => i !== idx) })
  }

  return (
    <div className="space-y-3">
      {data.services.map((svc, idx) => (
        <div key={idx} className="bg-surface rounded-lg border border-border p-3 space-y-2">
          <div className="flex items-center gap-2">
            <input value={svc.title} onChange={e => updateService(idx, 'title', e.target.value)}
              className="flex-1 text-xs font-bold text-foreground bg-transparent border-b border-border outline-none focus:border-primary pb-0.5" />
            <button onClick={() => removeService(idx)} className="text-muted-foreground hover:text-destructive transition-colors"><Trash2 size={11} /></button>
          </div>
          <textarea value={svc.description} onChange={e => updateService(idx, 'description', e.target.value)} rows={2}
            className="w-full text-[11px] text-muted-foreground bg-transparent border border-border/50 rounded p-1.5 outline-none focus:border-primary resize-none" />
          {svc.features.map((f: string, fIdx: number) => (
            <div key={fIdx} className="flex items-center gap-1.5 pl-2">
              <CheckCircle2 size={10} className="text-primary flex-shrink-0" />
              <input value={f} onChange={e => updateFeature(idx, fIdx, e.target.value)}
                className="flex-1 text-xs text-foreground bg-transparent border-b border-border/50 outline-none focus:border-primary pb-0.5" />
              <button onClick={() => removeFeature(idx, fIdx)} className="text-muted-foreground hover:text-destructive"><X size={10} /></button>
            </div>
          ))}
          <button onClick={() => addFeature(idx)} className="flex items-center gap-1 text-[10px] text-primary pl-2"><Plus size={10} /> Add feature</button>
        </div>
      ))}
      <button onClick={addService}
        className="w-full flex items-center justify-center gap-1 py-2 text-[10px] font-medium text-primary bg-primary/5 border border-dashed border-primary/30 rounded-lg hover:bg-primary/10 transition-colors">
        <Plus size={10} /> Adaugă serviciu
      </button>
    </div>
  )
}

/* ── TIMELINE EDITOR ── */

function TimelineEditor({ data, onChange }: { data: TimelineBlockData; onChange: (d: OfferBlockData) => void }) {
  const updateStep = (idx: number, field: string, value: unknown) => {
    const steps = [...data.steps]
    steps[idx] = { ...steps[idx]!, [field]: value }
    onChange({ steps })
  }
  const addStep = () => {
    const nextNum = data.steps.length + 1
    onChange({ steps: [...data.steps, { step: nextNum, title: '', description: '', duration: '' }] })
  }
  const removeStep = (idx: number) => {
    // Re-number remaining steps
    const steps = data.steps.filter((_, i) => i !== idx).map((s, i) => ({ ...s, step: i + 1 }))
    onChange({ steps })
  }

  return (
    <div className="space-y-2">
      {data.steps.map((step, idx) => (
        <div key={idx} className="bg-surface rounded-lg border border-border p-3 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center flex-shrink-0">{step.step}</span>
            <input value={step.title} onChange={e => updateStep(idx, 'title', e.target.value)}
              className="flex-1 text-xs font-bold text-foreground bg-transparent border-b border-border outline-none focus:border-primary pb-0.5" />
            <input value={step.duration || ''} onChange={e => updateStep(idx, 'duration', e.target.value)} placeholder="durată..."
              className="w-24 text-[10px] text-muted-foreground bg-transparent border-b border-border/50 outline-none focus:border-primary text-right" />
            <button onClick={() => removeStep(idx)} className="text-muted-foreground hover:text-destructive transition-colors"><Trash2 size={11} /></button>
          </div>
          <textarea value={step.description} onChange={e => updateStep(idx, 'description', e.target.value)} rows={2}
            className="w-full text-[11px] text-foreground bg-transparent border border-border/50 rounded p-1.5 outline-none focus:border-primary resize-none" />
        </div>
      ))}
      <button onClick={addStep}
        className="w-full flex items-center justify-center gap-1 py-2 text-[10px] font-medium text-primary bg-primary/5 border border-dashed border-primary/30 rounded-lg hover:bg-primary/10 transition-colors">
        <Plus size={10} /> Adaugă etapă
      </button>
    </div>
  )
}

/* ── FAQ EDITOR ── */
function FAQEditor({ data, onChange }: { data: FAQBlockData; onChange: (d: OfferBlockData) => void }) {
  const updateItem = (idx: number, field: 'question' | 'answer', value: string) => {
    const items = [...data.items]
    items[idx] = { ...items[idx]!, [field]: value }
    onChange({ items })
  }
  const addItem = () => {
    onChange({ items: [...data.items, { question: '', answer: '' }] })
  }
  const removeItem = (idx: number) => {
    onChange({ items: data.items.filter((_, i) => i !== idx) })
  }

  return (
    <div className="space-y-2">
      {data.items.map((item, idx) => (
        <div key={idx} className="bg-surface rounded-lg border border-border p-3 space-y-1.5">
          <div className="flex items-center gap-2">
            <input value={item.question} onChange={e => updateItem(idx, 'question', e.target.value)}
              className="flex-1 text-xs font-bold text-foreground bg-transparent border-b border-border outline-none focus:border-primary pb-0.5" placeholder="Întrebare..." />
            <button onClick={() => removeItem(idx)} className="text-muted-foreground hover:text-destructive"><Trash2 size={11} /></button>
          </div>
          <textarea value={item.answer} onChange={e => updateItem(idx, 'answer', e.target.value)} rows={2}
            className="w-full text-[11px] text-foreground bg-transparent border border-border/50 rounded p-1.5 outline-none focus:border-primary resize-none" placeholder="Răspuns..." />
        </div>
      ))}
      <button onClick={addItem}
        className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/80"><Plus size={10} /> Add Q&A</button>
    </div>
  )
}

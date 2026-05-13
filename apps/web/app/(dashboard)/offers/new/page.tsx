"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useBusinessLine } from "@/components/business-line-context"
import { ClientAutocomplete, type ClientOption } from "@/components/client-autocomplete"
import { cn, formatCurrency } from "@/lib/utils"
import {
  ArrowLeft, Plus, FileText, Package, Loader2, Calendar, DollarSign, Check,
  Globe, TrendingUp, Target, Settings, Search, Shield, Zap, Crown, Infinity,
  Palette, MessageSquare, BarChart3, Sparkles, Image, Monitor, Rocket,
  LayoutTemplate,
} from "lucide-react"

/* ── icon map ── */
const iconMap: Record<string, React.ElementType> = {
  Globe, TrendingUp, Target, Settings, FileText, Search, Shield,
  Palette, MessageSquare, BarChart3, Package, Sparkles, Zap, Crown,
  Infinity, Image, Monitor, Rocket, LayoutTemplate,
}
function ServiceIcon({ icon, className }: { icon?: string | null; className?: string }) {
  const Icon = (icon && iconMap[icon]) || Package
  return <Icon size={16} className={className} />
}

function unitLabel(unit: string): string {
  if (unit === 'lunar') return '/lună'
  if (unit === 'per_hour') return '/oră'
  if (unit === 'one_time') return ' (unic)'
  return ''
}

const categoryLabels: Record<string, string> = {
  development: '🔧 Development',
  marketing: '📈 Marketing',
  consultancy: '🔍 Consultanță',
  saas: '🚀 SaaS Platform',
}

/* ── types ── */
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
  includedWith: string[]
  defaultBlocks: any[]
  isActive: boolean
  sortOrder: number
}

interface OfferTpl {
  id: string
  businessLineId: string
  name: string
  description: string | null
  serviceIds: string[]
  isActive: boolean
  sortOrder: number
}

/* ═══════════════════════════════════════════════════════
   NEW OFFER PAGE — Services from API, per Business Line
   ═══════════════════════════════════════════════════════ */

export default function NewOfferPage() {
  const router = useRouter()
  const { activeLine, activeLineId } = useBusinessLine()
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState("")

  // Form state
  const [selectedClient, setSelectedClient] = useState<ClientOption | null>(null)
  const [entityName, setEntityName] = useState("")
  const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set())
  const [currency, setCurrency] = useState("EUR")
  const [validDays, setValidDays] = useState(30)
  const [businessLines, setBusinessLines] = useState<{ id: string; name: string; slug: string }[]>([])
  const [selectedBL, setSelectedBL] = useState("")

  // API data
  const [services, setServices] = useState<ServiceTemplate[]>([])
  const [offerTemplates, setOfferTemplates] = useState<OfferTpl[]>([])
  const [loadingServices, setLoadingServices] = useState(false)

  // ─── Load business lines ───
  useEffect(() => {
    fetch('/api/settings/business-lines')
      .then(r => r.json())
      .then(data => {
        const lines = data.data || data || []
        setBusinessLines(lines)
        // Use active line if available, otherwise first
        const defaultBL = activeLineId && lines.find((l: any) => l.id === activeLineId)
          ? activeLineId
          : lines[0]?.id || ''
        setSelectedBL(defaultBL)
      })
      .catch(() => {
        setBusinessLines([
          { id: 'agency', name: 'Agenție', slug: 'agency' },
          { id: 'fudly', name: 'Fudly', slug: 'fudly' },
        ])
      })
  }, [activeLineId])

  // ─── Fetch services when BL changes ───
  useEffect(() => {
    if (!selectedBL) return
    setLoadingServices(true)
    setSelectedServices(new Set()) // reset selection on BL change

    Promise.all([
      fetch(`/api/services?businessLineId=${selectedBL}`).then(r => r.json()),
      fetch(`/api/offer-templates?businessLineId=${selectedBL}`).then(r => r.json()),
    ])
      .then(([svcRes, tplRes]) => {
        setServices(svcRes.data || [])
        setOfferTemplates(tplRes.data || [])
      })
      .catch(() => {
        setServices([])
        setOfferTemplates([])
      })
      .finally(() => setLoadingServices(false))
  }, [selectedBL])

  // Update entityName when client selected
  useEffect(() => {
    if (selectedClient) setEntityName(selectedClient.companyName)
  }, [selectedClient])

  // ─── Derived ───
  const selectedSvcs = useMemo(
    () => services.filter(s => selectedServices.has(s.id)),
    [services, selectedServices]
  )

  // Only show "main" services (not included/bundled ones)
  const mainServices = useMemo(
    () => services.filter(s => s.includedWith.length === 0),
    [services]
  )

  // Group by category
  const categories = useMemo(() => {
    const cats = new Map<string, ServiceTemplate[]>()
    mainServices.forEach(s => {
      if (!cats.has(s.category)) cats.set(s.category, [])
      cats.get(s.category)!.push(s)
    })
    return Array.from(cats.entries())
  }, [mainServices])

  const toggleService = (svcId: string) => {
    setSelectedServices(prev => {
      const next = new Set(prev)
      next.has(svcId) ? next.delete(svcId) : next.add(svcId)
      return next
    })
  }

  const applyTemplate = (tpl: OfferTpl) => {
    setSelectedServices(new Set(tpl.serviceIds))
  }

  const totalValue = selectedSvcs.reduce((sum, s) => sum + s.defaultPrice, 0)
  const totalSetup = selectedSvcs.reduce((sum, s) => sum + (s.setupFee || 0), 0)

  // ─── Create Offer ───
  const handleCreate = async () => {
    if (!entityName.trim()) { setError("Numele firmei este obligatoriu"); return }
    if (selectedSvcs.length === 0) { setError("Selectează cel puțin un serviciu"); return }
    if (!selectedBL) { setError("Selectează linia de business"); return }

    setCreating(true)
    setError("")

    try {
      const validUntil = new Date()
      validUntil.setDate(validUntil.getDate() + validDays)

      const res = await fetch('/api/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessLineId: selectedBL,
          entityType: 'client',
          clientId: selectedClient?.id || null,
          entityName: entityName.trim(),
          templateId: selectedSvcs[0]!.id,
          templateName: selectedSvcs.map(s => s.shortName).join(' + '),
          value: totalValue,
          currency,
          validUntil: validUntil.toISOString(),
          blocks: selectedSvcs.flatMap(s => s.defaultBlocks || []),
          modules: selectedSvcs.map(svc => ({
            serviceId: svc.id,
            serviceName: svc.name,
            icon: svc.icon,
            price: svc.defaultPrice,
            pricingUnit: svc.pricingUnit,
            setupFee: svc.setupFee || 0,
            status: 'priced',
            discount: null,
            blocks: svc.defaultBlocks || [],
          })),
          createdBy: 'usr-001',
        }),
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Failed to create')
      }

      const newOffer = await res.json()
      router.push(`/offers/${newOffer.id}/edit`)
    } catch (err: any) {
      setError(err.message || 'Eroare la creare ofertă')
    } finally {
      setCreating(false)
    }
  }

  const selectedBLName = businessLines.find(b => b.id === selectedBL)?.name || ''

  return (
    <div className="p-4 md:p-6 animate-fade-in max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={15} /> Înapoi
          </button>
          <div className="w-px h-5 bg-border" />
          <div>
            <h1 className="text-lg font-bold text-foreground">Ofertă Nouă</h1>
            <p className="text-xs text-muted-foreground">Completează detaliile și selectează serviciile</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="space-y-5">
        {/* Client / Entity */}
        <div className="bg-surface rounded-2xl border border-border p-5 space-y-4">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Package size={14} className="text-primary" /> Detalii Client
          </h2>

          <div>
            <label className="text-[10px] font-bold uppercase text-muted-foreground mb-1.5 block">Client din CRM</label>
            <ClientAutocomplete value={selectedClient} onChange={setSelectedClient} />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-muted-foreground mb-1.5 block">Numele Firmei / Entității *</label>
            <input
              value={entityName}
              onChange={e => setEntityName(e.target.value)}
              placeholder="Ex: MARYSTELV S.R.L."
              className="w-full px-3 py-2.5 text-sm bg-muted/30 border border-border rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold uppercase text-muted-foreground mb-1.5 block">Linie de Business *</label>
              <select
                value={selectedBL}
                onChange={e => setSelectedBL(e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-muted/30 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {businessLines.map(bl => (
                  <option key={bl.id} value={bl.id}>{bl.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold uppercase text-muted-foreground mb-1.5 block">Monedă</label>
                <select
                  value={currency}
                  onChange={e => setCurrency(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm bg-muted/30 border border-border rounded-lg text-foreground focus:outline-none"
                >
                  <option value="EUR">EUR</option>
                  <option value="RON">RON</option>
                  <option value="USD">USD</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-muted-foreground mb-1.5 block">Valid (zile)</label>
                <input
                  type="number"
                  value={validDays}
                  onChange={e => setValidDays(+e.target.value)}
                  min={1} max={365}
                  className="w-full px-3 py-2.5 text-sm bg-muted/30 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Templates */}
        {offerTemplates.length > 0 && (
          <div className="bg-surface rounded-2xl border border-border p-5 space-y-3">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <LayoutTemplate size={14} className="text-accent" /> Șabloane Rapide — {selectedBLName}
            </h2>
            <p className="text-[10px] text-muted-foreground">Selectează un șablon pentru a pre-popula serviciile, sau alege manual mai jos.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {offerTemplates.map(tpl => {
                const isActive = tpl.serviceIds.length > 0 && tpl.serviceIds.every(id => selectedServices.has(id)) && selectedServices.size === tpl.serviceIds.length
                return (
                  <button
                    key={tpl.id}
                    onClick={() => applyTemplate(tpl)}
                    className={cn(
                      "flex flex-col p-3 rounded-xl border-2 text-left transition-all",
                      isActive
                        ? "border-accent bg-accent/5 shadow-sm"
                        : "border-border hover:border-accent/30 hover:bg-muted/20"
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles size={12} className={isActive ? "text-accent" : "text-muted-foreground"} />
                      <span className="text-xs font-semibold text-foreground">{tpl.name}</span>
                    </div>
                    {tpl.description && (
                      <p className="text-[10px] text-muted-foreground leading-relaxed">{tpl.description}</p>
                    )}
                    {isActive && (
                      <span className="mt-1.5 text-[9px] font-bold text-accent uppercase">✓ Activ</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Service Selection */}
        <div className="bg-surface rounded-2xl border border-border p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <FileText size={14} className="text-primary" /> Selectează Serviciile * — {selectedBLName}
            </h2>
            {selectedSvcs.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">{selectedSvcs.length} selectate</span>
                <span className="text-xs font-bold font-mono text-primary">{formatCurrency(totalValue)}</span>
                {totalSetup > 0 && (
                  <span className="text-[10px] text-muted-foreground">+ {formatCurrency(totalSetup)} setup</span>
                )}
              </div>
            )}
          </div>

          {loadingServices ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={18} className="animate-spin text-primary" />
              <span className="ml-2 text-xs text-muted-foreground">Se încarcă serviciile...</span>
            </div>
          ) : mainServices.length === 0 ? (
            <div className="text-center py-8">
              <Package size={24} className="text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">Nu există servicii configurate pentru {selectedBLName}</p>
              <Link href="/settings/services" className="text-[10px] text-primary hover:underline mt-1 inline-block">
                Configurează catalogul →
              </Link>
            </div>
          ) : (
            categories.map(([cat, items]) => (
              <div key={cat}>
                <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-2">
                  {categoryLabels[cat] || cat}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {items.map(svc => (
                    <button
                      key={svc.id}
                      onClick={() => toggleService(svc.id)}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all",
                        selectedServices.has(svc.id)
                          ? "border-primary bg-primary/5 shadow-sm shadow-primary/10"
                          : "border-border hover:border-primary/30 hover:bg-muted/30"
                      )}
                    >
                      <div className={cn(
                        "w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all",
                        selectedServices.has(svc.id)
                          ? "bg-primary border-primary" : "border-muted-foreground/30"
                      )}>
                        {selectedServices.has(svc.id) && <Check size={11} className="text-primary-foreground" />}
                      </div>
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                        selectedServices.has(svc.id) ? "bg-primary/10" : "bg-muted"
                      )}>
                        <ServiceIcon icon={svc.icon} className={selectedServices.has(svc.id) ? "text-primary" : "text-muted-foreground"} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground">{svc.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{(svc.description || '').slice(0, 60)}...</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-mono font-bold text-primary">
                            {formatCurrency(svc.defaultPrice)}{unitLabel(svc.pricingUnit)}
                          </span>
                          {svc.setupFee && svc.setupFee > 0 && (
                            <span className="text-[9px] text-muted-foreground">
                              + {formatCurrency(svc.setupFee)} setup
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Error + Submit */}
        {error && (
          <div className="px-4 py-3 bg-destructive/10 border border-destructive/20 rounded-lg text-xs text-destructive font-medium">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          <Link href="/offers" className="px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            Anulează
          </Link>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all disabled:opacity-50"
          >
            {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            {creating ? 'Se creează...' : 'Creează Ofertă & Editează'}
          </button>
        </div>
      </div>
    </div>
  )
}

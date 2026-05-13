"use client"

import { useState, useEffect, useMemo, useCallback, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import {
  companySettings, contractSettings, contractTemplates, sowTemplates,
} from "@repo/mock-data"
import type {
  CompanySettings, ContractSettings, ContractSection, ContractTemplate, SoWTemplate,
} from "@repo/mock-data"
import { cn } from "@/lib/utils"
import {
  ArrowLeft, Save, Send, FileText, Pencil, CheckCircle2,
  ChevronDown, ChevronRight, Settings, Building2, User,
  Calendar, DollarSign, Eye, EyeOff, Download, Printer,
  Plus, Trash2,
} from "lucide-react"
import type { SoWPhase } from "@repo/mock-data"

// ─── Variable resolver ───
function resolveVariables(content: string, vars: Record<string, string>): string {
  let result = content
  // Replace simple {{variables}}
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || `[${key}]`)
  }
  return result
}

function resolveConditionals(content: string, services: string[], pricing?: { monthly: number; fixed: number; setup: number; discount: string }): string {
  let result = content
  const hasSeo = services.includes('seo')
  const hasAds = services.includes('ads')

  // Handle {{#if_seo}}...{{/if_seo}}
  result = result.replace(/\{\{#if_seo\}\}([\s\S]*?)\{\{\/if_seo\}\}/g, hasSeo ? '$1' : '')
  // Handle {{#if_ads}}...{{/if_ads}}
  result = result.replace(/\{\{#if_ads\}\}([\s\S]*?)\{\{\/if_ads\}\}/g, hasAds ? '$1' : '')
  // Handle {{#if_monthly}}...{{/if_monthly}} — show if monthly > 0
  const hasMonthly = !pricing || pricing.monthly > 0
  result = result.replace(/\{\{#if_monthly\}\}([\s\S]*?)\{\{\/if_monthly\}\}/g, hasMonthly ? '$1' : '')
  // Handle {{#if_fixed}}...{{/if_fixed}} — show only if fixed > 0
  const hasFixed = pricing && pricing.fixed > 0
  result = result.replace(/\{\{#if_fixed\}\}([\s\S]*?)\{\{\/if_fixed\}\}/g, hasFixed ? '$1' : '')
  // Handle {{#if_setup}}...{{/if_setup}} — show only if setup > 0
  const hasSetup = pricing && pricing.setup > 0
  result = result.replace(/\{\{#if_setup\}\}([\s\S]*?)\{\{\/if_setup\}\}/g, hasSetup ? '$1' : '')
  // Handle {{#if_discount}}...{{/if_discount}} — show only if discount is not 0
  const hasDiscount = pricing && pricing.discount !== '0%' && pricing.discount !== '0'
  result = result.replace(/\{\{#if_discount\}\}([\s\S]*?)\{\{\/if_discount\}\}/g, hasDiscount ? '$1' : '')

  // Replace {{ads_label}} — A) if only ads, B) if seo+ads
  result = result.replace(/\{\{ads_label\}\}/g, hasSeo ? 'B' : 'A')

  // Clean up multiple empty lines left after removing conditional blocks
  result = result.replace(/\n{3,}/g, '\n\n')

  return result
}

function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr)
  d.setMonth(d.getMonth() + months)
  return d.toISOString().split('T')[0]!
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('ro-RO', { year: 'numeric', month: 'long', day: 'numeric' })
}

export default function ContractGeneratorWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-pulse text-muted-foreground">Se încarcă...</div></div>}>
      <ContractGeneratorPage />
    </Suspense>
  )
}

function ContractGeneratorPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const offerId = searchParams.get('offerId') || ''
  const template = contractTemplates[0]! // use the main SEO/Ads template

  // ─── FETCH OFFER FROM API ───
  const [offer, setOffer] = useState<any>(null)
  const [offerLoading, setOfferLoading] = useState(true)

  // Fetch offer from real API
  useEffect(() => {
    if (!offerId) { setOfferLoading(false); return }
    fetch(`/api/offers/${offerId}`)
      .then(r => r.json())
      .then(data => {
        if (data.id) setOffer(data)
        setOfferLoading(false)
      })
      .catch(() => setOfferLoading(false))
  }, [offerId])

  // ─── FORM STATE ───
  // Company (prestator) — from API settings, editable
  const [company, setCompany] = useState<CompanySettings>({ ...companySettings })
  const [settings, setSettings] = useState<ContractSettings>({ ...contractSettings })

  // Load company settings from API
  useEffect(() => {
    fetch('/api/settings/company')
      .then(r => r.json())
      .then(resp => {
        const data = resp?.data || resp
        if (data?.legalName) {
          setCompany(prev => ({
            ...prev,
            legalName: data.legalName || prev.legalName,
            cif: data.cif || data.cui || prev.cif,
            regCom: data.regCom || prev.regCom,
            address: data.address || prev.address,
            iban: data.iban || prev.iban,
            bank: data.bank || prev.bank,
            representative: data.representative || prev.representative,
            representativeRole: data.representativeRole || prev.representativeRole,
            email: data.email || prev.email,
          }))
        }
      })
      .catch(console.error)
  }, [])

  // Client comes from the offer itself (API includes client data)
  const crmClient = useMemo(() => {
    if (!offer?.client) return null
    return offer.client
  }, [offer])

  // Client (beneficiar) data — starts empty, populated via useEffect when offer loads
  const [client, setClient] = useState({
    legalName: '',
    cif: '',
    regCom: '',
    address: '',
    representative: '',
    representativePrefix: 'dl.',
    representativeRole: 'Administrator',
  })

  // Contract specifics
  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    return d.toISOString().split('T')[0]!
  })
  const [duration, setDuration] = useState(settings.defaultDuration)
  const [services, setServices] = useState<string[]>(['seo', 'ads'])

  // ─── Populate client + services when offer arrives from API ───
  useEffect(() => {
    if (!offer) return
    const c = offer.client
    if (c) {
      setClient({
        legalName: c.companyName || offer.entityName || '',
        cif: c.cui || '',
        regCom: c.regCom || '',
        address: c.address || '',
        representative: c.contactPerson || '',
        representativePrefix: 'dna.',
        representativeRole: 'Administrator',
      })
    } else if (offer.entityName) {
      setClient(prev => ({ ...prev, legalName: offer.entityName }))
    }
    if (offer.modules && Array.isArray(offer.modules)) {
      const svcs: string[] = []
      for (const m of offer.modules as any[]) {
        const name = (m.serviceName || '').toLowerCase()
        if (name.includes('seo')) svcs.push('seo')
        if (name.includes('ads') || name.includes('google')) svcs.push('ads')
      }
      if (svcs.length > 0) setServices(svcs)
    }
  }, [offer])

  // Section editing state
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null)
  const [sectionOverrides, setSectionOverrides] = useState<Record<string, string>>({})
  const [showPreview, setShowPreview] = useState(true)
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())
  const [clientPreview, setClientPreview] = useState(false)
  const [includeAnexa2, setIncludeAnexa2] = useState(true)
  const sowTemplate = sowTemplates[0]!

  // ── Anexa 2 — Editable phases state ──
  const [editablePhases, setEditablePhases] = useState<SoWPhase[]>(() => 
    JSON.parse(JSON.stringify(sowTemplate.defaultPhases))
  )
  const [editingPhaseId, setEditingPhaseId] = useState<string | null>(null)

  const updatePhase = useCallback((phaseId: string, updates: Partial<SoWPhase>) => {
    setEditablePhases(prev => prev.map(p => p.id === phaseId ? { ...p, ...updates } : p))
  }, [])

  const addTaskToPhase = useCallback((phaseId: string) => {
    setEditablePhases(prev => prev.map(p => 
      p.id === phaseId ? { ...p, tasks: [...p.tasks, 'Nouă activitate — click pentru a edita'] } : p
    ))
  }, [])

  const removeTaskFromPhase = useCallback((phaseId: string, taskIndex: number) => {
    setEditablePhases(prev => prev.map(p => 
      p.id === phaseId ? { ...p, tasks: p.tasks.filter((_, i) => i !== taskIndex) } : p
    ))
  }, [])

  const updateTask = useCallback((phaseId: string, taskIndex: number, value: string) => {
    setEditablePhases(prev => prev.map(p => 
      p.id === phaseId ? { ...p, tasks: p.tasks.map((t, i) => i === taskIndex ? value : t) } : p
    ))
  }, [])

  // ─── CONTRACT NUMBER ───
  const businessLine = offer?.businessLine || 'agency'
  const numberingConfig = settings.numbering?.[businessLine] || { prefix: 'ASNS', nextNumber: 1, year: 2026 }
  const [contractNumber, setContractNumber] = useState(
    `${numberingConfig.prefix}-${numberingConfig.year}-${String(numberingConfig.nextNumber).padStart(3, '0')}`
  )

  // ─── COMPUTED ───
  const endDate = useMemo(() => addMonths(startDate, duration), [startDate, duration])
  const contractDate = useMemo(() => formatDate(startDate), [startDate])

  const variables = useMemo<Record<string, string>>(() => ({
    // Company
    company_legal_name: company.legalName,
    company_address: company.address,
    company_reg_com: company.regCom,
    company_cif: company.cif,
    company_iban: company.iban,
    company_bank: company.bank,
    company_representative: company.representative,
    company_representative_role: company.representativeRole,
    // Client
    client_legal_name: client.legalName,
    client_address: client.address,
    client_reg_com: client.regCom,
    client_cif: client.cif,
    client_representative: client.representative,
    client_representative_prefix: client.representativePrefix,
    client_representative_role: client.representativeRole,
    // Contract
    duration: String(duration),
    start_date: formatDate(startDate),
    end_date: formatDate(endDate),
    contract_date: contractDate,
    notice_period: String(settings.noticePeriod),
    penalty_rate: String(settings.penaltyRate),
    payment_term: String(settings.paymentTermDays),
    // Offer
    offer_number: offer?.number || 'N/A',
    offer_date: offer ? formatDate(offer.createdAt) : 'N/A',
    // Pricing
    monthly_price: offer ? String(offer.value) : '0',
    fixed_price: '0',
    setup_fee: '0',
    discount_value: offer?.bundleDiscount ? `${offer.bundleDiscount.value}%` : '0%',
    currency: offer?.currency || 'EUR',
  }), [company, client, duration, startDate, endDate, contractDate, settings, offer])

  const pricing = useMemo(() => ({
    monthly: offer ? offer.value : 0,
    fixed: 0,
    setup: 0,
    discount: offer?.bundleDiscount ? `${offer.bundleDiscount.value}%` : '0%',
  }), [offer])

  const resolvedSections = useMemo(() => {
    return template.sections.map(section => {
      const content = sectionOverrides[section.id] || section.content
      const withConditionals = resolveConditionals(content, services, pricing)
      const resolved = resolveVariables(withConditionals, variables)
      return { ...section, content: resolved, rawContent: sectionOverrides[section.id] || section.content }
    })
  }, [template.sections, sectionOverrides, services, variables, pricing])

  const updateSection = useCallback((sectionId: string, newContent: string) => {
    setSectionOverrides(prev => ({ ...prev, [sectionId]: newContent }))
  }, [])

  const toggleSection = useCallback((sectionId: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev)
      if (next.has(sectionId)) next.delete(sectionId)
      else next.add(sectionId)
      return next
    })
  }, [])

  // ─── LOADING ───
  if (offerLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Se încarcă oferta...</div>
      </div>
    )
  }

  // ─── NO OFFER ───
  if (!offer) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <FileText size={48} className="mx-auto text-muted-foreground" />
          <h2 className="text-xl font-bold">Selectează o ofertă</h2>
          <p className="text-sm text-muted-foreground">Navighează la o ofertă acceptată și apasă &ldquo;Generează Contract&rdquo;</p>
          <Link href="/offers" className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium">
            <ArrowLeft size={14} /> Înapoi la Oferte
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div id="contract-page" className="min-h-screen bg-background flex flex-col">
      {/* Print styles */}
      <style>{`
        @media print {
          @page { margin: 15mm 12mm; }

          /* White background on everything */
          html, body { background: white !important; overflow: visible !important; height: auto !important; }

          /* Hide: top bar, left panel, preview banner, dashboard sidebar/nav */
          .print-hide, nav, aside, header { display: none !important; }

          /* CRITICAL: Break ALL overflow/scroll traps from dashboard layout */
          div, main, section {
            overflow: visible !important;
            height: auto !important;
            max-height: none !important;
          }

          /* The outer page wrapper + main layout — flow naturally */
          #contract-page {
            display: block !important;
            min-height: 0 !important;
            background: white !important;
          }
          #contract-layout {
            display: block !important;
          }
          #contract-preview {
            background: white !important;
          }

          /* The contract card itself */
          #contract-card {
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            background: white !important;
          }

          /* Force dark text on all contract content */
          #contract-card, #contract-card * {
            color: #1f2937 !important;
            background: transparent !important;
            box-shadow: none !important;
          }
          #contract-card h1, #contract-card h2,
          #contract-card strong, #contract-card b {
            color: #111827 !important;
          }
          #contract-card [class*="text-muted"] { color: #6b7280 !important; }
          #contract-card [class*="text-primary"] { color: #2563eb !important; }
          #contract-card [class*="border"] { border-color: #d1d5db !important; }

          /* Allow content to flow naturally — only keep headings with their first paragraph */
          #contract-card h2, #contract-card h3 { page-break-after: avoid; }
          #contract-card .group,
          #contract-card [class*="rounded"] {
            border-radius: 0 !important;
            border: none !important;
          }

          /* Logo prints with color */
          img { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }

          /* Compact spacing for print */
          #contract-card .group { padding: 8px 0 !important; margin: 0 !important; }
          #contract-card .p-6 { padding: 12px 24px !important; }
          #contract-card .space-y-4 > * + * { margin-top: 8px !important; }

          /* Signature block — keep together on one page */
          #contract-signatures {
            page-break-inside: avoid !important;
            page-break-before: auto;
          }
          #contract-signatures .grid { display: grid !important; grid-template-columns: 1fr 1fr !important; }

          /* Eliminate trailing empty page */
          #contract-card { padding-bottom: 0 !important; margin-bottom: 0 !important; }
          #contract-preview { padding-bottom: 0 !important; margin-bottom: 0 !important; }
          #contract-preview > div { padding-bottom: 0 !important; }

          /* Anexa 2 print styles */
          #contract-anexa2 {
            page-break-before: always !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            background: white !important;
          }
          #contract-anexa2, #contract-anexa2 * {
            color: #1f2937 !important;
            background: transparent !important;
          }
          #contract-anexa2 h1, #contract-anexa2 h2, #contract-anexa2 h3,
          #contract-anexa2 strong, #contract-anexa2 b { color: #111827 !important; }
          #contract-anexa2 table { border-collapse: collapse !important; }
          #contract-anexa2 th, #contract-anexa2 td { border: 1px solid #d1d5db !important; }
          #contract-anexa2 thead tr { background: #f9fafb !important; }
          #contract-anexa2 .grid { display: grid !important; }
          #contract-anexa2 .grid-cols-2 { grid-template-columns: 1fr 1fr !important; }
          #contract-anexa2 .grid-cols-3 { grid-template-columns: 1fr 1fr 1fr !important; }
          #contract-anexa2 [class*="rounded"] { border-radius: 4px !important; border: 1px solid #e5e7eb !important; }
          #contract-anexa2 [class*="bg-blue-100"], #contract-anexa2 [class*="bg-emerald-100"],
          #contract-anexa2 [class*="bg-blue-50"], #contract-anexa2 [class*="bg-gray-50"] {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
      {/* ── TOP BAR ── */}
      <div className="h-14 border-b border-border bg-surface/80 backdrop-blur-sm flex items-center justify-between px-4 flex-shrink-0 sticky top-0 z-20 print-hide">
        <div className="flex items-center gap-3">
          <Link href={`/offers/${offer.id}`} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-sm font-bold text-foreground flex items-center gap-2">
              <FileText size={14} className="text-primary" />
              Contract — {offer.entityName}
            </h1>
            <p className="text-[10px] text-muted-foreground">Din oferta {offer.number} • {services.join(' + ').toUpperCase()}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setClientPreview(!clientPreview)}
            className={cn("flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors",
              clientPreview ? 'bg-amber-500 text-white border-amber-500' : 'border-border bg-surface hover:bg-muted'
            )}>
            <Eye size={12} /> {clientPreview ? 'Ieși din Preview' : 'Preview Client'}
          </button>
          <button onClick={() => {
            setClientPreview(true)
            setTimeout(() => window.print(), 300)
          }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-surface hover:bg-muted transition-colors">
            <Printer size={12} /> Printează
          </button>
          <button onClick={() => alert('Export PDF va fi disponibil în curând. Momentan poți folosi Printează → Salvează ca PDF.')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-surface hover:bg-muted transition-colors">
            <Download size={12} /> PDF
          </button>
          <button onClick={async () => {
            try {
              const payload = {
                offerId: offer.id,
                businessLine: offer.businessLine || 'agency',
                businessLineId: offer.businessLineId,
                clientId: offer.clientId,
                templateId: template.id,
                companyDetails: company,
                clientDetails: client,
                number: contractNumber,
                value: offer.value || 0,
                currency: offer.currency || 'EUR',
                duration,
                startDate: new Date(startDate).toISOString(),
                endDate: new Date(endDate).toISOString(),
                sections: resolvedSections.map(s => ({ id: s.id, title: s.title, content: s.content })),
                sectionOverrides,
                anexa2: includeAnexa2 ? {
                  deliverables: sowTemplate.defaultDeliverables,
                  phases: editablePhases,
                  reporting: sowTemplate.defaultReporting,
                } : undefined,
                status: 'draft',
              }
              const res = await fetch('/api/contracts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
              })
              const json = await res.json()
              if (res.ok && (json.data?.id || json.id)) {
                router.push(`/contracts/${json.data?.id || json.id}`)
              } else {
                alert(`Eroare la salvare: ${json.error || 'Unknown error'}`)
              }
            } catch {
              alert('Eroare de rețea la salvarea contractului')
            }
          }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
            <Save size={12} /> Salvează Draft
          </button>
          <button onClick={async () => {
            if (!confirm(`Salvează și trimite contractul ${contractNumber} către ${client.legalName}?`)) return
            try {
              const payload = {
                offerId: offer.id,
                businessLine: offer.businessLine || 'agency',
                businessLineId: offer.businessLineId,
                clientId: offer.clientId,
                templateId: template.id,
                companyDetails: company,
                clientDetails: client,
                number: contractNumber,
                value: offer.value || 0,
                currency: offer.currency || 'EUR',
                duration,
                startDate: new Date(startDate).toISOString(),
                endDate: new Date(endDate).toISOString(),
                sections: resolvedSections.map(s => ({ id: s.id, title: s.title, content: s.content })),
                sectionOverrides,
                anexa2: includeAnexa2 ? {
                  deliverables: sowTemplate.defaultDeliverables,
                  phases: editablePhases,
                  reporting: sowTemplate.defaultReporting,
                } : undefined,
                status: 'draft',
              }
              const res = await fetch('/api/contracts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
              })
              const json = await res.json()
              if (res.ok && (json.data?.id || json.id)) {
                router.push(`/contracts/${json.data?.id || json.id}?send=true`)
              } else {
                alert(`Eroare la salvare: ${json.error || 'Unknown error'}`)
              }
            } catch (err) {
              alert('Eroare de rețea la salvarea contractului')
            }
          }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-success text-white rounded-lg hover:bg-success/90 transition-colors">
            <Send size={12} /> Trimite
          </button>
        </div>
      </div>

      {/* ── MAIN LAYOUT ── */}
      <div id="contract-layout" className="flex-1 flex overflow-hidden">
        {/* ── LEFT: SETTINGS PANEL ── */}
        {!clientPreview && (
        <div className="w-[380px] flex-shrink-0 border-r border-border bg-surface/30 overflow-y-auto print-hide">
          <div className="p-4 space-y-5">

            {/* SERVICII INCLUSE */}
            <div className="bg-surface rounded-xl border border-border p-3 space-y-2">
              <h3 className="text-xs font-bold text-foreground flex items-center gap-2">
                <Settings size={12} className="text-primary" /> Servicii Incluse
              </h3>
              <div className="flex gap-2">
                {['seo', 'ads'].map(svc => (
                  <button key={svc} onClick={() => {
                    setServices(prev => prev.includes(svc) ? prev.filter(s => s !== svc) : [...prev, svc])
                  }}
                    className={cn("flex-1 py-2 px-3 rounded-lg text-xs font-bold border-2 transition-all text-center uppercase",
                      services.includes(svc)
                        ? "bg-primary/10 border-primary/30 text-primary"
                        : "bg-muted/30 border-border text-muted-foreground"
                    )}>
                    {svc === 'seo' ? '🔍 SEO' : '📢 Google Ads'}
                  </button>
                ))}
              </div>
            </div>

            {/* DATE PRESTATOR */}
            <div className="bg-surface rounded-xl border border-border p-3 space-y-2">
              <h3 className="text-xs font-bold text-foreground flex items-center gap-2">
                <Building2 size={12} className="text-primary" /> Date Prestator
              </h3>
              <div className="grid grid-cols-1 gap-1.5">
                <InputField label="Denumire" value={company.legalName} onChange={v => setCompany(p => ({ ...p, legalName: v }))} />
                <div className="grid grid-cols-2 gap-1.5">
                  <InputField label="CIF" value={company.cif} onChange={v => setCompany(p => ({ ...p, cif: v }))} />
                  <InputField label="Reg. Com." value={company.regCom} onChange={v => setCompany(p => ({ ...p, regCom: v }))} />
                </div>
                <InputField label="Adresă" value={company.address} onChange={v => setCompany(p => ({ ...p, address: v }))} />
                <div className="grid grid-cols-2 gap-1.5">
                  <InputField label="IBAN" value={company.iban} onChange={v => setCompany(p => ({ ...p, iban: v }))} />
                  <InputField label="Bancă" value={company.bank} onChange={v => setCompany(p => ({ ...p, bank: v }))} />
                </div>
                <InputField label="Reprezentant" value={company.representative} onChange={v => setCompany(p => ({ ...p, representative: v }))} />
              </div>
            </div>

            {/* DATE BENEFICIAR */}
            <div className="bg-surface rounded-xl border border-border p-3 space-y-2">
              <h3 className="text-xs font-bold text-foreground flex items-center gap-2">
                <User size={12} className="text-orange-500" /> Date Beneficiar
              </h3>
              <div className="grid grid-cols-1 gap-1.5">
                <InputField label="Denumire" value={client.legalName} onChange={v => setClient(p => ({ ...p, legalName: v }))} />
                <div className="grid grid-cols-2 gap-1.5">
                  <InputField label="CIF" value={client.cif} onChange={v => setClient(p => ({ ...p, cif: v }))} placeholder="RO..." />
                  <InputField label="Reg. Com." value={client.regCom} onChange={v => setClient(p => ({ ...p, regCom: v }))} placeholder="J__/___/____" />
                </div>
                <InputField label="Adresă sediu" value={client.address} onChange={v => setClient(p => ({ ...p, address: v }))} placeholder="Str. ..." />
                <div className="grid grid-cols-3 gap-1.5">
                  <div>
                    <label className="text-[9px] font-medium text-muted-foreground uppercase tracking-wide mb-0.5 block">Prefix</label>
                    <select value={client.representativePrefix} onChange={e => setClient(p => ({ ...p, representativePrefix: e.target.value }))} className="w-full px-2 py-1.5 text-xs bg-muted/30 border border-border rounded-lg text-foreground">
                      <option value="dl.">dl.</option>
                      <option value="dna.">dna.</option>
                    </select>
                  </div>
                  <InputField label="Reprezentant" value={client.representative} onChange={v => setClient(p => ({ ...p, representative: v }))} placeholder="Nume complet" />
                  <InputField label="Funcție" value={client.representativeRole} onChange={v => setClient(p => ({ ...p, representativeRole: v }))} />
                </div>
              </div>
            </div>

            {/* PARAMETRI CONTRACT */}
            <div className="bg-surface rounded-xl border border-border p-3 space-y-2">
              <h3 className="text-xs font-bold text-foreground flex items-center gap-2">
                <Calendar size={12} className="text-indigo-500" /> Parametri Contract
              </h3>
              <div>
                <label className="text-[9px] font-bold uppercase text-muted-foreground mb-0.5 block">Nr. Contract (auto-generat)</label>
                <input value={contractNumber} onChange={e => setContractNumber(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs bg-muted/30 border border-border rounded-lg text-foreground font-mono font-bold outline-none focus:ring-1 focus:ring-primary" />
                <p className="text-[9px] text-muted-foreground mt-0.5">Prefix: {numberingConfig.prefix} • Următor: #{numberingConfig.nextNumber}</p>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <label className="text-[9px] font-bold uppercase text-muted-foreground mb-0.5 block">Data Start</label>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs bg-muted/30 border border-border rounded-lg text-foreground outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <div>
                  <label className="text-[9px] font-bold uppercase text-muted-foreground mb-0.5 block">Durată (luni)</label>
                  <input type="number" value={duration} onChange={e => setDuration(Number(e.target.value))} min={1} max={60}
                    className="w-full px-2 py-1.5 text-xs bg-muted/30 border border-border rounded-lg text-foreground outline-none focus:ring-1 focus:ring-primary" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                <div>
                  <label className="text-[9px] font-bold uppercase text-muted-foreground mb-0.5 block">Penalitate (%/zi)</label>
                  <input type="number" step="0.01" value={settings.penaltyRate} onChange={e => setSettings(p => ({ ...p, penaltyRate: Number(e.target.value) }))}
                    className="w-full px-2 py-1.5 text-xs bg-muted/30 border border-border rounded-lg text-foreground outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <div>
                  <label className="text-[9px] font-bold uppercase text-muted-foreground mb-0.5 block">Preaviz (zile)</label>
                  <input type="number" value={settings.noticePeriod} onChange={e => setSettings(p => ({ ...p, noticePeriod: Number(e.target.value) }))}
                    className="w-full px-2 py-1.5 text-xs bg-muted/30 border border-border rounded-lg text-foreground outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <div>
                  <label className="text-[9px] font-bold uppercase text-muted-foreground mb-0.5 block">Termen plată</label>
                  <input type="number" value={settings.paymentTermDays} onChange={e => setSettings(p => ({ ...p, paymentTermDays: Number(e.target.value) }))}
                    className="w-full px-2 py-1.5 text-xs bg-muted/30 border border-border rounded-lg text-foreground outline-none focus:ring-1 focus:ring-primary" />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground">Data expirare: <strong>{formatDate(endDate)}</strong></p>
            </div>

            {/* SECȚIUNI CONTRACT */}
            <div className="bg-surface rounded-xl border border-border p-3 space-y-1">
              <h3 className="text-xs font-bold text-foreground flex items-center gap-2 mb-2">
                <FileText size={12} className="text-emerald-500" /> Secțiuni Contract ({resolvedSections.length})
              </h3>
              {resolvedSections.map((section, idx) => (
                <button key={section.id}
                  onClick={() => {
                    setEditingSectionId(editingSectionId === section.id ? null : section.id)
                    // Scroll to section in preview
                    const el = document.getElementById(`section-${section.id}`)
                    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }}
                  className={cn(
                    "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-all text-xs",
                    editingSectionId === section.id
                      ? "bg-primary/10 text-primary font-bold"
                      : "hover:bg-muted/50 text-foreground"
                  )}>
                  <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[9px] font-bold flex-shrink-0">
                    {idx + 1}
                  </span>
                  <span className="flex-1 truncate">{section.title.replace('Art. ', '').replace(' — ', ': ')}</span>
                  {section.editable && <Pencil size={9} className="text-muted-foreground flex-shrink-0" />}
                </button>
              ))}
            </div>

            {/* ANEXA 2 — STATEMENT OF WORK */}
            <div className="bg-surface rounded-xl border border-border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-foreground flex items-center gap-2">
                  <FileText size={12} className="text-blue-500" /> Anexa 2 — SoW
                </h3>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={includeAnexa2} onChange={e => setIncludeAnexa2(e.target.checked)}
                    className="rounded border-border text-primary w-3.5 h-3.5" />
                  <span className="text-[9px] text-muted-foreground">Include</span>
                </label>
              </div>
              {includeAnexa2 && (
                <div className="space-y-1 text-[10px] text-muted-foreground">
                  <p>✓ {sowTemplate.defaultDeliverables.length} livrabile auto-generate</p>
                  <p>✓ {sowTemplate.defaultPhases.length} faze de implementare</p>
                  <p>✓ Cadru raportare ({sowTemplate.defaultReporting.kpis.length} categorii KPI)</p>
                </div>
              )}
            </div>
          </div>
        </div>
        )}

        {/* ── RIGHT: CONTRACT PREVIEW ── */}
        <div id="contract-preview" className={cn("flex-1 overflow-y-auto transition-colors", clientPreview ? "bg-white" : "bg-muted/20")}>
          <div className={cn("mx-auto py-8 px-6", clientPreview ? "max-w-[900px]" : "max-w-[800px]")}>
            {/* Client preview banner */}
            {clientPreview && (
              <div className="mb-4 flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 print-hide">
                <Eye size={14} />
                <span className="font-semibold">Mod Preview Client</span>
                <span className="text-amber-600">— Așa va arăta contractul pentru beneficiar</span>
              </div>
            )}
            {/* Contract header */}
            <div id="contract-card" className={cn("rounded-xl border shadow-sm overflow-hidden", clientPreview ? "bg-white border-gray-200 shadow-lg" : "bg-surface border-border")}>
              {/* Light theme override for client preview */}
              {clientPreview && (
                <style>{`
                  .contract-preview-light,
                  .contract-preview-light * {
                    color: #1f2937 !important;
                  }
                  .contract-preview-light h1,
                  .contract-preview-light h2,
                  .contract-preview-light strong,
                  .contract-preview-light b {
                    color: #111827 !important;
                  }
                  .contract-preview-light [class*="text-muted"] {
                    color: #6b7280 !important;
                  }
                  .contract-preview-light [class*="text-primary"] {
                    color: #2563eb !important;
                  }
                  .contract-preview-light [class*="border-border"],
                  .contract-preview-light [class*="border-b"] {
                    border-color: #e5e7eb !important;
                  }
                `}</style>
              )}
              <div className={clientPreview ? "contract-preview-light" : ""}>
              {/* Professional header */}
              <div className={cn("border-b-2", clientPreview ? "border-gray-200" : "border-border")}>
                {/* Top banner with logo */}
                <div className="flex items-center justify-between px-8 pt-8 pb-4">
                  <div className="flex items-center gap-4">
                    <Image
                      src="/asns-logo-black.png"
                      alt="ASNS" width={140} height={42}
                      className={cn("object-contain", !clientPreview && "invert")}
                      style={{ maxHeight: 42 }}
                    />
                    <div>
                      <p className="text-sm font-bold text-foreground">{company.legalName}</p>
                      <p className="text-[10px] text-muted-foreground">CIF: {company.cif} • {company.regCom}</p>
                      <p className="text-[10px] text-muted-foreground">{company.address}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground">IBAN: {company.iban}</p>
                    <p className="text-[10px] text-muted-foreground">{company.bank}</p>
                    <p className="text-[10px] text-muted-foreground">{company.email}</p>
                  </div>
                </div>

                {/* Separator line */}
                <div className="mx-8 h-px bg-gradient-to-r from-primary/50 via-primary to-primary/50" />

                {/* Title */}
                <div className="px-8 py-6 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground mb-2">— Contract —</p>
                  <h1 className="text-xl font-bold text-foreground tracking-tight uppercase">
                    Contract de Prestări Servicii
                  </h1>
                  <p className="text-sm font-semibold text-primary mt-1">
                    {services.includes('seo') && services.includes('ads')
                      ? 'Servicii SEO & Management Campanii Google Ads'
                      : services.includes('seo')
                        ? 'Servicii de Optimizare SEO'
                        : 'Management Campanii Google Ads'
                    }
                  </p>
                  <div className="mt-3 inline-flex items-center gap-3 px-4 py-1.5 bg-muted/30 rounded-full text-[10px] text-muted-foreground font-medium">
                    <span>Nr. <strong className="text-foreground">{contractNumber}</strong> / {contractDate}</span>
                    <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                    <span>Ref. Ofertă: {offer.number}</span>
                  </div>
                </div>
              </div>

              {/* Sections */}
              <div className={cn("p-8 space-y-6", clientPreview && "text-gray-800")}>
                {resolvedSections.map(section => (
                  <div key={section.id} id={`section-${section.id}`}
                    className={cn("group relative rounded-xl transition-all",
                      clientPreview ? "p-5 border-2 border-transparent"
                        : editingSectionId === section.id
                          ? "bg-primary/[0.03] border-2 border-primary/30 p-5"
                          : "hover:bg-muted/30 p-5 border-2 border-transparent"
                    )}>
                    {/* Section header */}
                    <div className={cn("flex items-center justify-between mb-3", !clientPreview && "cursor-pointer")} onClick={() => !clientPreview && toggleSection(section.id)}>
                      <h2 className="text-sm font-bold text-foreground tracking-wide uppercase">
                        {section.title}
                      </h2>
                      <div className="flex items-center gap-1">
                        {!clientPreview && section.editable && editingSectionId !== section.id && (
                          <button onClick={(e) => { e.stopPropagation(); setEditingSectionId(section.id) }}
                            className="opacity-0 group-hover:opacity-100 flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold uppercase bg-primary text-primary-foreground rounded transition-all">
                            <Pencil size={8} /> Editează
                          </button>
                        )}
                        {collapsedSections.has(section.id)
                          ? <ChevronRight size={14} className="text-muted-foreground" />
                          : <ChevronDown size={14} className="text-muted-foreground" />
                        }
                      </div>
                    </div>

                    {/* Section content */}
                    {!collapsedSections.has(section.id) && (
                      editingSectionId === section.id ? (
                        <div className="space-y-2">
                          <textarea
                            value={sectionOverrides[section.id] || section.rawContent || template.sections.find(s => s.id === section.id)?.content || ''}
                            onChange={e => updateSection(section.id, e.target.value)}
                            rows={15}
                            className="w-full px-3 py-2 text-xs bg-surface border border-border rounded-lg text-foreground font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y"
                          />
                          <div className="flex items-center justify-between">
                            <p className="text-[9px] text-muted-foreground">
                              Variabile disponibile: {"{{client_legal_name}}"}, {"{{duration}}"}, {"{{penalty_rate}}"}, etc.
                            </p>
                            <button onClick={() => setEditingSectionId(null)}
                              className="flex items-center gap-1 px-2 py-1 text-[9px] font-bold bg-primary text-primary-foreground rounded hover:bg-primary/90">
                              <CheckCircle2 size={9} /> Done
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line contract-text">
                          {section.content.split('\n').map((line, i) => {
                            // Bold markdown
                            const formatted = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                            // Check for unresolved variables
                            const hasUnresolved = /\[.*?\]/.test(line) && !line.includes('[')
                            return (
                              <span key={i} className={cn(hasUnresolved && "bg-warning/20 rounded px-0.5")}>
                                <span dangerouslySetInnerHTML={{ __html: formatted }} />
                                {'\n'}
                              </span>
                            )
                          })}
                        </div>
                      )
                    )}
                  </div>
                ))}
              </div>

              {/* ── SIGNATURE BLOCK ── */}
              <div id="contract-signatures" className="border-t-2 border-border px-8 py-8">
                <p className="text-[10px] text-muted-foreground text-center mb-6 uppercase tracking-wider font-semibold">Încheiat astăzi, {contractDate}, în două exemplare, câte unul pentru fiecare parte.</p>
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">PRESTATOR</p>
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-foreground">{company.legalName}</p>
                      <p className="text-xs text-muted-foreground">CIF: {company.cif}</p>
                      <p className="text-xs text-muted-foreground">Prin: {company.representative}</p>
                    </div>
                    <div className="pt-8 border-b border-border/50 w-48" />
                    <p className="text-[10px] text-muted-foreground italic">Semnătura</p>
                  </div>
                  <div className="space-y-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">BENEFICIAR</p>
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-foreground">{client.legalName}</p>
                      <p className="text-xs text-muted-foreground">CIF: {client.cif}</p>
                      <p className="text-xs text-muted-foreground">Prin: {client.representative}, {client.representativeRole}</p>
                    </div>
                    <div className="pt-8 border-b border-border/50 w-48" />
                    <p className="text-[10px] text-muted-foreground italic">Semnătura</p>
                  </div>
                </div>
                <p className="text-[9px] text-muted-foreground text-center mt-6 italic">
                  Conform O.U.G. nr. 17/2015 privind eliminarea obligativității utilizării ștampilei, prezentul contract nu necesită aplicarea ștampilei pentru a fi valid din punct de vedere juridic.
                </p>
              </div>
              </div>{/* close contract-preview-light wrapper */}
            </div>

            {/* ══════════════════════════════════════════════════ */}
            {/* ══ ANEXA 2 — STATEMENT OF WORK ══ */}
            {/* ══════════════════════════════════════════════════ */}
            {includeAnexa2 && (
              <div id="contract-anexa2" className={cn("mt-8 rounded-xl border shadow-sm overflow-hidden", clientPreview ? "bg-white border-gray-200 shadow-lg" : "bg-surface border-border")}>
                <div className={clientPreview ? "contract-preview-light" : ""}>
                  {/* Anexa 2 Header */}
                  <div className={cn("px-8 pt-8 pb-4 border-b-2 text-center", clientPreview ? "border-gray-200" : "border-border")}>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">— Anexa 2 la Contractul nr. {contractNumber} —</p>
                    <h1 className="text-lg font-bold text-foreground">LISTA SERVICIILOR DETALIATE ȘI LIVRABILELE AGREATE</h1>
                    <p className="text-xs text-muted-foreground mt-1">(Statement of Work)</p>
                    <p className="text-[10px] text-muted-foreground mt-2">Referință Ofertă: {offer?.number} din {offer?.createdAt ? formatDate(offer.createdAt) : ''}</p>
                  </div>

                  {/* ── SECTION A: Tabel Livrabile ── */}
                  <div className="px-8 py-6">
                    <h2 className="text-sm font-bold text-foreground mb-4 uppercase tracking-wide">A. Servicii și Livrabile Agreate</h2>
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className={cn("text-left", clientPreview ? "bg-gray-50" : "bg-muted/30")}>
                          <th className="px-3 py-2 font-bold text-foreground border border-border/50">Nr.</th>
                          <th className="px-3 py-2 font-bold text-foreground border border-border/50">Serviciu / Livrabil</th>
                          <th className="px-3 py-2 font-bold text-foreground border border-border/50">Frecvență</th>
                          <th className="px-3 py-2 font-bold text-foreground border border-border/50">KPI / Indicator</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sowTemplate.defaultDeliverables.map((del, i) => (
                          <tr key={del.id} className={cn(i % 2 === 0 ? '' : clientPreview ? 'bg-gray-50/50' : 'bg-muted/10')}>
                            <td className="px-3 py-2 border border-border/50 text-center font-mono text-muted-foreground">{i + 1}</td>
                            <td className="px-3 py-2 border border-border/50">
                              <p className="font-semibold text-foreground">{del.service}</p>
                              {del.description && <p className="text-[10px] text-muted-foreground mt-0.5">{del.description}</p>}
                            </td>
                            <td className="px-3 py-2 border border-border/50 text-center">
                              <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-bold",
                                del.frequency === 'one-time' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                              )}>{del.frequency === 'one-time' ? 'O singură dată' : del.frequency === 'lunar' ? 'Lunar' : del.frequency}</span>
                            </td>
                            <td className="px-3 py-2 border border-border/50 text-foreground">{del.kpi}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Pricing summary */}
                    <div className={cn("mt-4 p-4 rounded-lg text-xs", clientPreview ? "bg-gray-50 border border-gray-200" : "bg-muted/20 border border-border")}>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground">Tarif lunar management:</span>
                        <span className="font-bold text-foreground">{offer?.value || 0} {offer?.currency || 'EUR'} + TVA / lună</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">Bugetul de media (publicitar) Google Ads este separat și se achită direct de către Beneficiar.</p>
                    </div>
                  </div>

                  {/* ── SECTION B: Plan de Implementare (EDITABIL) ── */}
                  <div className={cn("px-8 py-6 border-t", clientPreview ? "border-gray-200" : "border-border")}>
                    <h2 className="text-sm font-bold text-foreground mb-4 uppercase tracking-wide">B. Plan de Implementare pe Faze</h2>
                    <div className="space-y-6">
                      {editablePhases.map((phase, i) => {
                        const isEditing = editingPhaseId === phase.id && !clientPreview
                        return (
                        <div key={phase.id} className={cn("rounded-lg p-4 group/phase relative transition-all",
                          clientPreview ? "bg-gray-50 border border-gray-200"
                            : isEditing ? "bg-primary/[0.03] border-2 border-primary/30"
                            : "bg-muted/20 border border-border hover:border-primary/20"
                        )}>
                          {/* Phase header */}
                          <div className="flex items-center gap-3 mb-3">
                            <span className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
                              clientPreview ? "bg-blue-100 text-blue-700" : "bg-primary/20 text-primary"
                            )}>{i + 1}</span>
                            {isEditing ? (
                              <div className="flex-1 space-y-1">
                                <input value={phase.name} onChange={e => updatePhase(phase.id, { name: e.target.value })}
                                  className="w-full px-2 py-1 text-xs font-bold bg-surface border border-border rounded text-foreground outline-none focus:ring-1 focus:ring-primary" />
                                <input value={phase.period} onChange={e => updatePhase(phase.id, { period: e.target.value })}
                                  className="w-full px-2 py-1 text-[10px] bg-surface border border-border rounded text-muted-foreground outline-none focus:ring-1 focus:ring-primary" />
                              </div>
                            ) : (
                              <div className="flex-1">
                                <h3 className="text-xs font-bold text-foreground uppercase">{phase.name}</h3>
                                <p className="text-[10px] text-muted-foreground">{phase.period}</p>
                              </div>
                            )}
                            {/* Edit button */}
                            {!clientPreview && (
                              <button onClick={() => setEditingPhaseId(isEditing ? null : phase.id)}
                                className={cn("flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold uppercase rounded transition-all",
                                  isEditing
                                    ? "bg-emerald-500 text-white"
                                    : "opacity-0 group-hover/phase:opacity-100 bg-primary text-primary-foreground"
                                )}>
                                {isEditing ? <><CheckCircle2 size={8} /> Done</> : <><Pencil size={8} /> Editează</>}
                              </button>
                            )}
                          </div>

                          {/* Tasks */}
                          <ul className="space-y-1.5 ml-11">
                            {phase.tasks.map((task, ti) => (
                              <li key={ti} className="text-[11px] text-foreground/90 flex items-start gap-2">
                                <span className="text-muted-foreground mt-0.5">•</span>
                                {isEditing ? (
                                  <div className="flex-1 flex items-start gap-1">
                                    <input value={task} onChange={e => updateTask(phase.id, ti, e.target.value)}
                                      className="flex-1 px-2 py-0.5 text-[11px] bg-surface border border-border rounded text-foreground outline-none focus:ring-1 focus:ring-primary" />
                                    <button onClick={() => removeTaskFromPhase(phase.id, ti)}
                                      className="p-0.5 text-red-400 hover:text-red-600 transition-colors flex-shrink-0 mt-0.5">
                                      <Trash2 size={10} />
                                    </button>
                                  </div>
                                ) : (
                                  <span>{task}</span>
                                )}
                              </li>
                            ))}
                          </ul>

                          {/* Add task button */}
                          {isEditing && (
                            <button onClick={() => addTaskToPhase(phase.id)}
                              className="ml-11 mt-2 flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 transition-colors">
                              <Plus size={10} /> Adaugă activitate
                            </button>
                          )}

                          {/* Deliverable */}
                          <div className={cn("mt-3 ml-11 px-3 py-1.5 rounded text-[10px]", clientPreview ? "bg-blue-50 text-blue-800" : "bg-primary/10 text-primary")}>
                            {isEditing ? (
                              <div className="flex items-center gap-1">
                                <strong className="flex-shrink-0">Livrabil:</strong>
                                <input value={phase.deliverable} onChange={e => updatePhase(phase.id, { deliverable: e.target.value })}
                                  className="flex-1 px-2 py-0.5 text-[10px] bg-surface border border-border rounded text-foreground outline-none focus:ring-1 focus:ring-primary" />
                              </div>
                            ) : (
                              <><strong>Livrabil:</strong> {phase.deliverable}</>
                            )}
                          </div>
                        </div>
                      )})}
                    </div>
                  </div>

                  {/* ── SECTION C: Cadrul de Raportare ── */}
                  <div className={cn("px-8 py-6 border-t", clientPreview ? "border-gray-200" : "border-border")}>
                    <h2 className="text-sm font-bold text-foreground mb-4 uppercase tracking-wide">C. Cadrul de Raportare</h2>
                    <div className="space-y-3 text-xs">
                      <div className="grid grid-cols-3 gap-3">
                        <div className={cn("p-3 rounded-lg", clientPreview ? "bg-gray-50 border border-gray-200" : "bg-muted/20 border border-border")}>
                          <p className="text-[9px] font-bold uppercase text-muted-foreground mb-1">Frecvență</p>
                          <p className="text-foreground">{sowTemplate.defaultReporting.frequency}</p>
                        </div>
                        <div className={cn("p-3 rounded-lg", clientPreview ? "bg-gray-50 border border-gray-200" : "bg-muted/20 border border-border")}>
                          <p className="text-[9px] font-bold uppercase text-muted-foreground mb-1">Format</p>
                          <p className="text-foreground">{sowTemplate.defaultReporting.format}</p>
                        </div>
                        <div className={cn("p-3 rounded-lg", clientPreview ? "bg-gray-50 border border-gray-200" : "bg-muted/20 border border-border")}>
                          <p className="text-[9px] font-bold uppercase text-muted-foreground mb-1">Meeting-uri</p>
                          <p className="text-foreground">{sowTemplate.defaultReporting.meetingCadence}</p>
                        </div>
                      </div>

                      <h3 className="text-xs font-bold text-foreground mt-4 mb-2">KPI-uri Monitorizate:</h3>
                      <div className="grid grid-cols-2 gap-3">
                        {sowTemplate.defaultReporting.kpis.map((cat, ci) => (
                          <div key={ci} className={cn("p-3 rounded-lg", clientPreview ? "bg-gray-50 border border-gray-200" : "bg-muted/20 border border-border")}>
                            <p className="text-[10px] font-bold text-foreground mb-1.5">{cat.category}</p>
                            <ul className="space-y-0.5">
                              {cat.metrics.map((m, mi) => (
                                <li key={mi} className="text-[10px] text-foreground/80 flex items-start gap-1.5">
                                  <span className="text-muted-foreground">›</span>
                                  <span>{m}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Anexa 2 Footer */}
                  <div className={cn("px-8 py-6 border-t text-center", clientPreview ? "border-gray-200" : "border-border")}>
                    <p className="text-[10px] text-muted-foreground">
                      Prezenta anexă face parte integrantă din Contractul de Prestări Servicii nr. <strong>{contractNumber}</strong> din data de {contractDate}.
                    </p>
                    <div className="grid grid-cols-2 gap-8 mt-6">
                      <div className="text-left">
                        <p className="text-[10px] font-bold uppercase text-muted-foreground">PRESTATOR</p>
                        <p className="text-xs font-bold text-foreground mt-1">{company.legalName}</p>
                      </div>
                      <div className="text-left">
                        <p className="text-[10px] font-bold uppercase text-muted-foreground">BENEFICIAR</p>
                        <p className="text-xs font-bold text-foreground mt-1">{client.legalName}</p>
                      </div>
                    </div>
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

// ─── INPUT FIELD COMPONENT ───
function InputField({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <div>
      <label className="text-[9px] font-bold uppercase text-muted-foreground mb-0.5 block">{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-2 py-1.5 text-xs bg-muted/30 border border-border rounded-lg text-foreground outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/40" />
    </div>
  )
}

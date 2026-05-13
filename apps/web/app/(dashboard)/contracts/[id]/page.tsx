"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { cn, formatDate } from "@/lib/utils"
import {
  ArrowLeft, FileText, Calendar, DollarSign, User, Building2,
  Clock, CheckCircle2, Edit, MoreHorizontal, Download, Printer,
  ChevronDown, ChevronRight, Loader2, CreditCard, AlertCircle,
  Send, XCircle, Mail, Trash2,
} from "lucide-react"

interface ContractData {
  id: string
  number: string
  status: string
  value: number
  currency: string
  duration: number
  startDate: string
  endDate: string
  signedAt: string | null
  createdBy: string | null
  templateId: string | null
  sections: any[]
  anexa2: any
  companyDetails: any
  clientDetails: any
  createdAt: string
  updatedAt: string
  client: { id: string; companyName: string } | null
  businessLine: { slug: string; name: string } | null
  offer: { id: string; number: string; templateName?: string; value?: number; currency?: string } | null
  linkedOffers: { id: string; number: string; value: number; currency: string; status: string; templateName: string; createdAt: string }[]
}

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  draft:      { label: "Draft",      color: "text-amber-400",   bg: "bg-amber-500/10",   icon: Edit },
  sent:       { label: "Trimis",     color: "text-blue-400",    bg: "bg-blue-500/10",     icon: FileText },
  signed:     { label: "Semnat",     color: "text-emerald-400", bg: "bg-emerald-500/10",  icon: CheckCircle2 },
  active:     { label: "Activ",      color: "text-emerald-400", bg: "bg-emerald-500/10",  icon: CheckCircle2 },
  expired:    { label: "Expirat",    color: "text-red-400",     bg: "bg-red-500/10",      icon: Clock },
  terminated: { label: "Reziliat",   color: "text-red-400",     bg: "bg-red-500/10",      icon: AlertCircle },
}

export default function ContractDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [contract, setContract] = useState<ContractData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["art-1"]))
  const [activeView, setActiveView] = useState<"contract" | "anexa2" | "oferte">("contract")
  const [confirmDetachId, setConfirmDetachId] = useState<string | null>(null)
  const [detaching, setDetaching] = useState(false)
  const [showAttachPicker, setShowAttachPicker] = useState(false)
  const [availableOffers, setAvailableOffers] = useState<any[]>([])
  const [loadingAvailable, setLoadingAvailable] = useState(false)
  const [attaching, setAttaching] = useState<string | null>(null)
  const [attachSearch, setAttachSearch] = useState('')
  const [editingPrice, setEditingPrice] = useState(false)
  const [autoPrice, setAutoPrice] = useState(false)
  const [manualValue, setManualValue] = useState('')
  const [savingPrice, setSavingPrice] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editedSections, setEditedSections] = useState<Record<string, string>>({})
  const [editedTitles, setEditedTitles] = useState<Record<string, string>>({})
  const [savingSections, setSavingSections] = useState(false)
  const [editedAnexa2, setEditedAnexa2] = useState<any>(null)
  const [showSendModal, setShowSendModal] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/contracts/${id}`)
        if (!res.ok) throw new Error("Not found")
        const json = await res.json()
        setContract(json.data)
        // Auto-open send modal if ?send=true
        if (searchParams.get('send') === 'true') {
          setShowSendModal(true)
        }
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, searchParams])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 size={28} className="text-primary animate-spin" />
        <span className="ml-3 text-sm text-muted-foreground">Se încarcă contractul...</span>
      </div>
    )
  }

  if (error || !contract) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <CreditCard size={32} className="text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-lg font-semibold text-foreground mb-2">Contract negăsit</p>
          <p className="text-sm text-muted-foreground mb-4">ID-ul „{id}" nu există.</p>
          <button onClick={() => router.back()} className="text-primary text-sm hover:underline">← Înapoi</button>
        </div>
      </div>
    )
  }

  const sc = statusConfig[contract.status] || { label: contract.status, color: "text-muted-foreground", bg: "bg-muted", icon: FileText }
  const StatusIcon = sc.icon
  const sections: any[] = contract.sections || []
  const anexa2 = contract.anexa2 || {}
  const companyDetails = contract.companyDetails || {}
  const clientDetails = contract.clientDetails || {}
  const linkedOffers = (contract as any).linkedOffers || []

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      next.has(sectionId) ? next.delete(sectionId) : next.add(sectionId)
      return next
    })
  }

  return (
    <div id="contract-page" className="p-4 md:p-6 space-y-5 animate-fade-in max-w-5xl mx-auto">
      {/* Print styles */}
      <style>{`
        @media print {
          @page { margin: 15mm 12mm; }
          html, body { background: white !important; overflow: visible !important; height: auto !important; }
          nav, aside, header, .print-hide { display: none !important; }
          div, main, section { overflow: visible !important; height: auto !important; max-height: none !important; }
          #contract-page { display: block !important; min-height: 0 !important; background: white !important; padding: 0 !important; max-width: none !important; }
          #contract-page, #contract-page * { color: #1f2937 !important; background: transparent !important; box-shadow: none !important; }
          #contract-page h1, #contract-page h2, #contract-page h3, #contract-page strong, #contract-page b { color: #111827 !important; }
          #contract-page [class*="text-muted"] { color: #6b7280 !important; }
          /* Remove ALL borders from contract sections on print */
          #contract-page .contract-section-card { border: none !important; box-shadow: none !important; background: transparent !important; border-radius: 0 !important; }
          #contract-page .contract-section-card button { display: none !important; }
          #contract-page .contract-section-card .contract-section-title { display: block !important; }
          #contract-page .contract-section-card .contract-section-content { display: block !important; border: none !important; }
          #contract-page [class*="rounded"] { border-radius: 0 !important; }
          #contract-page [class*="bg-surface"], #contract-page [class*="bg-muted"] { background: transparent !important; }
          /* Print header & logo */
          #print-contract-header { display: block !important; }
          #print-contract-header * { color: #1f2937 !important; }
          #print-contract-header img { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; display: block !important; visibility: visible !important; }
          #print-contract-header .print-separator { background: #2563eb !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          #print-contract-header .print-pill { background: #f3f4f6 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .contract-section { page-break-inside: avoid; }
          h2, h3 { page-break-after: avoid; }
          #contract-signatures { page-break-inside: avoid !important; }
        }
      `}</style>
      {/* Header */}
      <div className="flex items-center justify-between print-hide">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={15} /> Înapoi
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              // Expand all sections before print
              setExpandedSections(new Set(sections.map((s: any) => s.id)))
              setActiveView('contract')
              setTimeout(() => window.print(), 300)
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
          >
            <Printer size={12} /> Print / PDF
          </button>
          <button
            onClick={() => setShowSendModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Send size={12} /> Trimite pe Email
          </button>
          <button
            onClick={() => {
              if (editMode) {
                // Cancel edit mode
                setEditMode(false)
                setEditedSections({})
              } else {
                // Enter edit mode
                setExpandedSections(new Set(sections.map((s: any) => s.id)))
                setActiveView('contract')
                const initial: Record<string, string> = {}
                const initialTitles: Record<string, string> = {}
                sections.forEach((s: any) => { initial[s.id] = s.content || ''; initialTitles[s.id] = s.title || '' })
                setEditedSections(initial)
                setEditedTitles(initialTitles)
                setEditMode(true)
              }
            }}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors",
              editMode
                ? "bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            )}
          >
            <Edit size={12} /> {editMode ? 'Anulează Editarea' : 'Editează'}
          </button>
          <button 
            onClick={async () => {
              if (!confirm(`Sigur vrei să ștergi contractul ${contract.number}? Această acțiune nu poate fi anulată.`)) return
              try {
                const res = await fetch(`/api/contracts/${contract.id}`, { method: 'DELETE' })
                if (res.ok) {
                  router.push('/contracts')
                } else {
                  const json = await res.json()
                  alert(json.error || 'Eroare la ștergere')
                }
              } catch {
                alert('Eroare de rețea')
              }
            }}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-red-500/30 hover:bg-red-500/10 transition-colors group"
            title="Șterge contractul"
          >
            <Trash2 size={14} className="text-muted-foreground group-hover:text-red-400 transition-colors" />
          </button>
        </div>
      </div>

      {/* Contract Header Card (screen only) */}
      <div className="bg-surface rounded-2xl border border-border p-5 print-hide">
        <div className="flex items-start gap-4">
          <div className={cn("w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0", sc.bg)}>
            <StatusIcon size={24} className={sc.color} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h1 className="text-xl font-bold text-foreground">{contract.number}</h1>
              <span className={cn("px-2.5 py-0.5 text-[10px] font-bold rounded-full uppercase", sc.bg, sc.color)}>{sc.label}</span>
              {contract.businessLine && (
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-muted text-muted-foreground">
                  {contract.businessLine.name}
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 mt-2 flex-wrap text-xs text-muted-foreground">
              {contract.client && (
                <Link href={`/crm/clienti/${contract.client.id}`} className="flex items-center gap-1 hover:text-primary transition-colors">
                  <Building2 size={12} /> {contract.client.companyName}
                </Link>
              )}
              {contract.offer && (
                <Link href={`/offers/${contract.offer.id}`} className="flex items-center gap-1 hover:text-primary transition-colors">
                  <FileText size={12} /> Din oferta {contract.offer.number}
                </Link>
              )}
              <span className="flex items-center gap-1"><Calendar size={12} />
                {editMode ? (
                  <span className="flex items-center gap-1.5 flex-wrap">
                    <input
                      type="date"
                      value={contract.startDate?.slice(0, 10) || ''}
                      onChange={async (e) => {
                        const newDate = e.target.value
                        if (!newDate) return
                        try {
                          const res = await fetch(`/api/contracts/${id}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ startDate: new Date(newDate).toISOString() }),
                          })
                          if (res.ok) {
                            const json = await res.json()
                            setContract(json.data)
                          }
                        } catch (err) { console.error(err) }
                      }}
                      className="px-2 py-0.5 text-xs bg-muted/50 border border-border rounded text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
                    />
                    {contract.duration === 0 ? (
                      <span className="text-xs text-amber-400 font-medium">perioadă nedeterminată</span>
                    ) : (
                      <>
                        <span>—</span>
                        <input
                          type="date"
                          value={contract.endDate?.slice(0, 10) || ''}
                          onChange={async (e) => {
                            const newDate = e.target.value
                            if (!newDate) return
                            const start = new Date(contract.startDate)
                            const end = new Date(newDate)
                            const months = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30))
                            try {
                              const res = await fetch(`/api/contracts/${id}`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ endDate: new Date(newDate).toISOString(), duration: Math.max(1, months) }),
                              })
                              if (res.ok) {
                                const json = await res.json()
                                setContract(json.data)
                              }
                            } catch (err) { console.error(err) }
                          }}
                          className="px-2 py-0.5 text-xs bg-muted/50 border border-border rounded text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
                        />
                      </>
                    )}
                    <label className="flex items-center gap-1 cursor-pointer ml-1">
                      <input
                        type="checkbox"
                        checked={contract.duration === 0}
                        onChange={async (e) => {
                          const unlimited = e.target.checked
                          try {
                            const patchData = unlimited
                              ? { duration: 0, endDate: new Date('2099-12-31').toISOString() }
                              : { duration: 12, endDate: new Date(new Date(contract.startDate).getTime() + 365 * 24 * 60 * 60 * 1000).toISOString() }
                            const res = await fetch(`/api/contracts/${id}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify(patchData),
                            })
                            if (res.ok) {
                              const json = await res.json()
                              setContract(json.data)
                            }
                          } catch (err) { console.error(err) }
                        }}
                        className="w-3 h-3 rounded accent-amber-500"
                      />
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">Nedeterminată</span>
                    </label>
                  </span>
                ) : (
                  contract.duration === 0
                    ? <>începând de la {formatDate(contract.startDate)} pe o perioadă nedeterminată</>
                    : <>{formatDate(contract.startDate)} — {formatDate(contract.endDate)}</>
                )}
              </span>
              {contract.signedAt && <span className="flex items-center gap-1 text-emerald-400"><CheckCircle2 size={12} /> Semnat: {formatDate(contract.signedAt)}</span>}
            </div>
          </div>
          <div className="text-right">
            {!editingPrice ? (
              <>
                <button
                  onClick={() => { setEditingPrice(true); setManualValue(String(contract.value)); setAutoPrice(false) }}
                  className="text-2xl font-bold text-foreground hover:text-primary transition-colors cursor-pointer group/price"
                  title="Click pentru a edita prețul"
                >
                  {contract.value} {contract.currency}
                  <Edit size={12} className="inline ml-1.5 opacity-0 group-hover/price:opacity-50 transition-opacity" />
                </button>
                <p className="text-xs text-muted-foreground">{contract.duration === 0 ? 'perioadă nedeterminată' : `${contract.duration} luni`}</p>
              </>
            ) : (
              <div className="bg-surface border border-border rounded-xl p-3 space-y-2.5 min-w-[220px] shadow-lg">
                {/* Auto / Manual toggle */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoPrice}
                    onChange={(e) => {
                      setAutoPrice(e.target.checked)
                      if (e.target.checked) {
                        const offersTotal = linkedOffers.reduce((s: number, o: any) => s + o.value, 0)
                        setManualValue(String(offersTotal))
                      }
                    }}
                    className="w-3.5 h-3.5 rounded accent-primary"
                  />
                  <span className="text-[11px] text-muted-foreground">Preia din oferte ({linkedOffers.reduce((s: number, o: any) => s + o.value, 0)} {contract.currency})</span>
                </label>

                {/* Price input */}
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    value={manualValue}
                    onChange={(e) => { setManualValue(e.target.value); setAutoPrice(false) }}
                    disabled={autoPrice}
                    className="w-24 px-2 py-1.5 text-sm font-bold bg-background border border-border rounded-lg text-foreground text-right focus:outline-none focus:border-primary disabled:opacity-50"
                  />
                  <span className="text-xs text-muted-foreground font-medium">{contract.currency}</span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 pt-0.5">
                  <button
                    onClick={() => setEditingPrice(false)}
                    className="flex-1 px-2 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors"
                  >
                    Anulează
                  </button>
                  <button
                    disabled={savingPrice}
                    onClick={async () => {
                      setSavingPrice(true)
                      try {
                        await fetch(`/api/contracts/${id}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ value: parseFloat(manualValue) || 0 }),
                        })
                        const res = await fetch(`/api/contracts/${id}`)
                        const json = await res.json()
                        setContract(json.data)
                        setEditingPrice(false)
                      } catch (err) {
                        console.error('Failed to save price:', err)
                      } finally {
                        setSavingPrice(false)
                      }
                    }}
                    className="flex-1 px-2 py-1.5 text-[11px] font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {savingPrice ? 'Salvare...' : 'Salvează'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── PRINT HEADER (hidden on screen, visible on print) ── */}
      <div id="print-contract-header" className="hidden print:block">
        <div className="border-b-2 border-gray-200">
          <div className="flex items-center justify-between px-2 pt-4 pb-3">
            <div className="flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/asns-logo-black.png" alt="ASNS" width={130} height={40} style={{ maxHeight: 40, objectFit: 'contain' }} />
              <div>
                <p className="text-sm font-bold">{companyDetails.legalName || companyDetails.name || 'ADVANCED SYSTEMS & NETWORK SOLUTIONS SRL'}</p>
                <p className="text-[10px] text-gray-500">CIF: {companyDetails.cif} • {companyDetails.regCom}</p>
                <p className="text-[10px] text-gray-500">{companyDetails.address}</p>
              </div>
            </div>
            <div className="text-right">
              {companyDetails.iban && <p className="text-[10px] text-gray-500">IBAN: {companyDetails.iban}</p>}
              {companyDetails.bank && <p className="text-[10px] text-gray-500">{companyDetails.bank}</p>}
            </div>
          </div>
          <div className="mx-2 h-[2px] print-separator" style={{ backgroundColor: '#2563eb' }} />
          <div className="py-5 text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-400 mb-1">— Contract —</p>
            <h1 className="text-xl font-bold tracking-tight uppercase">Contract de Prestări Servicii</h1>
            <div className="mt-2 inline-flex items-center gap-3 px-4 py-1.5 print-pill rounded-full text-[10px] text-gray-500 font-medium" style={{ backgroundColor: '#f3f4f6' }}>
              <span>Nr. <strong className="text-gray-800">{contract.number}</strong> / {formatDate(contract.startDate)}</span>
              <span className="w-1 h-1 rounded-full bg-gray-300" />
              {contract.offer && <span>Ref. Ofertă: {contract.offer.number}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Parties Strip (hidden on print - print header has company info) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 print-hide">
        {/* Company */}
        <div className="bg-surface rounded-xl border border-border p-4">
          <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider mb-2">Prestator</p>
          <p className="text-sm font-semibold text-foreground">{companyDetails.legalName || companyDetails.name || "ASNS"}</p>
          <div className="mt-2 space-y-1 text-[11px] text-muted-foreground">
            {companyDetails.cif && <p>CIF: {companyDetails.cif}</p>}
            {companyDetails.regCom && <p>Reg. Com: {companyDetails.regCom}</p>}
            {companyDetails.address && <p>{companyDetails.address}</p>}
            {companyDetails.iban && <p>IBAN: {companyDetails.iban}</p>}
          </div>
        </div>
        {/* Client */}
        <div className="bg-surface rounded-xl border border-border p-4">
          <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider mb-2">Beneficiar</p>
          <p className="text-sm font-semibold text-foreground">{clientDetails.legalName || "—"}</p>
          <div className="mt-2 space-y-1 text-[11px] text-muted-foreground">
            {clientDetails.cif && <p>CIF: {clientDetails.cif}</p>}
            {clientDetails.regCom && <p>Reg. Com: {clientDetails.regCom}</p>}
            {clientDetails.address && <p>{clientDetails.address}</p>}
            {clientDetails.representative && <p>Reprezentant: {clientDetails.representative} ({clientDetails.representativeRole})</p>}
          </div>
        </div>
      </div>

      {/* View Switcher */}
      <div className="flex items-center gap-1 border-b border-border print-hide">
        {[
          { key: "contract" as const, label: "Articole Contract", icon: FileText },
          { key: "oferte" as const, label: `Oferte Anexate (${linkedOffers.length})`, icon: FileText },
          { key: "anexa2" as const, label: "Anexa 2 (SoW)", icon: CreditCard },
        ].map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.key}
              onClick={() => setActiveView(tab.key)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-all",
                activeView === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon size={13} /> {tab.label}
            </button>
          )
        })}
      </div>

      {/* Contract Sections */}
      {activeView === "contract" && (
        <>
        {/* Save bar when in edit mode */}
        {editMode && (
          <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-xl px-4 py-3 animate-fade-in">
            <div className="flex items-center gap-2">
              <Edit size={14} className="text-primary" />
              <span className="text-sm font-medium text-foreground">Mod editare activ</span>
              <span className="text-[10px] text-muted-foreground">— modifică textul secțiunilor și apasă Salvează</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setEditMode(false); setEditedSections({}) }}
                className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground bg-muted rounded-lg transition-colors"
              >
                Anulează
              </button>
              <button
                disabled={savingSections}
                onClick={async () => {
                  setSavingSections(true)
                  try {
                    const updatedSections = sections.map((s: any) => ({
                      ...s,
                      title: editedTitles[s.id] ?? s.title,
                      content: editedSections[s.id] ?? s.content,
                    }))
                    const patchBody: any = { sections: updatedSections }
                    if (editedAnexa2) {
                      patchBody.anexa2 = editedAnexa2
                    }
                    const res = await fetch(`/api/contracts/${id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(patchBody),
                    })
                    if (res.ok) {
                      const json = await res.json()
                      setContract(json.data)
                      setEditMode(false)
                      setEditedSections({})
                      setEditedTitles({})
                      setEditedAnexa2(null)
                    }
                  } catch (err) {
                    console.error('Failed to save sections:', err)
                  } finally {
                    setSavingSections(false)
                  }
                }}
                className="px-4 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                {savingSections ? (
                  <><Loader2 size={12} className="animate-spin" /> Se salvează...</>
                ) : (
                  <><CheckCircle2 size={12} /> Salvează Modificările</>
                )}
              </button>
            </div>
          </div>
        )}
        <div className="space-y-2">
          {sections.map((section: any, sectionIdx: number) => {
            const isExpanded = expandedSections.has(section.id)
            return (
              <div key={section.id}>
                <div className={cn(
                  "contract-section-card bg-surface rounded-xl border overflow-hidden",
                  editMode ? "border-primary/30" : "border-border"
                )}>
                  <button
                    onClick={() => toggleSection(section.id)}
                    className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-muted/20 transition-colors"
                  >
                    {isExpanded ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronRight size={14} className="text-muted-foreground" />}
                    {editMode ? (
                      <input
                        type="text"
                        value={editedTitles[section.id] ?? section.title}
                        onChange={(e) => setEditedTitles(prev => ({ ...prev, [section.id]: e.target.value }))}
                        onClick={(e) => e.stopPropagation()}
                        className="text-sm font-semibold text-foreground bg-transparent border-b border-dashed border-primary/40 focus:outline-none focus:border-primary px-0 py-0 w-full"
                      />
                    ) : (
                      <span className="text-sm font-semibold text-foreground">{section.title}</span>
                    )}
                    {editMode && <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full ml-auto flex-shrink-0">✎ Editabil</span>}
                    {!editMode && section.editable && <span className="text-[9px] text-primary bg-primary/10 px-1.5 py-0.5 rounded-full ml-auto print-hide">Editabil</span>}
                  </button>
                  {/* Always render content for print, conditionally show on screen */}
                  <div className={cn("contract-section-content px-4 pb-4 pt-1 border-t border-border/30", !isExpanded && "hidden")}>
                    <h3 className="contract-section-title hidden text-sm font-bold text-foreground mb-2 uppercase">{section.title}</h3>
                    {editMode ? (
                      <div className="space-y-2">
                        <textarea
                          value={editedSections[section.id] ?? section.content ?? ''}
                          onChange={(e) => setEditedSections(prev => ({ ...prev, [section.id]: e.target.value }))}
                          className="w-full min-h-[200px] text-sm text-foreground/80 leading-relaxed bg-muted/30 border border-border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y font-mono"
                        />
                        <button
                          onClick={() => {
                            const updatedSections = [...sections]
                            updatedSections.splice(sectionIdx, 1)
                            setContract({ ...contract, sections: updatedSections })
                          }}
                          className="text-[10px] text-red-400 hover:text-red-300 transition-colors"
                        >
                          ✕ Șterge secțiunea
                        </button>
                      </div>
                    ) : (
                      <div className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                        {section.content?.split("**").map((part: string, i: number) =>
                          i % 2 === 1 ? <strong key={i}>{part}</strong> : <span key={i}>{part}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                {/* Add section button */}
                {editMode && (
                  <div className="flex justify-center py-1">
                    <button
                      onClick={() => {
                        const newId = `art-custom-${Date.now()}`
                        const newSection = {
                          id: newId,
                          title: `Art. ${sectionIdx + 2} — Secțiune Nouă`,
                          content: '',
                          editable: true,
                        }
                        const updatedSections = [...sections]
                        updatedSections.splice(sectionIdx + 1, 0, newSection)
                        setContract({ ...contract, sections: updatedSections })
                        setEditedSections(prev => ({ ...prev, [newId]: '' }))
                        setEditedTitles(prev => ({ ...prev, [newId]: newSection.title }))
                        setExpandedSections(prev => { const next = new Set(prev); next.add(newId); return next })
                      }}
                      className="text-[10px] text-primary/60 hover:text-primary transition-colors flex items-center gap-1 px-2 py-0.5 rounded hover:bg-primary/5"
                    >
                      + Adaugă secțiune
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* ── SIGNATURE BLOCK ── */}
        <div id="contract-signatures" className="bg-surface rounded-xl border border-border px-6 py-6 mt-4">
          <p className="text-[10px] text-muted-foreground text-center mb-6 uppercase tracking-wider font-semibold">
            Încheiat astăzi, {formatDate(contract.startDate)}, în două exemplare, câte unul pentru fiecare parte.
          </p>
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">PRESTATOR</p>
              <div className="space-y-1">
                <p className="text-sm font-bold text-foreground">{companyDetails.legalName || companyDetails.name || 'ADVANCED SYSTEMS & NETWORK SOLUTIONS SRL'}</p>
                <p className="text-xs text-muted-foreground">CIF: {companyDetails.cif}</p>
                <p className="text-xs text-muted-foreground">Prin: {companyDetails.representative || 'Administrator'}</p>
              </div>
              <div className="pt-8 border-b border-border/50 w-48" />
              <p className="text-[10px] text-muted-foreground italic">Semnătura</p>
            </div>
            <div className="space-y-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">BENEFICIAR</p>
              <div className="space-y-1">
                <p className="text-sm font-bold text-foreground">{clientDetails.legalName || '—'}</p>
                <p className="text-xs text-muted-foreground">CIF: {clientDetails.cif}</p>
                <p className="text-xs text-muted-foreground">Prin: {clientDetails.representative || '—'}, {clientDetails.representativeRole || 'Administrator'}</p>
              </div>
              <div className="pt-8 border-b border-border/50 w-48" />
              <p className="text-[10px] text-muted-foreground italic">Semnătura</p>
            </div>
          </div>
          <p className="text-[9px] text-muted-foreground text-center mt-6 italic">
            Conform O.U.G. nr. 17/2015 privind eliminarea obligativității utilizării ștampilei, prezentul contract nu necesită aplicarea ștampilei pentru a fi valid din punct de vedere juridic.
          </p>
        </div>

        {/* ── ANEXA 1 — OFERTA COMERCIALĂ ── */}
        {(contract.offer || linkedOffers.length > 0) && (
          <div id="contract-anexa1" className="space-y-4 mt-6">
            <div className="text-center py-4 border-b-2 border-border">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">— Anexa 1 la Contractul nr. {contract.number} —</p>
              <h2 className="text-lg font-bold text-foreground">OFERTE COMERCIALE ANEXATE</h2>
              {contract.offer && <p className="text-xs text-muted-foreground mt-1">Oferta principală: {contract.offer.number}</p>}
            </div>

            {/* Render each offer with full details */}
            {[
              ...(contract.offer ? [{ ...contract.offer, _isPrimary: true }] : []),
              ...linkedOffers.filter((o: any) => o.id !== contract.offer?.id).map((o: any) => ({ ...o, _isPrimary: false })),
            ].map((offer: any, idx: number) => {
              const blocks = Array.isArray(offer.blocks) ? offer.blocks : []
              const servicesBlock = blocks.find((b: any) => b.type === 'services')
              const pricingBlock = blocks.find((b: any) => b.type === 'pricing')
              const services = servicesBlock?.data?.services || []
              const pricingLines = pricingBlock?.data?.lines || []
              const hasDetails = services.length > 0 || pricingLines.length > 0
              return (
                <div key={offer.id} className="bg-surface rounded-xl border border-border overflow-hidden">
                  {/* Offer header */}
                  <div className={cn("px-4 py-3 border-b border-border flex items-center justify-between", offer._isPrimary ? "bg-primary/5" : "bg-muted/20")}>
                    <div className="flex items-center gap-3">
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0", offer._isPrimary ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                        {offer._isPrimary ? "★" : `A${idx}`}
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">
                          {offer._isPrimary ? "Oferta principală" : `Anexa adițională ${idx}`} — {offer.number}
                        </h3>
                        <p className="text-[10px] text-muted-foreground">{offer.templateName}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-foreground">{offer.value} {offer.currency}</p>
                      <p className="text-[10px] text-muted-foreground capitalize">{offer.status?.replace('_', ' ')}</p>
                    </div>
                  </div>

                  <div className="p-4 space-y-4">
                    {/* Service & pricing breakdown from blocks */}
                    {hasDetails ? (
                      <>
                        {/* Services table */}
                        {services.length > 0 && (
                          <div className="space-y-3">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Servicii incluse</p>
                            {services.map((svc: any, si: number) => (
                              <div key={si} className="pl-3 border-l-2 border-primary/20">
                                <p className="text-sm font-semibold text-foreground">{svc.title}</p>
                                {svc.description && (
                                  <p className="text-[11px] text-muted-foreground mt-0.5">{svc.description}</p>
                                )}
                                {svc.features?.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 mt-2">
                                    {svc.features.map((f: string, fi: number) => (
                                      <span key={fi} className="text-[10px] px-2 py-0.5 bg-primary/5 border border-primary/10 text-foreground rounded-md">
                                        {f}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Pricing lines */}
                        {pricingLines.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-border/30">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Detalierea investiției</p>
                            <table className="w-full">
                              <thead>
                                <tr className="text-[10px] font-semibold text-muted-foreground uppercase border-b border-border/50">
                                  <th className="px-3 py-2 text-left w-8">Nr.</th>
                                  <th className="px-3 py-2 text-left">Descriere</th>
                                  <th className="px-3 py-2 text-right">Sumă</th>
                                </tr>
                              </thead>
                              <tbody>
                                {pricingLines.map((line: any, li: number) => (
                                  <tr key={li} className="border-b border-border/30">
                                    <td className="px-3 py-2.5 text-xs text-muted-foreground text-center font-mono">{li + 1}</td>
                                    <td className="px-3 py-2.5 text-sm text-foreground">{line.label}</td>
                                    <td className="px-3 py-2.5 text-sm font-bold text-foreground text-right">
                                      {line.amount > 0 ? `${line.amount} ${pricingBlock?.data?.currency || offer.currency}` : (
                                        <span className="text-emerald-400 text-xs font-bold">INCLUS</span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot>
                                <tr className="bg-muted/10">
                                  <td colSpan={2} className="px-3 py-2.5 text-xs font-bold text-foreground text-right">TOTAL</td>
                                  <td className="px-3 py-2.5 text-sm font-bold text-foreground text-right">
                                    {offer.value} {offer.currency}
                                    {pricingBlock?.data?.note && (
                                      <p className="text-[9px] font-normal text-muted-foreground mt-0.5">{pricingBlock.data.note}</p>
                                    )}
                                  </td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        )}
                      </>
                    ) : (
                      /* Fallback: no blocks — show simple summary */
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Nr. Ofertă</p>
                          <p className="text-sm font-semibold text-foreground">{offer.number}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Serviciu</p>
                          <p className="text-sm font-medium text-foreground">{offer.templateName}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Valoare</p>
                          <p className="text-sm font-bold text-foreground">{offer.value} {offer.currency}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Status</p>
                          <p className="text-sm font-medium text-emerald-400 capitalize">{offer.status?.replace('_', ' ')}</p>
                        </div>
                      </div>
                    )}

                    {/* Legal text */}
                    <div className="pt-3 border-t border-border/30">
                      <p className="text-xs text-muted-foreground">
                        Oferta comercială nr. <strong className="text-foreground">{offer.number}</strong>
                        {offer.templateName && <> pentru serviciul &bdquo;<strong className="text-foreground">{offer.templateName}</strong>&ldquo;</>}
                        {' '}în valoare de <strong className="text-foreground">{offer.value} {offer.currency}</strong> face parte integrantă din prezentul contract
                        {offer._isPrimary ? ' și constituie Anexa 1.' : '.'}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Total all offers */}
            {linkedOffers.length > 0 && (
              <div className="bg-muted/20 rounded-xl border border-border/50 p-4 flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Valoare totală oferte anexate</span>
                <span className="text-lg font-bold text-foreground">
                  {linkedOffers.reduce((s: number, o: any) => s + o.value, 0)} {linkedOffers[0]?.currency || 'EUR'}
                </span>
              </div>
            )}
          </div>
        )}
        </>
      )}

      {/* Oferte Anexate */}
      {activeView === "oferte" && (
        <div className="space-y-3">
          {/* Attach offer button & picker */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">{linkedOffers.length} ofert{linkedOffers.length === 1 ? 'ă' : 'e'} anexat{linkedOffers.length === 1 ? 'ă' : 'e'}</p>
            <button
              onClick={async () => {
                if (showAttachPicker) { setShowAttachPicker(false); return }
                setShowAttachPicker(true)
                setLoadingAvailable(true)
                try {
                  const res = await fetch(`/api/offers?businessLine=${contract.businessLine?.slug || ''}&limit=50`)
                  const json = await res.json()
                  const all = json.data || json.offers || []
                  // Filter: exclude offers already linked to this client
                  const existing = new Set(linkedOffers.map((o: any) => o.id))
                  setAvailableOffers(all.filter((o: any) => !existing.has(o.id)))
                } catch (err) {
                  console.error('Failed to load available offers:', err)
                } finally {
                  setLoadingAvailable(false)
                }
              }}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all",
                showAttachPicker
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "border-border hover:border-primary/30 hover:bg-primary/5 text-muted-foreground hover:text-foreground"
              )}
            >
              {showAttachPicker ? '✕ Închide' : '+ Atașează Ofertă'}
            </button>
          </div>

          {/* Attach picker */}
          {showAttachPicker && (
            <div className="bg-surface rounded-xl border border-primary/20 overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-primary/5">
                <input
                  type="text"
                  placeholder="Caută oferte (nr, nume, template)..."
                  value={attachSearch}
                  onChange={(e) => setAttachSearch(e.target.value)}
                  className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 outline-none"
                  autoFocus
                />
              </div>
              <div className="max-h-[280px] overflow-y-auto">
                {loadingAvailable ? (
                  <div className="p-4 text-center text-xs text-muted-foreground">Se încarcă ofertele...</div>
                ) : availableOffers.filter((o: any) => {
                  if (!attachSearch.trim()) return true
                  const q = attachSearch.toLowerCase()
                  return (o.number?.toLowerCase().includes(q) || o.entityName?.toLowerCase().includes(q) || o.templateName?.toLowerCase().includes(q))
                }).length === 0 ? (
                  <div className="p-4 text-center text-xs text-muted-foreground">Nicio ofertă disponibilă.</div>
                ) : availableOffers.filter((o: any) => {
                  if (!attachSearch.trim()) return true
                  const q = attachSearch.toLowerCase()
                  return (o.number?.toLowerCase().includes(q) || o.entityName?.toLowerCase().includes(q) || o.templateName?.toLowerCase().includes(q))
                }).map((offer: any) => (
                  <div key={offer.id} className="flex items-center justify-between px-4 py-3 border-b border-border/30 hover:bg-muted/10 transition-colors">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">{offer.number}</p>
                        <span className="text-[10px] text-muted-foreground capitalize px-1.5 py-0.5 bg-muted rounded-full">{offer.status?.replace('_', ' ')}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {offer.entityName || offer.templateName} — {offer.value} {offer.currency}
                      </p>
                    </div>
                    <button
                      disabled={attaching === offer.id}
                      onClick={async () => {
                        setAttaching(offer.id)
                        try {
                          await fetch(`/api/offers/${offer.id}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ clientId: contract.client?.id }),
                          })
                          // Reload contract data
                          const res = await fetch(`/api/contracts/${id}`)
                          const json = await res.json()
                          setContract(json.data)
                          // Remove from available
                          setAvailableOffers(prev => prev.filter(o => o.id !== offer.id))
                        } catch (err) {
                          console.error('Failed to attach offer:', err)
                        } finally {
                          setAttaching(null)
                        }
                      }}
                      className="flex-shrink-0 ml-3 px-3 py-1.5 text-[11px] font-medium bg-primary/10 text-primary border border-primary/20 rounded-lg hover:bg-primary/20 transition-all disabled:opacity-50"
                    >
                      {attaching === offer.id ? 'Se atașează...' : '+ Atașează'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {linkedOffers.length === 0 && !showAttachPicker ? (
            <div className="bg-surface rounded-xl border border-border p-8 text-center">
              <FileText size={24} className="text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">Nicio ofertă anexată la acest contract.</p>
            </div>
          ) : linkedOffers.map((offer: any, i: number) => {
            const isConfirming = confirmDetachId === offer.id
            return (
              <div key={offer.id} className={cn(
                "bg-surface rounded-xl border overflow-hidden transition-all",
                isConfirming ? "border-red-500/40" : "border-border hover:border-primary/30"
              )}>
                {/* Main row */}
                <div className="flex items-center justify-between p-4">
                  <Link href={`/offers/${offer.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
                      A{i + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground hover:text-primary transition-colors">{offer.number}</p>
                        <span className={cn("text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full",
                          offer.status === 'contract_generat' ? 'text-violet-400 bg-violet-500/10' :
                          offer.status === 'acceptata' ? 'text-emerald-400 bg-emerald-500/10' :
                          offer.status === 'trimisa' ? 'text-blue-400 bg-blue-500/10' :
                          'text-amber-400 bg-amber-500/10'
                        )}>{offer.status?.replace('_', ' ')}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{offer.templateName}</p>
                    </div>
                  </Link>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-lg font-bold text-foreground">{offer.value} {offer.currency}</p>
                      <p className="text-[10px] text-muted-foreground">Creat: {formatDate(offer.createdAt)}</p>
                    </div>
                    <button
                      onClick={() => setConfirmDetachId(isConfirming ? null : offer.id)}
                      className={cn(
                        "w-8 h-8 flex items-center justify-center rounded-lg border transition-all text-sm",
                        isConfirming
                          ? "bg-red-500/10 border-red-500/30 text-red-400"
                          : "border-border hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 text-muted-foreground"
                      )}
                      title="Detașează oferta din contract"
                    >
                      ×
                    </button>
                  </div>
                </div>

                {/* Inline confirmation bar */}
                {isConfirming && (
                  <div className="flex items-center justify-between px-4 py-2.5 bg-red-500/5 border-t border-red-500/20 animate-fade-in">
                    <p className="text-xs text-red-400">
                      Detașezi <strong>{offer.number}</strong> din acest contract?
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setConfirmDetachId(null)}
                        className="px-3 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors"
                      >
                        Anulează
                      </button>
                      <button
                        disabled={detaching}
                        onClick={async () => {
                          setDetaching(true)
                          try {
                            await fetch(`/api/offers/${offer.id}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ clientId: null }),
                            })
                            setConfirmDetachId(null)
                            // Reload
                            const res = await fetch(`/api/contracts/${id}`)
                            const json = await res.json()
                            setContract(json.data)
                          } catch (err) {
                            console.error('Failed to detach:', err)
                          } finally {
                            setDetaching(false)
                          }
                        }}
                        className="px-3 py-1 text-[11px] font-medium bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
                      >
                        {detaching ? "Se detașează..." : "Detașează"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
          <div className="bg-muted/20 rounded-xl border border-border/50 p-3 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Total valoare oferte anexate</span>
            <span className="text-sm font-bold text-foreground">
              {linkedOffers.reduce((s: number, o: any) => s + o.value, 0)} {linkedOffers[0]?.currency || 'EUR'}
            </span>
          </div>
        </div>
      )}

      {/* Anexa 2 — shown under both contract tab and its own tab */}
      {(activeView === "contract" || activeView === "anexa2") && anexa2.deliverables?.length > 0 && (
        <div id="contract-anexa2" className="space-y-5 mt-6">
          {/* Anexa 2 Header */}
          <div className="text-center py-4 border-b-2 border-border">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">— Anexa 2 la Contractul nr. {contract.number} —</p>
            <h2 className="text-lg font-bold text-foreground">LISTA SERVICIILOR DETALIATE ȘI LIVRABILELE AGREATE</h2>
            <p className="text-xs text-muted-foreground mt-1">(Statement of Work)</p>
          </div>

          {/* Deliverables */}
          <div className="bg-surface rounded-xl border border-border overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-muted/20 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">A. Servicii și Livrabile Agreate</h3>
              {editMode && <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">✎ Editabil</span>}
            </div>
            <table className="w-full">
              <thead>
                <tr className="text-[10px] font-semibold text-muted-foreground uppercase border-b border-border/50">
                  <th className="px-4 py-2 text-left w-8">Nr.</th>
                  <th className="px-4 py-2 text-left">Serviciu / Livrabil</th>
                  <th className="px-4 py-2 text-left">Frecvență</th>
                  <th className="px-4 py-2 text-left">KPI / Indicator</th>
                  {editMode && <th className="px-4 py-2 text-center w-10"></th>}
                </tr>
              </thead>
              <tbody>
                {(editMode ? (editedAnexa2?.deliverables || anexa2.deliverables) : anexa2.deliverables).map((d: any, i: number) => (
                  <tr key={d.id || i} className="border-b border-border/30 hover:bg-muted/10">
                    <td className="px-4 py-2.5 text-xs text-muted-foreground text-center font-mono">{i + 1}</td>
                    <td className="px-4 py-2.5">
                      {editMode ? (
                        <input value={d.service} onChange={e => {
                          const next = { ...(editedAnexa2 || anexa2) }
                          next.deliverables = [...next.deliverables]
                          next.deliverables[i] = { ...next.deliverables[i], service: e.target.value }
                          setEditedAnexa2(next)
                        }} className="w-full px-2 py-1 text-sm bg-muted/30 border border-border rounded text-foreground" />
                      ) : <span className="text-sm font-medium text-foreground">{d.service}</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      {editMode ? (
                        <input value={d.frequency} onChange={e => {
                          const next = { ...(editedAnexa2 || anexa2) }
                          next.deliverables = [...next.deliverables]
                          next.deliverables[i] = { ...next.deliverables[i], frequency: e.target.value }
                          setEditedAnexa2(next)
                        }} className="w-full px-2 py-1 text-xs bg-muted/30 border border-border rounded text-foreground" />
                      ) : <span className="text-xs text-muted-foreground capitalize">{d.frequency}</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      {editMode ? (
                        <input value={d.kpi} onChange={e => {
                          const next = { ...(editedAnexa2 || anexa2) }
                          next.deliverables = [...next.deliverables]
                          next.deliverables[i] = { ...next.deliverables[i], kpi: e.target.value }
                          setEditedAnexa2(next)
                        }} className="w-full px-2 py-1 text-xs bg-muted/30 border border-border rounded text-foreground" />
                      ) : <span className="text-xs text-muted-foreground">{d.kpi}</span>}
                    </td>
                    {editMode && (
                      <td className="px-2 py-2.5 text-center">
                        <button onClick={() => {
                          const next = { ...(editedAnexa2 || anexa2) }
                          next.deliverables = next.deliverables.filter((_: any, j: number) => j !== i)
                          setEditedAnexa2(next)
                        }} className="text-red-400 hover:text-red-300 text-xs">✕</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {editMode && (
              <div className="px-4 py-2 border-t border-border/30">
                <button onClick={() => {
                  const next = { ...(editedAnexa2 || anexa2) }
                  next.deliverables = [...next.deliverables, { id: `del-${Date.now()}`, service: '', frequency: 'lunar', kpi: '' }]
                  setEditedAnexa2(next)
                }} className="text-xs text-primary hover:text-primary/80 font-medium">+ Adaugă Livrabil</button>
              </div>
            )}
          </div>

          {/* Phases */}
          {((editMode ? (editedAnexa2?.phases || anexa2.phases) : anexa2.phases)?.length > 0) && (
            <div className="bg-surface rounded-xl border border-border p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground">B. Faze de Implementare</h3>
                {editMode && <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">✎ Editabil</span>}
              </div>
              <div className="space-y-3">
                {(editMode ? (editedAnexa2?.phases || anexa2.phases) : anexa2.phases).map((phase: any, i: number) => (
                  <div key={phase.id || i} className="flex gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      {editMode ? (
                        <div className="space-y-1.5">
                          <input value={phase.name} onChange={e => {
                            const next = { ...(editedAnexa2 || anexa2) }
                            next.phases = [...next.phases]
                            next.phases[i] = { ...next.phases[i], name: e.target.value }
                            setEditedAnexa2(next)
                          }} className="w-full px-2 py-1 text-sm font-medium bg-muted/30 border border-border rounded text-foreground" placeholder="Nume fază" />
                          <div className="flex gap-2">
                            <input value={phase.period} onChange={e => {
                              const next = { ...(editedAnexa2 || anexa2) }
                              next.phases = [...next.phases]
                              next.phases[i] = { ...next.phases[i], period: e.target.value }
                              setEditedAnexa2(next)
                            }} className="px-2 py-1 text-xs bg-muted/30 border border-border rounded text-foreground w-32" placeholder="Perioadă" />
                            <input value={phase.deliverable || ''} onChange={e => {
                              const next = { ...(editedAnexa2 || anexa2) }
                              next.phases = [...next.phases]
                              next.phases[i] = { ...next.phases[i], deliverable: e.target.value }
                              setEditedAnexa2(next)
                            }} className="flex-1 px-2 py-1 text-xs bg-muted/30 border border-border rounded text-foreground" placeholder="Livrabil" />
                          </div>
                          <textarea value={(phase.tasks || []).join('\n')} onChange={e => {
                            const next = { ...(editedAnexa2 || anexa2) }
                            next.phases = [...next.phases]
                            next.phases[i] = { ...next.phases[i], tasks: e.target.value.split('\n').filter(Boolean) }
                            setEditedAnexa2(next)
                          }} rows={3} className="w-full px-2 py-1 text-xs bg-muted/30 border border-border rounded text-foreground" placeholder="Tasks (câte unul pe linie)" />
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-foreground">{phase.name}</p>
                            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">{phase.period}</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {phase.tasks?.map((task: string, j: number) => (
                              <span key={j} className="text-[10px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md">{task}</span>
                            ))}
                          </div>
                          {phase.deliverable && <p className="text-[11px] text-primary mt-1">→ {phase.deliverable}</p>}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reporting */}
          {anexa2.reporting && (
            <div className="bg-surface rounded-xl border border-border p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">C. Cadru de Raportare</h3>
              <div className="space-y-2 text-xs text-muted-foreground">
                <p><strong className="text-foreground">Frecvență:</strong> {anexa2.reporting.frequency}</p>
                <p><strong className="text-foreground">Format:</strong> {anexa2.reporting.format}</p>
                <p><strong className="text-foreground">Întâlniri:</strong> {anexa2.reporting.meetingCadence}</p>
              </div>
              {anexa2.reporting.kpis?.length > 0 && (
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {anexa2.reporting.kpis.map((kpi: any, i: number) => (
                    <div key={i} className="bg-muted/20 rounded-lg p-2.5">
                      <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">{kpi.category}</p>
                      {kpi.metrics.map((m: string, j: number) => (
                        <p key={j} className="text-[11px] text-foreground">{m}</p>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Send Contract Modal */}
      {showSendModal && contract && (
        <SendContractModal
          contract={contract}
          onClose={() => setShowSendModal(false)}
        />
      )}
    </div>
  )
}

/* ============================================================
   SEND CONTRACT MODAL
   ============================================================ */

function SendContractModal({ contract, onClose }: { contract: ContractData; onClose: () => void }) {
  const clientEmail = (contract.client as any)?.email || ''
  const [email, setEmail] = useState(clientEmail || `contact@${(contract.client?.companyName || '').toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9.]/g, '')}.ro`)
  const [subject, setSubject] = useState(`Contract ${contract.number} — Prestări Servicii`)
  const periodText = contract.duration > 0 ? `Perioadă: ${contract.duration} luni` : 'Perioadă: nedeterminată'
  const [message, setMessage] = useState(`Bună ziua,\n\nVă transmitem contractul nr. ${contract.number} pentru serviciile contractate.\n\nValoare: ${contract.value} ${contract.currency}\n${periodText}\n\nVă rugăm să verificați detaliile și să ne confirmați primirea.\n\nCu stimă,\nEchipa ASNS`)
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSend = async () => {
    setSending(true)
    setError('')
    try {
      let res: Response
      if (invoiceFile) {
        // Use FormData to send file
        const formData = new FormData()
        formData.append('email', email)
        formData.append('subject', subject)
        formData.append('message', message)
        formData.append('attachment', invoiceFile)
        res = await fetch(`/api/contracts/${contract.id}/send`, {
          method: 'POST',
          body: formData,
        })
      } else {
        res = await fetch(`/api/contracts/${contract.id}/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, subject, message }),
        })
      }
      if (res.ok) {
        setSent(true)
      } else {
        const json = await res.json()
        setError(json.error || 'Eroare la trimitere')
      }
    } catch {
      setError('Eroare de rețea')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" />
      <div className="relative bg-surface rounded-2xl border border-border shadow-2xl w-full max-w-lg mx-4 animate-fade-in max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-surface z-10">
          <div>
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Send size={14} className="text-blue-400" /> Trimite Contract pe Email
            </h2>
            <p className="text-[11px] text-muted-foreground">{contract.number} — {contract.client?.companyName}</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground">
            <XCircle size={14} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {sent ? (
            <div className="flex flex-col items-center py-8 animate-fade-in">
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
                <CheckCircle2 size={28} className="text-emerald-400" />
              </div>
              <p className="text-sm font-semibold text-foreground mb-1">Contract trimis cu succes!</p>
              <p className="text-[11px] text-muted-foreground mb-2">Email trimis la {email}</p>
              {contract.status === 'draft' && (
                <p className="text-[10px] text-blue-400">Status actualizat: Draft → Trimis</p>
              )}
              <button onClick={onClose} className="mt-4 px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">Închide</button>
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Email Destinatar</label>
                <input value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Subiect Email</label>
                <input value={subject} onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Mesaj Personalizat</label>
                <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={6}
                  className="w-full px-3 py-2 text-sm bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
              </div>

              <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                <p className="text-[11px] text-blue-400 flex items-center gap-1.5">
                  <Mail size={11} />
                  <span>Contractul va fi trimis împreună cu un link de vizualizare.</span>
                </p>
              </div>

              {/* Invoice Upload */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Atașează Factură (opțional)</label>
                <div className="relative">
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null
                      setInvoiceFile(file)
                    }}
                    className="w-full px-3 py-2 text-sm bg-muted/50 border border-border border-dashed rounded-lg text-foreground cursor-pointer file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20 focus:outline-none"
                  />
                  {invoiceFile && (
                    <div className="flex items-center gap-2 mt-1.5 px-3 py-1.5 bg-success/5 border border-success/20 rounded-lg text-xs text-success">
                      📎 {invoiceFile.name} ({(invoiceFile.size / 1024).toFixed(0)} KB)
                    </div>
                  )}
                </div>
                <p className="text-[9px] text-muted-foreground">PDF, PNG sau JPG. Datele facturii vor fi preluate automat în modulul financiar.</p>
              </div>

              {error && (
                <div className="p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
                  <p className="text-[11px] text-destructive">{error}</p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button onClick={onClose} className="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground bg-muted rounded-lg transition-colors">Anulează</button>
                <button onClick={handleSend} disabled={sending || !email}
                  className="px-5 py-2 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all flex items-center gap-1.5 disabled:opacity-60">
                  {sending ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Se trimite...
                    </>
                  ) : (
                    <>
                      <Send size={12} /> Trimite Contractul
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

"use client"

import { useState, useMemo } from "react"
import { businessLines } from "@repo/mock-data"
import { cn, formatCurrency } from "@/lib/utils"
import {
  Send, FileText, Sparkles, CheckCircle2, X,
} from "lucide-react"

/* ── types ── */

export interface OfferWizardPrefill {
  businessLineId?: string
  entityName?: string
  entityId?: string
  estimatedValue?: number
}

interface Props {
  onClose: () => void
  prefill?: OfferWizardPrefill
}

/* ── wizard ── */

export function CreateOfferWizard({ onClose, prefill }: Props) {
  const startStep = prefill?.businessLineId ? 1 : 0
  const [step, setStep] = useState(startStep)
  const [selectedBL, setSelectedBL] = useState<string>(prefill?.businessLineId || "")
  const [selectedTemplate, setSelectedTemplate] = useState<string>("")
  const [mode, setMode] = useState<"manual" | "ai">("manual")
  const [entityName, setEntityName] = useState(prefill?.entityName || "")
  const [value, setValue] = useState(prefill?.estimatedValue || 0)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiDone, setAiDone] = useState(false)

  const bl = businessLines.find((b) => b.id === selectedBL)
  const template = bl?.offerTemplates.find((t) => t.id === selectedTemplate)

  const handleAiGenerate = () => {
    setAiLoading(true)
    setTimeout(() => { setAiLoading(false); setAiDone(true) }, 3000)
  }

  const steps = [
    // Step 0: Select BL
    <div key="bl" className="space-y-4">
      <p className="text-sm text-muted-foreground">Selectează linia de business pentru ofertă:</p>
      <div className="grid grid-cols-1 gap-2">
        {businessLines.map((b) => (
          <button key={b.id} onClick={() => { setSelectedBL(b.id); setStep(1) }}
            className={cn("flex items-center gap-3 p-4 rounded-xl border text-left transition-all hover:border-primary/50", selectedBL === b.id ? "border-primary bg-primary/5" : "border-border bg-surface")}>
            <span className="text-2xl">{b.icon}</span>
            <div>
              <p className="text-sm font-semibold text-foreground">{b.name}</p>
              <p className="text-[11px] text-muted-foreground">{b.offerTemplates.length} template(e) de ofertă</p>
            </div>
          </button>
        ))}
      </div>
    </div>,

    // Step 1: Select Template
    <div key="template" className="space-y-4">
      <p className="text-sm text-muted-foreground">Selectează template-ul ofertei:</p>
      <div className="grid grid-cols-1 gap-2">
        {bl?.offerTemplates.map((t) => (
          <button key={t.id} onClick={() => { setSelectedTemplate(t.id); setStep(2) }}
            className={cn("flex items-center gap-3 p-4 rounded-xl border text-left transition-all hover:border-primary/50", selectedTemplate === t.id ? "border-primary bg-primary/5" : "border-border bg-surface")}>
            <FileText size={20} className="text-primary flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-foreground">{t.name}</p>
              <p className="text-[11px] text-muted-foreground">{t.sections.length} secțiuni • {t.pricingType === 'monthly' ? 'Lunar' : t.pricingType === 'fixed' ? 'Fix' : 'Detaliat'}</p>
              {t.aiCapable && (
                <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 text-[9px] font-bold uppercase bg-gradient-to-r from-violet-500/10 to-pink-500/10 text-violet-400 rounded-full border border-violet-500/20">
                  <Sparkles size={8} /> AI Capable
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>,

    // Step 2: Generation Mode
    <div key="mode" className="space-y-4">
      <p className="text-sm text-muted-foreground">Cum dorești să generezi oferta?</p>
      <div className="grid grid-cols-1 gap-3">
        <button onClick={() => { setMode("manual"); setStep(3) }}
          className="flex items-center gap-3 p-4 rounded-xl border border-border bg-surface hover:border-primary/50 text-left transition-all">
          <FileText size={24} className="text-foreground flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-foreground">Completare Manuală</p>
            <p className="text-[11px] text-muted-foreground">Completezi toate câmpurile manual din template</p>
          </div>
        </button>
        {template?.aiCapable && (
          <button onClick={() => { setMode("ai"); setStep(3) }}
            className="flex items-center gap-3 p-4 rounded-xl border border-violet-500/30 bg-gradient-to-r from-violet-500/5 to-pink-500/5 hover:border-violet-500/50 text-left transition-all">
            <Sparkles size={24} className="text-violet-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-foreground">Generează cu AI</p>
              <p className="text-[11px] text-muted-foreground">AI analizează datele și propune conținut automat</p>
              {template.aiDataSources && (
                <div className="flex items-center gap-1.5 mt-1">
                  {template.aiDataSources.map((src) => (
                    <span key={src} className="px-1.5 py-0.5 text-[9px] font-bold uppercase bg-muted rounded text-muted-foreground">{src}</span>
                  ))}
                </div>
              )}
            </div>
          </button>
        )}
      </div>
    </div>,

    // Step 3: Entity + Fields
    <div key="fields" className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Entitate / Client</label>
        <input value={entityName} onChange={(e) => setEntityName(e.target.value)} placeholder="Ex: QualityControl SRL"
          className="w-full px-3 py-2 text-sm bg-muted/50 border border-border rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30" />
      </div>
      <div className="space-y-1.5">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Valoare Ofertă ({template?.pricingType === 'monthly' ? 'EUR/lună' : 'EUR'})
        </label>
        <input type="number" value={value} onChange={(e) => setValue(+e.target.value)}
          className="w-full px-3 py-2 text-sm bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
      </div>

      {/* Pre-fill indicator */}
      {prefill?.entityName && (
        <div className="flex items-center gap-2 p-2.5 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
          <CheckCircle2 size={13} className="text-emerald-400" />
          <span className="text-[11px] text-emerald-400 font-medium">Datele lead-ului au fost pre-completate</span>
        </div>
      )}

      {mode === "ai" && !aiLoading && !aiDone && (
        <button onClick={handleAiGenerate} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-violet-600 to-pink-600 text-white rounded-lg text-sm font-medium hover:opacity-90 transition-all">
          <Sparkles size={15} /> Generează cu AI
        </button>
      )}
      {aiLoading && (
        <div className="flex items-center gap-3 p-4 bg-violet-500/5 border border-violet-500/20 rounded-xl animate-pulse">
          <div className="w-5 h-5 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
          <div>
            <p className="text-sm font-medium text-violet-400">AI analizează datele...</p>
            <p className="text-[11px] text-muted-foreground">{template?.aiDataSources?.map((s) => s.toUpperCase()).join(', ')}</p>
          </div>
        </div>
      )}
      {aiDone && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-success font-medium"><CheckCircle2 size={14} /> Conținut generat cu succes</div>
          {template?.sections.map((section, i) => (
            <div key={section} className="p-3 bg-muted/30 border border-border rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-semibold text-foreground">{section}</span>
                {i < 3 && <span className="flex items-center gap-0.5 px-1.5 py-0.5 text-[8px] font-bold uppercase text-violet-400 bg-violet-500/10 rounded-full"><Sparkles size={7} /> AI</span>}
              </div>
              <p className="text-[11px] text-muted-foreground">Conținut generat pre-populat pentru revizuire...</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <button onClick={onClose} className="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground bg-muted rounded-lg transition-colors">Anulează</button>
        <button onClick={onClose} className="px-4 py-2 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary-hover transition-colors flex items-center gap-1.5">
          <Send size={12} /> Salvează Draft
        </button>
      </div>
    </div>,
  ]

  const stepLabels = ["Business Line", "Template", "Mod Generare", "Completare"]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" />
      <div className="relative bg-surface rounded-2xl border border-border shadow-2xl w-full max-w-lg mx-4 animate-scale-in" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              {prefill?.entityName ? `Ofertă pentru ${prefill.entityName}` : "Ofertă Nouă"}
            </h2>
            <p className="text-[11px] text-muted-foreground">Pasul {step + 1} din {stepLabels.length}: {stepLabels[step]}</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <X size={15} />
          </button>
        </div>

        {/* Stepper indicator */}
        <div className="flex items-center gap-1 px-5 pt-4">
          {stepLabels.map((_, i) => (
            <div key={i} className={cn("flex-1 h-1 rounded-full transition-all", i <= step ? "bg-primary" : "bg-muted")} />
          ))}
        </div>

        {/* Content */}
        <div className="p-5">{steps[step]}</div>

        {/* Back button */}
        {step > (prefill?.businessLineId ? 1 : 0) && (
          <div className="px-5 pb-4">
            <button onClick={() => setStep(step - 1)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">← Înapoi</button>
          </div>
        )}
      </div>
    </div>
  )
}

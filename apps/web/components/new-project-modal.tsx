"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { useBusinessLine } from "@/components/business-line-context"
import { X, FolderKanban, Building2, LayoutTemplate, Loader2, Calendar, DollarSign } from "lucide-react"
import type { BusinessLine } from "@repo/mock-data"

interface NewProjectModalProps {
  open: boolean
  onClose: () => void
  clientId: string
  clientName: string
}

export function NewProjectModal({ open, onClose, clientId, clientName }: NewProjectModalProps) {
  const router = useRouter()
  const { lines } = useBusinessLine()

  const [selectedBL, setSelectedBL] = useState<BusinessLine | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<string>("")
  const [projectName, setProjectName] = useState("")
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]!)
  const [budget, setBudget] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const templates = selectedBL?.projectTemplates || []

  const reset = () => {
    setSelectedBL(null)
    setSelectedTemplate("")
    setProjectName("")
    setStartDate(new Date().toISOString().split("T")[0]!)
    setBudget("")
    setError("")
  }

  const handleCreate = async () => {
    if (!selectedBL || !selectedTemplate || !projectName.trim()) {
      setError("Completează toate câmpurile obligatorii")
      return
    }

    setSaving(true)
    setError("")

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessLineSlug: selectedBL.id,
          clientId,
          templateId: selectedTemplate,
          name: projectName.trim(),
          startDate,
          budget: budget ? parseFloat(budget) : null,
        }),
      })

      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error || "Eroare la creare")
      }

      const { data } = await res.json()
      reset()
      onClose()
      router.push(`/projects/${data.id}`)
    } catch (err: any) {
      setError(err.message || "Eroare la creare proiect")
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface border border-border rounded-2xl w-full max-w-lg mx-4 shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-surface rounded-t-2xl z-10">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <FolderKanban size={14} className="text-primary" />
            Proiect Nou — {clientName}
          </h3>
          <button onClick={() => { reset(); onClose() }} className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <X size={12} />
          </button>
        </div>

        <div className="p-4 space-y-5">
          {/* Step 1: Business Line */}
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase block mb-2">
              1. Linie de Business *
            </label>
            <div className="grid grid-cols-2 gap-2">
              {lines.map(bl => (
                <button
                  key={bl.id}
                  onClick={() => {
                    setSelectedBL(bl)
                    setSelectedTemplate("")
                    // Auto-fill name with template later
                  }}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2.5 rounded-lg border text-left transition-all",
                    selectedBL?.id === bl.id
                      ? "bg-primary/10 text-primary border-primary/30"
                      : "bg-muted/20 text-muted-foreground border-border hover:border-border/80 hover:text-foreground"
                  )}
                >
                  <span className="text-base">{bl.icon}</span>
                  <span className="text-xs font-medium">{bl.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: Template */}
          {selectedBL && (
            <div className="animate-fade-in">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase block mb-2">
                2. Tip Proiect (Template) *
              </label>
              <div className="space-y-1.5">
                {templates.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Niciun template configurat pentru {selectedBL.name}</p>
                ) : templates.map(t => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setSelectedTemplate(t.id)
                      if (!projectName) setProjectName(`${t.name} — ${clientName}`)
                    }}
                    className={cn(
                      "w-full flex items-start gap-3 px-3 py-2.5 rounded-lg border text-left transition-all",
                      selectedTemplate === t.id
                        ? "bg-primary/10 border-primary/30"
                        : "bg-muted/20 border-border hover:border-border/80"
                    )}
                  >
                    <LayoutTemplate size={14} className={selectedTemplate === t.id ? "text-primary mt-0.5" : "text-muted-foreground mt-0.5"} />
                    <div>
                      <p className={cn("text-xs font-medium", selectedTemplate === t.id ? "text-primary" : "text-foreground")}>{t.name}</p>
                      {t.phases && t.phases.length > 0 && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {t.phases.length} faze: {t.phases.slice(0, 3).join(", ")}{t.phases.length > 3 ? "..." : ""}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Details */}
          {selectedTemplate && (
            <div className="animate-fade-in space-y-3">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase block">
                3. Detalii Proiect
              </label>

              {/* Project Name */}
              <div>
                <label className="text-[10px] text-muted-foreground block mb-1">Nume Proiect *</label>
                <div className="relative">
                  <FolderKanban size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={projectName}
                    onChange={e => setProjectName(e.target.value)}
                    placeholder="ex: SEO Site Web — ClientName"
                    className="w-full pl-8 pr-3 py-2 bg-muted/30 border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
                  />
                </div>
              </div>

              {/* Start Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-muted-foreground block mb-1">Dată Start</label>
                  <div className="relative">
                    <Calendar size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="date"
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 bg-muted/30 border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground block mb-1">Buget (EUR)</label>
                  <div className="relative">
                    <DollarSign size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="number"
                      value={budget}
                      onChange={e => setBudget(e.target.value)}
                      placeholder="opțional"
                      className="w-full pl-8 pr-3 py-2 bg-muted/30 border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 pt-0 flex items-center gap-2">
          <button onClick={() => { reset(); onClose() }} className="flex-1 px-4 py-2 text-xs font-medium rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 transition-colors">
            Anulează
          </button>
          <button
            onClick={handleCreate}
            disabled={!selectedBL || !selectedTemplate || !projectName.trim() || saving}
            className="flex-1 px-4 py-2.5 text-xs font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5"
          >
            {saving ? <><Loader2 size={12} className="animate-spin" /> Se creează...</> : "🚀 Creează Proiect"}
          </button>
        </div>
      </div>
    </div>
  )
}

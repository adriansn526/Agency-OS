"use client"

import { useState } from "react"
import Link from "next/link"
import { businessLines, type BusinessLine, type EntityType, type PipelineStage } from "@repo/mock-data"
import { cn } from "@/lib/utils"
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronRight,
  X,
  Check,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Users,
  Settings2,
} from "lucide-react"

/* ============================================================
   SETTINGS: BUSINESS LINES MANAGEMENT
   ============================================================ */

export default function BusinessLinesSettings() {
  const [lines, setLines] = useState<BusinessLine[]>(businessLines)
  const [expandedLine, setExpandedLine] = useState<string | null>(null)
  const [showNewLineModal, setShowNewLineModal] = useState(false)

  const handleDeleteLine = (id: string) => {
    if (confirm("Ești sigur că vrei să ștergi această linie de business?")) {
      setLines((prev) => prev.filter((bl) => bl.id !== id))
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/settings"
            className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-foreground">Business Lines</h1>
            <p className="text-sm text-muted-foreground">
              {lines.length} linii de business • {lines.reduce((s, bl) => s + bl.entityTypes.length, 0)} tipuri de entități
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowNewLineModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors shadow-sm"
        >
          <Plus size={16} /> Linie Nouă
        </button>
      </div>

      {/* Info banner */}
      <div className="bg-info/5 border border-info/20 rounded-xl p-4 flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-info/10 flex items-center justify-center text-info flex-shrink-0 mt-0.5">
          <Settings2 size={16} />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">Cum funcționează?</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Fiecare linie de business poate avea multiple <strong>tipuri de entități</strong> (ex: ClimaticPRO are Clienți Finali, Instalatori, Furnizori).
            Fiecare tip de entitate are pipeline-ul propriu, câmpuri custom, și flux financiar (venituri sau cheltuieli).
          </p>
        </div>
      </div>

      {/* Business Lines List */}
      <div className="space-y-3">
        {lines.map((bl) => {
          const isExpanded = expandedLine === bl.id
          const incomeTypes = bl.entityTypes.filter((et) => et.financialFlow === "income")
          const expenseTypes = bl.entityTypes.filter((et) => et.financialFlow === "expense")

          return (
            <div
              key={bl.id}
              className={cn(
                "bg-surface rounded-xl border transition-all duration-200",
                isExpanded ? "border-primary/30 shadow-md" : "border-border hover:border-border/80"
              )}
            >
              {/* Line header */}
              <div
                className="flex items-center gap-3 p-4 cursor-pointer"
                onClick={() => setExpandedLine(isExpanded ? null : bl.id)}
              >
                <div className="text-muted-foreground cursor-grab">
                  <GripVertical size={16} />
                </div>
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                  style={{ backgroundColor: bl.color + "15" }}
                >
                  {bl.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{bl.name}</p>
                    <span className="text-[10px] text-muted-foreground bg-muted rounded-full px-1.5 py-0.5">
                      {bl.entityTypes.length} {bl.entityTypes.length === 1 ? "tip" : "tipuri"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {bl.entityTypes.map((et) => `${et.icon} ${et.namePlural}`).join(" • ")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {incomeTypes.length > 0 && (
                    <span className="flex items-center gap-1 text-[10px] font-medium text-success bg-success/10 px-1.5 py-0.5 rounded-md">
                      <ArrowUpRight size={10} /> {incomeTypes.length} income
                    </span>
                  )}
                  {expenseTypes.length > 0 && (
                    <span className="flex items-center gap-1 text-[10px] font-medium text-destructive bg-destructive/10 px-1.5 py-0.5 rounded-md">
                      <ArrowDownRight size={10} /> {expenseTypes.length} expense
                    </span>
                  )}
                  <div className="w-4 h-4 rounded-full border-2" style={{ borderColor: bl.color, backgroundColor: bl.color + "30" }} />
                  {isExpanded ? <ChevronDown size={16} className="text-muted-foreground" /> : <ChevronRight size={16} className="text-muted-foreground" />}
                </div>
              </div>

              {/* Expanded: Entity Types */}
              {isExpanded && (
                <div className="border-t border-border px-4 pb-4 pt-3 space-y-3">
                  {bl.entityTypes.map((et) => (
                    <EntityTypeCard key={et.id} entityType={et} blColor={bl.color} />
                  ))}

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2">
                    <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted rounded-lg transition-colors">
                      <Plus size={12} /> Adaugă Entity Type
                    </button>
                    <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted rounded-lg transition-colors">
                      <Pencil size={12} /> Editează Linia
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteLine(bl.id)
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-destructive/70 hover:text-destructive bg-destructive/5 hover:bg-destructive/10 rounded-lg transition-colors ml-auto"
                    >
                      <Trash2 size={12} /> Șterge
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* New Business Line Modal */}
      {showNewLineModal && (
        <NewBusinessLineModal onClose={() => setShowNewLineModal(false)} onSave={(bl) => { setLines((prev) => [...prev, bl]); setShowNewLineModal(false) }} />
      )}
    </div>
  )
}

/* ============================================================
   Entity Type Card
   ============================================================ */

function EntityTypeCard({ entityType: et, blColor }: { entityType: EntityType; blColor: string }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="bg-muted/30 rounded-lg border border-border/50 overflow-hidden">
      <div className="flex items-center gap-3 px-3 py-2.5 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <span className="text-sm">{et.icon}</span>
        <div className="flex-1">
          <p className="text-xs font-semibold text-foreground">{et.namePlural}</p>
          <p className="text-[10px] text-muted-foreground">{et.pipeline.length} stages • {et.customFields.length} câmpuri</p>
        </div>
        <span
          className={cn(
            "text-[10px] font-semibold px-1.5 py-0.5 rounded-md",
            et.financialFlow === "income"
              ? "text-success bg-success/10"
              : et.financialFlow === "expense"
                ? "text-destructive bg-destructive/10"
                : "text-warning bg-warning/10"
          )}
        >
          {et.financialFlow === "income" ? "💰 Venituri" : et.financialFlow === "expense" ? "💸 Cheltuieli" : "↔ Mixt"}
        </span>
        {expanded ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronRight size={14} className="text-muted-foreground" />}
      </div>

      {expanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-border/30 pt-2">
          {/* Pipeline */}
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Pipeline</p>
            <div className="flex items-center gap-1 flex-wrap">
              {et.pipeline.map((stage, i) => (
                <div key={stage.key} className="flex items-center gap-1">
                  <span
                    className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-surface border border-border/50"
                    style={{ borderLeftColor: blColor, borderLeftWidth: 2 }}
                  >
                    {stage.label}
                  </span>
                  {i < et.pipeline.length - 1 && <span className="text-muted-foreground text-[10px]">→</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Custom fields */}
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Câmpuri Custom</p>
            <div className="grid grid-cols-2 gap-1">
              {et.customFields.map((f) => (
                <div key={f.key} className="flex items-center gap-1.5 text-[10px] text-foreground-secondary bg-surface rounded px-2 py-1 border border-border/30">
                  <span className="font-medium">{f.label}</span>
                  <span className="text-muted-foreground">{f.type}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ============================================================
   New Business Line Modal (Wizard)
   ============================================================ */

const emojiOptions = ["🏢", "🍕", "🏗️", "🛡️", "🛒", "💼", "🔧", "📱", "🎓", "🏥", "🚚", "🎨"]
const colorOptions = ["#2563eb", "#f97316", "#0891b2", "#7c3aed", "#10b981", "#ef4444", "#ec4899", "#6366f1"]

function NewBusinessLineModal({ onClose, onSave }: { onClose: () => void; onSave: (bl: BusinessLine) => void }) {
  const [name, setName] = useState("")
  const [shortName, setShortName] = useState("")
  const [icon, setIcon] = useState("🏢")
  const [color, setColor] = useState("#2563eb")

  const handleSave = () => {
    if (!name.trim()) return
    const id = name.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "")
    const bl: BusinessLine = {
      id,
      name: name.trim(),
      shortName: shortName.trim() || name.trim(),
      icon,
      color,
      bgClass: `bg-[${color}]/10`,
      textClass: `text-[${color}]`,
      entityTypes: [
        {
          id: "default",
          name: "Entitate",
          namePlural: "Entități",
          icon: "📋",
          financialFlow: "income",
          pipeline: [
            { key: "nou", label: "Nou", color: "info" },
            { key: "in_progres", label: "În Progres", color: "warning" },
            { key: "activ", label: "Activ", color: "success" },
            { key: "inactiv", label: "Inactiv", color: "destructive" },
          ],
          customFields: [],
        },
      ],
      metrics: ["Total Entități"],
      projectTemplates: [],
      offerTemplates: [],
    }
    onSave(bl)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface rounded-2xl border border-border shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">Linie de Business Nouă</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Name */}
          <div>
            <label className="text-xs font-semibold text-foreground-secondary mb-1.5 block">Nume Complet</label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); if (!shortName) setShortName(e.target.value.split(" ")[0] || "") }}
              placeholder="ex: ClimaticPRO, Fudly, WertAudit..."
              className="w-full h-9 px-3 bg-muted/50 rounded-lg border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground-secondary mb-1.5 block">Nume Scurt (afișat pe tab)</label>
            <input
              type="text"
              value={shortName}
              onChange={(e) => setShortName(e.target.value)}
              placeholder="ex: Fudly"
              className="w-full h-9 px-3 bg-muted/50 rounded-lg border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Icon picker */}
          <div>
            <label className="text-xs font-semibold text-foreground-secondary mb-1.5 block">Icon</label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {emojiOptions.map((e) => (
                <button
                  key={e}
                  onClick={() => setIcon(e)}
                  className={cn(
                    "w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all",
                    icon === e ? "bg-primary/10 border-2 border-primary shadow-sm" : "bg-muted/50 border border-border hover:bg-muted"
                  )}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Color picker */}
          <div>
            <label className="text-xs font-semibold text-foreground-secondary mb-1.5 block">Culoare Accent</label>
            <div className="flex items-center gap-2 flex-wrap">
              {colorOptions.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={cn(
                    "w-8 h-8 rounded-full transition-all",
                    color === c ? "ring-2 ring-offset-2 ring-offset-surface scale-110" : "hover:scale-105"
                  )}
                  style={{ backgroundColor: c, outlineColor: color === c ? c : undefined }}
                />
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="bg-muted/30 rounded-lg border border-border/50 p-3">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Preview</p>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm" style={{ backgroundColor: color + "20" }}>
                {icon}
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color }}>{name || "Nume Linie"}</p>
                <p className="text-[10px] text-muted-foreground">1 entity type default • Pipeline: Nou → În Progres → Activ → Inactiv</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border bg-muted/20">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Anulează
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors shadow-sm disabled:opacity-50 disabled:pointer-events-none"
          >
            <Check size={16} /> Creează Linia
          </button>
        </div>
      </div>
    </div>
  )
}

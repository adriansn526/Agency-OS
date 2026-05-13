"use client"

import { useState, useMemo, useCallback } from "react"
import { businessLines as rawBusinessLines } from "@repo/mock-data"
import type { PipelineStage, EntityType, BusinessLine } from "@repo/mock-data"
import { cn } from "@/lib/utils"
import {
  Plus, GripVertical, Pencil, Trash2, Check, X,
  ChevronDown, ChevronRight, Save, Palette, ArrowRight, Settings2,
  Undo2, AlertCircle,
} from "lucide-react"

/* ── color palette ── */

const colorOptions = [
  { key: "info",        label: "Albastru",   tw: "bg-blue-500",    text: "text-blue-400" },
  { key: "warning",     label: "Galben",     tw: "bg-amber-500",   text: "text-amber-400" },
  { key: "accent",      label: "Violet",     tw: "bg-violet-500",  text: "text-violet-400" },
  { key: "primary",     label: "Primar",     tw: "bg-primary",     text: "text-primary" },
  { key: "success",     label: "Verde",      tw: "bg-emerald-500", text: "text-emerald-400" },
  { key: "destructive", label: "Roșu",       tw: "bg-red-500",     text: "text-red-400" },
  { key: "cyan",        label: "Cyan",       tw: "bg-cyan-500",    text: "text-cyan-400" },
  { key: "orange",      label: "Portocaliu", tw: "bg-orange-500",  text: "text-orange-400" },
  { key: "pink",        label: "Roz",        tw: "bg-pink-500",    text: "text-pink-400" },
]

function getColorTw(key: string) {
  return colorOptions.find((c) => c.key === key)?.tw || "bg-muted-foreground"
}

/* ── deep clone helper ── */

function cloneBLs(bls: BusinessLine[]): BusinessLine[] {
  return JSON.parse(JSON.stringify(bls))
}

/* ── page ── */

export default function PipelinesSettingsPage() {
  // ── core state: mutable copy of business lines ──
  const [blState, setBlState] = useState<BusinessLine[]>(() => cloneBLs(rawBusinessLines))
  const [savedSnapshot, setSavedSnapshot] = useState<string>(() => JSON.stringify(rawBusinessLines))

  // ── UI state ──
  const [expandedBL, setExpandedBL] = useState<string>(rawBusinessLines[0]?.id || "")
  const [editingStage, setEditingStage] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState("")
  const [editColor, setEditColor] = useState("")
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [addingTo, setAddingTo] = useState<string | null>(null)
  const [newLabel, setNewLabel] = useState("")
  const [newColor, setNewColor] = useState("info")
  const [toast, setToast] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null) // stageKey to confirm

  // ── dirty detection ──
  const isDirty = useMemo(() => JSON.stringify(blState) !== savedSnapshot, [blState, savedSnapshot])
  const changeCount = useMemo(() => {
    const old = JSON.parse(savedSnapshot) as BusinessLine[]
    let count = 0
    blState.forEach((bl, bi) => {
      bl.entityTypes.forEach((et, ei) => {
        const oldPipeline = old[bi]?.entityTypes[ei]?.pipeline || []
        if (JSON.stringify(et.pipeline) !== JSON.stringify(oldPipeline)) count++
      })
    })
    return count
  }, [blState, savedSnapshot])

  // ── mutations ──
  const updateStage = useCallback((blId: string, etId: string, stageKey: string, newLabelVal: string, newColorVal: string) => {
    setBlState((prev) => prev.map((bl) =>
      bl.id !== blId ? bl : {
        ...bl,
        entityTypes: bl.entityTypes.map((et) =>
          et.id !== etId ? et : {
            ...et,
            pipeline: et.pipeline.map((s) =>
              s.key !== stageKey ? s : { ...s, label: newLabelVal, color: newColorVal }
            ),
          }
        ),
      }
    ))
  }, [])

  const addStage = useCallback((blId: string, etId: string, label: string, color: string) => {
    const key = label.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "")
    if (!key || !label.trim()) return
    setBlState((prev) => prev.map((bl) =>
      bl.id !== blId ? bl : {
        ...bl,
        entityTypes: bl.entityTypes.map((et) =>
          et.id !== etId ? et : {
            ...et,
            pipeline: [...et.pipeline, { key, label: label.trim(), color }],
          }
        ),
      }
    ))
  }, [])

  const removeStage = useCallback((blId: string, etId: string, stageKey: string) => {
    setBlState((prev) => prev.map((bl) =>
      bl.id !== blId ? bl : {
        ...bl,
        entityTypes: bl.entityTypes.map((et) =>
          et.id !== etId ? et : {
            ...et,
            pipeline: et.pipeline.filter((s) => s.key !== stageKey),
          }
        ),
      }
    ))
    setConfirmDelete(null)
  }, [])

  const moveStage = useCallback((blId: string, etId: string, stageKey: string, direction: "up" | "down") => {
    setBlState((prev) => prev.map((bl) => {
      if (bl.id !== blId) return bl
      return {
        ...bl,
        entityTypes: bl.entityTypes.map((et) => {
          if (et.id !== etId) return et
          const idx = et.pipeline.findIndex((s) => s.key === stageKey)
          if (idx < 0) return et
          const newIdx = direction === "up" ? idx - 1 : idx + 1
          if (newIdx < 0 || newIdx >= et.pipeline.length) return et
          const newPipeline = [...et.pipeline]
          ;[newPipeline[idx], newPipeline[newIdx]] = [newPipeline[newIdx]!, newPipeline[idx]!]
          return { ...et, pipeline: newPipeline }
        }),
      }
    }))
  }, [])

  // ── save / revert ──
  const handleSave = () => {
    setSavedSnapshot(JSON.stringify(blState))
    setToast("Pipeline-urile au fost salvate cu succes!")
    setTimeout(() => setToast(null), 3000)
  }

  const handleRevert = () => {
    setBlState(JSON.parse(savedSnapshot))
    setToast("Modificările au fost anulate.")
    setTimeout(() => setToast(null), 3000)
  }

  return (
    <div className="p-4 md:p-6 space-y-5 animate-fade-in max-w-5xl mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Settings2 size={18} className="text-primary" />
            <h1 className="text-xl font-bold text-foreground">Pipeline-uri</h1>
            {isDirty && (
              <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-amber-500/10 text-amber-400 rounded-full animate-fade-in">
                <AlertCircle size={10} /> Nesalvat
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">Definește etapele pipeline-ului de vânzări pentru fiecare tip de entitate.</p>
        </div>
        {isDirty && (
          <div className="flex items-center gap-2">
            <button onClick={handleRevert} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors">
              <Undo2 size={12} /> Anulează
            </button>
            <button onClick={handleSave} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors shadow-sm">
              <Save size={12} /> Salvează
            </button>
          </div>
        )}
      </div>

      {/* BL accordion cards */}
      <div className="space-y-3">
        {blState.map((bl) => {
          const isExpanded = expandedBL === bl.id
          return (
            <div key={bl.id} className="bg-surface rounded-xl border border-border overflow-hidden">
              {/* BL Header */}
              <button
                onClick={() => setExpandedBL(isExpanded ? "" : bl.id)}
                className="w-full flex items-center gap-3 px-5 py-4 hover:bg-muted/20 transition-colors"
              >
                <span className="text-lg">{bl.icon}</span>
                <div className="text-left flex-1">
                  <p className="text-sm font-semibold text-foreground">{bl.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {bl.entityTypes.length} tip{bl.entityTypes.length > 1 ? "uri" : ""} de entitate • {bl.entityTypes.reduce((s, et) => s + et.pipeline.length, 0)} etape totale
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-1">
                    {bl.entityTypes[0]?.pipeline.slice(0, 5).map((s) => (
                      <div key={s.key} className={cn("w-3 h-3 rounded-full border-2 border-surface", getColorTw(s.color))} />
                    ))}
                  </div>
                  {isExpanded ? <ChevronDown size={16} className="text-muted-foreground" /> : <ChevronRight size={16} className="text-muted-foreground" />}
                </div>
              </button>

              {/* Expanded content */}
              {isExpanded && (
                <div className="px-5 pb-5 space-y-5 border-t border-border pt-4">
                  {bl.entityTypes.map((et) => (
                    <div key={et.id}>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-sm">{et.icon}</span>
                        <h3 className="text-sm font-semibold text-foreground">{et.namePlural}</h3>
                        <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">{et.pipeline.length} etape</span>
                      </div>

                      {/* Pipeline stages */}
                      <div className="space-y-1.5 mb-3">
                        {et.pipeline.map((stage, idx) => {
                          const stageId = `${et.id}-${stage.key}`
                          const isEditing = editingStage === stageId
                          const isLast = idx === et.pipeline.length - 1
                          const isConfirmingDelete = confirmDelete === stageId

                          return (
                            <div key={stage.key} className="group">
                              <div className={cn(
                                "flex items-center gap-2 px-3 py-2 rounded-lg border transition-all",
                                isEditing ? "border-primary/30 bg-primary/5" : isConfirmingDelete ? "border-red-500/30 bg-red-500/5" : "border-border/50 bg-muted/10 hover:bg-muted/30"
                              )}>
                                {/* Reorder buttons */}
                                <div className="flex flex-col gap-0.5">
                                  <button
                                    onClick={() => moveStage(bl.id, et.id, stage.key, "up")}
                                    disabled={idx === 0}
                                    className="w-4 h-3 flex items-center justify-center text-muted-foreground/40 hover:text-foreground disabled:opacity-20 transition-colors"
                                  >
                                    <ChevronDown size={10} className="rotate-180" />
                                  </button>
                                  <button
                                    onClick={() => moveStage(bl.id, et.id, stage.key, "down")}
                                    disabled={isLast}
                                    className="w-4 h-3 flex items-center justify-center text-muted-foreground/40 hover:text-foreground disabled:opacity-20 transition-colors"
                                  >
                                    <ChevronDown size={10} />
                                  </button>
                                </div>

                                {/* Stage number */}
                                <span className="text-[10px] font-bold text-muted-foreground/50 w-4 flex-shrink-0">{idx + 1}</span>

                                {/* Color dot */}
                                <div className={cn("w-3 h-3 rounded-full flex-shrink-0", getColorTw(isEditing ? editColor : stage.color))} />

                                {/* Label */}
                                {isEditing ? (
                                  <input
                                    value={editLabel}
                                    onChange={(e) => setEditLabel(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") { updateStage(bl.id, et.id, stage.key, editLabel, editColor); setEditingStage(null); setShowColorPicker(false) }
                                      if (e.key === "Escape") { setEditingStage(null); setShowColorPicker(false) }
                                    }}
                                    className="flex-1 px-2 py-0.5 text-sm bg-transparent border-b border-primary/30 text-foreground focus:outline-none"
                                    autoFocus
                                  />
                                ) : (
                                  <span className="text-sm font-medium text-foreground flex-1">{stage.label}</span>
                                )}

                                {/* Delete confirmation */}
                                {isConfirmingDelete && (
                                  <div className="flex items-center gap-1.5 animate-fade-in">
                                    <span className="text-[10px] text-red-400 font-medium">Ștergi?</span>
                                    <button onClick={() => removeStage(bl.id, et.id, stage.key)} className="w-6 h-6 rounded-md flex items-center justify-center bg-red-500/10 hover:bg-red-500/20 text-red-400"><Check size={12} /></button>
                                    <button onClick={() => setConfirmDelete(null)} className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-muted text-muted-foreground"><X size={12} /></button>
                                  </div>
                                )}

                                {/* Color picker (editing) */}
                                {isEditing && (
                                  <div className="relative">
                                    <button onClick={() => setShowColorPicker(!showColorPicker)} className="flex items-center gap-1 px-2 py-0.5 text-[10px] bg-muted rounded-md hover:bg-muted/80">
                                      <Palette size={10} /> Culoare
                                    </button>
                                    {showColorPicker && (
                                      <div className="absolute right-0 top-full mt-1 bg-surface border border-border rounded-xl shadow-xl p-2 z-20 w-40 grid grid-cols-3 gap-1">
                                        {colorOptions.map((co) => (
                                          <button key={co.key} onClick={() => { setEditColor(co.key); setShowColorPicker(false) }} className={cn("flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[10px] hover:bg-muted transition-colors", editColor === co.key && "bg-muted ring-1 ring-primary/30")}>
                                            <div className={cn("w-2.5 h-2.5 rounded-full", co.tw)} />
                                            {co.label}
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Actions */}
                                {isEditing ? (
                                  <div className="flex items-center gap-1">
                                    <button onClick={() => { updateStage(bl.id, et.id, stage.key, editLabel, editColor); setEditingStage(null); setShowColorPicker(false) }} className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-emerald-500/20 text-emerald-400"><Check size={13} /></button>
                                    <button onClick={() => { setEditingStage(null); setShowColorPicker(false) }} className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-muted text-muted-foreground"><X size={13} /></button>
                                  </div>
                                ) : !isConfirmingDelete && (
                                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => { setEditingStage(stageId); setEditLabel(stage.label); setEditColor(stage.color) }} className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-muted text-muted-foreground"><Pencil size={11} /></button>
                                    <button onClick={() => setConfirmDelete(stageId)} className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-red-500/10 text-muted-foreground hover:text-red-400"><Trash2 size={11} /></button>
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      {/* Add new stage */}
                      {addingTo === et.id ? (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-primary/20 bg-primary/5">
                          <div className={cn("w-3 h-3 rounded-full flex-shrink-0", getColorTw(newColor))} />
                          <input
                            value={newLabel}
                            onChange={(e) => setNewLabel(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && newLabel.trim()) { addStage(bl.id, et.id, newLabel, newColor); setAddingTo(null); setNewLabel(""); setNewColor("info") }
                              if (e.key === "Escape") { setAddingTo(null); setNewLabel("") }
                            }}
                            placeholder="Nume etapă nouă..."
                            className="flex-1 px-2 py-0.5 text-sm bg-transparent border-b border-primary/30 text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
                            autoFocus
                          />
                          <select
                            value={newColor}
                            onChange={(e) => setNewColor(e.target.value)}
                            className="text-[10px] bg-muted border border-border rounded-md px-1.5 py-1 text-foreground"
                          >
                            {colorOptions.map((co) => (
                              <option key={co.key} value={co.key}>{co.label}</option>
                            ))}
                          </select>
                          <button onClick={() => { if (newLabel.trim()) { addStage(bl.id, et.id, newLabel, newColor); setAddingTo(null); setNewLabel(""); setNewColor("info") } }} className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-emerald-500/20 text-emerald-400"><Check size={13} /></button>
                          <button onClick={() => { setAddingTo(null); setNewLabel("") }} className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-muted text-muted-foreground"><X size={13} /></button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setAddingTo(et.id); setNewLabel(""); setNewColor("info") }}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg border border-dashed border-border/50 transition-all w-full justify-center"
                        >
                          <Plus size={12} /> Adaugă Etapă
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Visual preview */}
      <div className="bg-surface rounded-xl border border-border p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Previzualizare Pipeline</h3>
        <div className="space-y-4">
          {blState.map((bl) => (
            <div key={bl.id}>
              {bl.entityTypes.map((et) => (
                <div key={et.id} className="mb-4 last:mb-0">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">{bl.icon} {bl.shortName} — {et.namePlural}</p>
                  <div className="flex items-center gap-0 overflow-x-auto pb-1">
                    {et.pipeline.map((stage, idx) => {
                      const co = colorOptions.find((c) => c.key === stage.color)
                      return (
                        <div key={stage.key} className="flex items-center">
                          <div className={cn(
                            "px-3 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap flex items-center gap-1.5",
                          )}>
                            <div className={cn("w-2 h-2 rounded-full", getColorTw(stage.color))} />
                            <span className={co?.text || "text-muted-foreground"}>{stage.label}</span>
                          </div>
                          {idx < et.pipeline.length - 1 && (
                            <ArrowRight size={14} className="text-muted-foreground/30 mx-0.5 flex-shrink-0" />
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Info */}
      <div className="bg-primary/5 border border-primary/10 rounded-xl p-4">
        <p className="text-xs text-muted-foreground">
          <strong className="text-foreground">💡 Notă:</strong> Pipeline-urile definite aici controlează etapele din Kanban-ul CRM, filtrele de status, și rapoartele de conversie.
          Modificările trebuie salvate explicit cu butonul <strong className="text-foreground">Salvează</strong>.
          Reordonarea se face cu săgețile ↑↓ de pe fiecare etapă.
        </p>
      </div>

      {/* ── Sticky Save Bar ── */}
      {isDirty && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
          <div className="flex items-center gap-3 px-5 py-3 bg-surface border border-border rounded-2xl shadow-2xl">
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-xs font-medium text-foreground">
              {changeCount} modificăr{changeCount > 1 ? "i" : "e"} nesalvat{changeCount > 1 ? "e" : "ă"}
            </span>
            <div className="w-px h-5 bg-border" />
            <button onClick={handleRevert} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors">
              <Undo2 size={12} /> Anulează
            </button>
            <button onClick={handleSave} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors shadow-sm">
              <Save size={12} /> Salvează Modificările
            </button>
          </div>
        </div>
      )}

      {/* ── Toast notification ── */}
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

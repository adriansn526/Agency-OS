"use client"

// ─── Report Widget Editor ───
// Admin panel for configuring which widgets appear on the public report,
// their order, and their size. Inspired by Looker Studio widget panels.

import { useState, useCallback } from "react"
import {
  GripVertical, X, Plus, Save, ChevronDown, ChevronUp,
  LayoutGrid, Loader2, Eye, EyeOff, Maximize2, Columns2, Columns3
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  WIDGET_CATALOG,
  getWidgetCatalogGrouped,
  getWidgetDefinition,
  migrateWidgetConfigs,
  type WidgetConfig,
  type WidgetSize,
} from "@/lib/report-widget-catalog"

interface WidgetEditorProps {
  reportId: string
  initialWidgets: Array<{ type: string; label?: string; enabled: boolean; order?: number; size?: string }>
  onSave?: (widgets: WidgetConfig[]) => void
  onClose?: () => void
}

const SIZE_OPTIONS: { value: WidgetSize; label: string; icon: React.ReactNode }[] = [
  { value: "full", label: "Full", icon: <Maximize2 size={12} /> },
  { value: "half", label: "Half", icon: <Columns2 size={12} /> },
  { value: "third", label: "Third", icon: <Columns3 size={12} /> },
]

export function ReportWidgetEditor({ reportId, initialWidgets, onSave, onClose }: WidgetEditorProps) {
  const [widgets, setWidgets] = useState<WidgetConfig[]>(() =>
    migrateWidgetConfigs(initialWidgets as any)
  )
  const [saving, setSaving] = useState(false)
  const [showCatalog, setShowCatalog] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  
  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  // ── Move widget up/down ──
  const moveWidget = useCallback((index: number, direction: "up" | "down") => {
    setWidgets(prev => {
      const next = [...prev]
      const swapIndex = direction === "up" ? index - 1 : index + 1
      if (swapIndex < 0 || swapIndex >= next.length) return prev
      // Swap order values
      const tempOrder = next[index]!.order
      next[index]!.order = next[swapIndex]!.order
      next[swapIndex]!.order = tempOrder
      // Sort by order
      return next.sort((a, b) => a.order - b.order)
    })
  }, [])

  // ── Drag and Drop handlers ──
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = "move"
    // Set a transparent drag image if desired, or let the browser handle it
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === targetIndex) return

    setWidgets(prev => {
      const next = [...prev]
      const draggedItem = next[draggedIndex]!
      
      // Remove from old position
      next.splice(draggedIndex, 1)
      // Insert at new position
      next.splice(targetIndex, 0, draggedItem)
      
      // Update all order fields based on new index
      return next.map((w, i) => ({ ...w, order: i }))
    })
    setDraggedIndex(null)
  }

  // ── Toggle enable/disable ──
  const toggleEnabled = useCallback((type: string) => {
    setWidgets(prev => prev.map(w =>
      w.type === type ? { ...w, enabled: !w.enabled } : w
    ))
  }, [])

  // ── Change size ──
  const changeSize = useCallback((type: string, size: WidgetSize) => {
    setWidgets(prev => prev.map(w =>
      w.type === type ? { ...w, size } : w
    ))
  }, [])

  // ── Remove widget ──
  const removeWidget = useCallback((type: string) => {
    setWidgets(prev => {
      const filtered = prev.filter(w => w.type !== type)
      return filtered.map((w, i) => ({ ...w, order: i }))
    })
  }, [])

  // ── Add widget from catalog ──
  const addWidget = useCallback((type: string) => {
    const def = getWidgetDefinition(type)
    if (!def) return
    if (widgets.some(w => w.type === type)) {
      setToast(`⚠️ Widget-ul "${def.label}" există deja.`)
      setTimeout(() => setToast(null), 3000)
      return
    }
    setWidgets(prev => [
      ...prev,
      {
        type: def.type,
        label: def.label,
        enabled: true,
        order: prev.length,
        size: def.defaultSize,
      },
    ])
    setShowCatalog(false)
  }, [widgets])

  // ── Save ──
  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/reports/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ widgets }),
      })
      if (res.ok) {
        setToast("✅ Layout salvat cu succes!")
        onSave?.(widgets)
      } else {
        const json = await res.json()
        setToast(`❌ ${json.error || "Eroare la salvare"}`)
      }
    } catch (err: any) {
      setToast(`❌ ${err.message}`)
    } finally {
      setSaving(false)
      setTimeout(() => setToast(null), 4000)
    }
  }

  const catalogGrouped = getWidgetCatalogGrouped()
  const activeTypes = new Set(widgets.map(w => w.type))

  return (
    <div className="bg-surface rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-muted/20">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <LayoutGrid size={16} className="text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Configurare Widget-uri</h3>
            <p className="text-[10px] text-muted-foreground">
              {widgets.filter(w => w.enabled).length} active din {widgets.length} · Drag pentru reordonare
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCatalog(!showCatalog)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors",
              showCatalog
                ? "bg-primary text-primary-foreground"
                : "bg-muted/30 text-foreground border border-border hover:bg-muted/50"
            )}
          >
            <Plus size={12} /> Adaugă Widget
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:opacity-90 disabled:opacity-50 transition-all"
          >
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
            Salvează
          </button>
          {onClose && (
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground">
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="px-5 py-2 bg-muted/30 border-b border-border text-xs text-foreground animate-fade-in">
          {toast}
        </div>
      )}

      {/* Widget Catalog Dropdown */}
      {showCatalog && (
        <div className="px-5 py-4 bg-muted/10 border-b border-border animate-fade-in">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Catalog Widget-uri — click pentru a adăuga
          </p>
          <div className="space-y-4">
            {Object.entries(catalogGrouped).map(([category, items]) => (
              <div key={category}>
                <p className="text-[10px] font-bold text-muted-foreground mb-2">{category}</p>
                <div className="flex flex-wrap gap-2">
                  {items.map(item => {
                    const alreadyAdded = activeTypes.has(item.type)
                    return (
                      <button
                        key={item.type}
                        onClick={() => !alreadyAdded && addWidget(item.type)}
                        disabled={alreadyAdded}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-all",
                          alreadyAdded
                            ? "bg-muted/20 text-muted-foreground border-border/50 opacity-50 cursor-not-allowed"
                            : "bg-surface border-border hover:bg-primary/5 hover:border-primary/30 text-foreground cursor-pointer"
                        )}
                        title={item.description}
                      >
                        <span>{item.icon}</span>
                        <span>{item.label}</span>
                        {alreadyAdded && <span className="text-[9px] opacity-60">✓ adăugat</span>}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="divide-y divide-border/50">
        {widgets.map((widget, index) => {
          const def = getWidgetDefinition(widget.type)
          const isDragged = draggedIndex === index

          return (
            <div
              key={widget.type}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={() => setDraggedIndex(null)}
              className={cn(
                "flex items-center gap-3 px-5 py-3 transition-all group",
                widget.enabled ? "bg-surface" : "bg-muted/10 opacity-60",
                isDragged ? "opacity-30 scale-[0.98] border-dashed border-2 border-primary" : "",
                "hover:bg-muted/5 cursor-grab active:cursor-grabbing"
              )}
            >
              {/* Drag Handle (Grip) */}
              <div className="flex flex-col gap-0.5 text-muted-foreground/50 group-hover:text-muted-foreground cursor-grab">
                <GripVertical size={16} />
              </div>

              {/* Icon */}
              <span className="text-base flex-shrink-0" title={def?.category}>
                {def?.icon || "📊"}
              </span>

              {/* Label */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">{widget.label}</p>
                <p className="text-[10px] text-muted-foreground truncate">{def?.description || widget.type}</p>
              </div>

              {/* Size Selector */}
              <div className="flex items-center gap-0.5 bg-muted/20 rounded-lg p-0.5 border border-border/50">
                {SIZE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => changeSize(widget.type, opt.value)}
                    className={cn(
                      "flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold transition-colors",
                      widget.size === opt.value
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    title={`Size: ${opt.label}`}
                  >
                    {opt.icon}
                    <span className="hidden md:inline">{opt.label}</span>
                  </button>
                ))}
              </div>

              {/* Enable/Disable Toggle */}
              <button
                onClick={() => toggleEnabled(widget.type)}
                className={cn(
                  "p-1.5 rounded-lg transition-colors",
                  widget.enabled
                    ? "text-emerald-500 hover:bg-emerald-50"
                    : "text-muted-foreground hover:bg-muted/50"
                )}
                title={widget.enabled ? "Dezactivează" : "Activează"}
              >
                {widget.enabled ? <Eye size={14} /> : <EyeOff size={14} />}
              </button>

              {/* Remove */}
              <button
                onClick={() => removeWidget(widget.type)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
                title="Elimină widget"
              >
                <X size={14} />
              </button>
            </div>
          )
        })}
      </div>

      {/* Footer summary */}
      <div className="px-5 py-3 bg-muted/10 border-t border-border flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">
          {widgets.filter(w => w.enabled).length} widget-uri active ·{" "}
          {widgets.filter(w => w.size === "full").length} full ·{" "}
          {widgets.filter(w => w.size === "half").length} half ·{" "}
          {widgets.filter(w => w.size === "third").length} third
        </span>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:opacity-90 disabled:opacity-50 transition-all"
        >
          {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
          Salvează Layout
        </button>
      </div>
    </div>
  )
}

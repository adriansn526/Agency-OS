"use client"

import { useState, useRef, useEffect } from "react"
import { useBusinessLine } from "@/components/business-line-context"
import { cn } from "@/lib/utils"
import { ChevronDown, Search, Check } from "lucide-react"

/* ============================================================
   ADAPTIVE SWITCHER
   ≤4 → Tab-uri inline
   5-7 → Dropdown cu search
   8+ → Dropdown cu grupare + search
   ============================================================ */

export function BusinessLineSwitcher({ compact = false }: { compact?: boolean }) {
  const { activeLineId, setActiveLineId, lines } = useBusinessLine()

  const allOptions = [
    {
      id: "all" as const,
      label: "Toate",
      icon: "📊",
      bgClass: "bg-muted",
      textClass: "text-foreground",
    },
    ...lines.map((bl) => ({
      id: bl.id,
      label: compact ? bl.shortName : bl.name,
      icon: bl.icon,
      bgClass: bl.bgClass,
      textClass: bl.textClass,
    })),
  ]

  // Total = business lines + "Toate"
  const totalCount = allOptions.length

  if (totalCount <= 7) {
    return <TabsSwitcher options={allOptions} activeId={activeLineId} onSelect={setActiveLineId} />
  }

  return <DropdownSwitcher options={allOptions} activeId={activeLineId} onSelect={setActiveLineId} grouped={totalCount > 8} />
}

/* ─── Tab-uri Inline ─────────────────────────── */

interface SwitcherOption {
  id: string
  label: string
  icon: string
  bgClass: string
  textClass: string
}

function TabsSwitcher({
  options,
  activeId,
  onSelect,
}: {
  options: SwitcherOption[]
  activeId: string
  onSelect: (id: string) => void
}) {
  return (
    <div className="flex items-center gap-0.5 bg-muted/60 rounded-lg p-0.5 border border-border/50">
      {options.map((opt) => {
        const isActive = activeId === opt.id
        return (
          <button
            key={opt.id}
            onClick={() => onSelect(opt.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200",
              isActive
                ? "bg-surface text-foreground shadow-sm border border-border/50"
                : "text-muted-foreground hover:text-foreground hover:bg-surface/50"
            )}
          >
            <span className="text-sm leading-none">{opt.icon}</span>
            <span className="hidden sm:inline">{opt.label}</span>
          </button>
        )
      })}
    </div>
  )
}

/* ─── Dropdown Switcher ──────────────────────── */

function DropdownSwitcher({
  options,
  activeId,
  onSelect,
  grouped = false,
}: {
  options: SwitcherOption[]
  activeId: string
  onSelect: (id: string) => void
  grouped?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const active = options.find((o) => o.id === activeId) || options[0]!
  const filtered = search
    ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
    : options

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 border",
          "bg-muted/60 border-border/50 hover:bg-muted text-foreground"
        )}
      >
        <span className="text-sm leading-none">{active.icon}</span>
        <span>{active.label}</span>
        <ChevronDown size={12} className={cn("transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute top-full mt-1 left-0 z-50 w-56 bg-surface rounded-xl border border-border shadow-xl animate-fade-in overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Caută business line..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-7 pl-7 pr-2 bg-muted/50 rounded-md border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
                autoFocus
              />
            </div>
          </div>

          {/* Options */}
          <div className="max-h-64 overflow-y-auto py-1">
            {filtered.map((opt) => (
              <button
                key={opt.id}
                onClick={() => {
                  onSelect(opt.id)
                  setOpen(false)
                  setSearch("")
                }}
                className={cn(
                  "flex items-center gap-2.5 w-full px-3 py-2 text-xs transition-colors",
                  activeId === opt.id
                    ? "bg-primary/5 text-primary font-semibold"
                    : "text-foreground hover:bg-muted/50"
                )}
              >
                <span className="text-sm leading-none">{opt.icon}</span>
                <span className="flex-1 text-left">{opt.label}</span>
                {activeId === opt.id && <Check size={12} className="text-primary" />}
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="px-3 py-4 text-xs text-muted-foreground text-center">Niciun rezultat</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ============================================================
   ENTITY TYPE SELECTOR (Level 2)
   Apare doar când BL selectată are 2+ entity types
   ============================================================ */

export function EntityTypeSelector() {
  const { activeLine, hasMultipleTypes, entityTypes, activeEntityTypeId, setActiveEntityTypeId } = useBusinessLine()

  if (!activeLine || !hasMultipleTypes) return null

  const options = [
    { id: "all", label: "Toate", icon: "📋" },
    ...entityTypes.map((et) => ({
      id: et.id,
      label: et.namePlural,
      icon: et.icon,
    })),
  ]

  return (
    <div className="flex items-center gap-0.5 bg-muted/40 rounded-lg p-0.5">
      {options.map((opt) => {
        const isActive = activeEntityTypeId === opt.id
        return (
          <button
            key={opt.id}
            onClick={() => setActiveEntityTypeId(opt.id)}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all duration-200",
              isActive
                ? "bg-surface text-foreground shadow-xs border border-border/50"
                : "text-muted-foreground hover:text-foreground hover:bg-surface/30"
            )}
          >
            <span className="text-xs leading-none">{opt.icon}</span>
            <span>{opt.label}</span>
          </button>
        )
      })}
    </div>
  )
}

/* ============================================================
   BUSINESS LINE BADGE (for tables/cards)
   ============================================================ */

export function BusinessLineBadge({ lineId }: { lineId: string }) {
  const { lines } = useBusinessLine()
  const line = lines.find((bl) => bl.id === lineId)
  if (!line) return null

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold rounded-md",
        line.bgClass,
        line.textClass
      )}
    >
      <span className="leading-none">{line.icon}</span>
      <span>{line.shortName}</span>
    </span>
  )
}

/** Dual badge: Business Line + Entity Type */
export function EntityBadge({ lineId, entityTypeId }: { lineId: string; entityTypeId: string }) {
  const { lines } = useBusinessLine()
  const line = lines.find((bl) => bl.id === lineId)
  if (!line) return null

  const et = line.entityTypes.find((et) => et.id === entityTypeId)

  return (
    <div className="flex items-center gap-1">
      <span
        className={cn(
          "inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold rounded-md",
          line.bgClass,
          line.textClass
        )}
      >
        <span className="leading-none">{line.icon}</span>
        <span>{line.shortName}</span>
      </span>
      {et && line.entityTypes.length > 1 && (
        <span className="inline-flex items-center gap-0.5 px-1 py-0.5 text-[9px] font-medium rounded bg-muted text-muted-foreground">
          {et.icon} {et.name}
        </span>
      )}
    </div>
  )
}

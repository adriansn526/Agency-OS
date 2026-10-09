"use client"

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  COMPARE_OPTIONS,
  PRESETS,
  formatRangeLabel,
  getComparisonRange,
  getPresetRange,
  matchPreset,
  type CompareMode,
  type DateRange,
} from "@/lib/reports/periods"

// ─── Period picker (admin reports page) ───
// Quick presets + custom dates + optional comparison period.

const inputClass =
  "px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-zinc-900 dark:text-white dark:[color-scheme:dark]"

export function PeriodPicker({ range, onChange, compare, onCompareChange }: {
  range: DateRange
  onChange: (r: DateRange) => void
  compare: CompareMode
  onCompareChange: (m: CompareMode) => void
}) {
  const active = matchPreset(range)
  const compareRange = getComparisonRange(range, compare)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map(p => (
            <button
              key={p.key}
              type="button"
              onClick={() => onChange(getPresetRange(p.key))}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors",
                active === p.key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/20 text-muted-foreground border-border hover:bg-muted/40 hover:text-foreground"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <input type="date" value={range.from} max={range.to}
            onChange={e => e.target.value && onChange({ ...range, from: e.target.value })} className={inputClass} />
          <span className="text-muted-foreground text-xs">→</span>
          <input type="date" value={range.to} min={range.from}
            onChange={e => e.target.value && onChange({ ...range, to: e.target.value })} className={inputClass} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Comparație</label>
        <select
          value={compare}
          onChange={e => onCompareChange(e.target.value as CompareMode)}
          className={inputClass}
        >
          {COMPARE_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
        </select>
        {compareRange && (
          <span className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{formatRangeLabel(range)}</span>
            {" "}față de{" "}
            <span className="font-semibold text-foreground">{formatRangeLabel(compareRange)}</span>
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Delta badge ───
// pct: relative change (counts, clicks...). abs: difference in the metric's own unit (position, rates).
// invert: lower is better (position, bounce, CPC).

export function DeltaBadge({ cur, prev, mode = "pct", invert = false, neutral = false, unit = "", digits = 1 }: {
  cur: number | undefined | null
  prev: number | undefined | null
  mode?: "pct" | "abs"
  invert?: boolean
  /** Direction is shown but not judged good/bad (e.g. spend) */
  neutral?: boolean
  unit?: string
  digits?: number
}) {
  if (cur == null || prev == null) return null

  let value: number
  let label: string
  if (mode === "abs") {
    value = cur - prev
    label = `${value > 0 ? "+" : ""}${value.toFixed(digits)}${unit}`
  } else if (prev === 0) {
    if (cur === 0) return <Neutral label="0%" />
    return <Neutral label="nou" />
  } else {
    value = ((cur - prev) / Math.abs(prev)) * 100
    label = `${value > 0 ? "+" : ""}${value.toFixed(Math.abs(value) < 10 ? 1 : 0)}%`
  }

  if (Math.abs(value) < 0.05) return <Neutral label={label} />

  const good = invert ? value < 0 : value > 0
  const Icon = value > 0 ? ArrowUpRight : ArrowDownRight
  return (
    <span className={cn(
      "inline-flex items-center gap-0.5 text-[11px] font-semibold",
      neutral ? "text-muted-foreground" : good ? "text-emerald-500" : "text-red-500"
    )}>
      <Icon size={12} />{label}
    </span>
  )
}

function Neutral({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-muted-foreground">
      <Minus size={12} />{label}
    </span>
  )
}

"use client"

import { useState, useRef, useEffect, useMemo, useCallback } from "react"
import { cn } from "@/lib/utils"
import { Calendar, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react"

/* ============================================================
   Types
   ============================================================ */

interface DateRange {
  start: Date
  end: Date
}

interface DateRangePickerProps {
  value: DateRange
  onChange: (range: DateRange) => void
  className?: string
}

/* ============================================================
   Preset Definitions
   ============================================================ */

type PresetKey =
  | "today"
  | "yesterday"
  | "this_week"
  | "last_7_days"
  | "last_week"
  | "last_14_days"
  | "this_month"
  | "last_30_days"
  | "last_month"
  | "all_time"

interface Preset {
  key: PresetKey
  label: string
  getRange: () => DateRange
}

function getMonday(d: Date): Date {
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(d.getFullYear(), d.getMonth(), diff)
}

const presets: Preset[] = [
  {
    key: "today",
    label: "Azi",
    getRange: () => {
      const d = new Date()
      return { start: new Date(d.getFullYear(), d.getMonth(), d.getDate()), end: new Date(d.getFullYear(), d.getMonth(), d.getDate()) }
    },
  },
  {
    key: "yesterday",
    label: "Ieri",
    getRange: () => {
      const d = new Date()
      d.setDate(d.getDate() - 1)
      return { start: new Date(d.getFullYear(), d.getMonth(), d.getDate()), end: new Date(d.getFullYear(), d.getMonth(), d.getDate()) }
    },
  },
  {
    key: "this_week",
    label: "Săptămâna aceasta (L – Azi)",
    getRange: () => {
      const today = new Date()
      const mon = getMonday(today)
      return { start: mon, end: new Date(today.getFullYear(), today.getMonth(), today.getDate()) }
    },
  },
  {
    key: "last_7_days",
    label: "Ultimele 7 zile",
    getRange: () => {
      const today = new Date()
      const start = new Date(today)
      start.setDate(start.getDate() - 6)
      return { start: new Date(start.getFullYear(), start.getMonth(), start.getDate()), end: new Date(today.getFullYear(), today.getMonth(), today.getDate()) }
    },
  },
  {
    key: "last_week",
    label: "Săptămâna trecută (L – D)",
    getRange: () => {
      const today = new Date()
      const thisMon = getMonday(today)
      const lastMon = new Date(thisMon)
      lastMon.setDate(lastMon.getDate() - 7)
      const lastSun = new Date(lastMon)
      lastSun.setDate(lastSun.getDate() + 6)
      return { start: lastMon, end: lastSun }
    },
  },
  {
    key: "last_14_days",
    label: "Ultimele 14 zile",
    getRange: () => {
      const today = new Date()
      const start = new Date(today)
      start.setDate(start.getDate() - 13)
      return { start: new Date(start.getFullYear(), start.getMonth(), start.getDate()), end: new Date(today.getFullYear(), today.getMonth(), today.getDate()) }
    },
  },
  {
    key: "this_month",
    label: "Luna aceasta",
    getRange: () => {
      const today = new Date()
      return { start: new Date(today.getFullYear(), today.getMonth(), 1), end: new Date(today.getFullYear(), today.getMonth(), today.getDate()) }
    },
  },
  {
    key: "last_30_days",
    label: "Ultimele 30 zile",
    getRange: () => {
      const today = new Date()
      const start = new Date(today)
      start.setDate(start.getDate() - 29)
      return { start: new Date(start.getFullYear(), start.getMonth(), start.getDate()), end: new Date(today.getFullYear(), today.getMonth(), today.getDate()) }
    },
  },
  {
    key: "last_month",
    label: "Luna trecută",
    getRange: () => {
      const today = new Date()
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      const end = new Date(today.getFullYear(), today.getMonth(), 0)
      return { start, end }
    },
  },
  {
    key: "all_time",
    label: "Tot timpul",
    getRange: () => {
      return { start: new Date(2024, 0, 1), end: new Date() }
    },
  },
]

/* ============================================================
   Calendar Grid
   ============================================================ */

const MONTHS_RO = [
  "Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie",
  "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie",
]
const DAYS_RO = ["L", "M", "M", "J", "V", "S", "D"]

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function isInRange(day: Date, start: Date, end: Date): boolean {
  const d = day.getTime()
  return d >= start.getTime() && d <= end.getTime()
}

function CalendarMonth({
  year,
  month,
  rangeStart,
  rangeEnd,
  onDayClick,
  hoverDate,
  onDayHover,
}: {
  year: number
  month: number
  rangeStart: Date | null
  rangeEnd: Date | null
  onDayClick: (d: Date) => void
  hoverDate: Date | null
  onDayHover: (d: Date | null) => void
}) {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Days from previous month to fill the first row
  let startDow = firstDay.getDay() - 1 // Monday = 0
  if (startDow < 0) startDow = 6

  const days: (Date | null)[] = []
  for (let i = 0; i < startDow; i++) days.push(null)
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push(new Date(year, month, i))
  }

  // Effective end for highlight (either rangeEnd or hoverDate during selection)
  const effectiveEnd = rangeEnd || hoverDate

  return (
    <div>
      <div className="text-xs font-bold text-foreground uppercase tracking-wider mb-2">
        {MONTHS_RO[month]} {year}
      </div>
      {/* Day headers */}
      <div className="grid grid-cols-7 gap-0 mb-1">
        {DAYS_RO.map((d, i) => (
          <div key={i} className="text-center text-[10px] font-semibold text-muted-foreground py-1">
            {d}
          </div>
        ))}
      </div>
      {/* Day cells */}
      <div className="grid grid-cols-7 gap-0">
        {days.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} className="h-8" />

          const isToday = isSameDay(day, today)
          const isStart = rangeStart && isSameDay(day, rangeStart)
          const isEnd = effectiveEnd && isSameDay(day, effectiveEnd)
          const inRange =
            rangeStart && effectiveEnd && isInRange(day, rangeStart, effectiveEnd)
          const isFuture = day > today

          return (
            <button
              key={day.toISOString()}
              onClick={() => !isFuture && onDayClick(day)}
              onMouseEnter={() => !isFuture && onDayHover(day)}
              onMouseLeave={() => onDayHover(null)}
              disabled={isFuture}
              className={cn(
                "h-8 w-full text-[11px] font-medium transition-colors relative",
                isFuture && "text-muted-foreground/30 cursor-not-allowed",
                !isFuture && "hover:bg-primary/10 cursor-pointer",
                inRange && !isStart && !isEnd && "bg-primary/10",
                isStart && "bg-primary text-primary-foreground rounded-l-md",
                isEnd && "bg-primary text-primary-foreground rounded-r-md",
                isStart && isEnd && "rounded-md",
                isToday && !isStart && !isEnd && "font-bold text-primary ring-1 ring-primary/30 rounded-md"
              )}
            >
              {day.getDate()}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ============================================================
   Date Format
   ============================================================ */

function formatDateShort(d: Date): string {
  return `${d.getDate()} ${MONTHS_RO[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`
}

function formatDateInput(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`
}

/* ============================================================
   Main Component
   ============================================================ */

export function DateRangePicker({ value, onChange, className }: DateRangePickerProps) {
  const [open, setOpen] = useState(false)
  const [selecting, setSelecting] = useState<"start" | "end" | null>(null)
  const [tempStart, setTempStart] = useState<Date | null>(value.start)
  const [tempEnd, setTempEnd] = useState<Date | null>(value.end)
  const [hoverDate, setHoverDate] = useState<Date | null>(null)
  const [activePreset, setActivePreset] = useState<PresetKey | null>("this_month")
  const [calendarMonth, setCalendarMonth] = useState(value.start.getMonth())
  const [calendarYear, setCalendarYear] = useState(value.start.getFullYear())
  const [customDays, setCustomDays] = useState("")
  const [customTarget, setCustomTarget] = useState<"today" | "yesterday">("today")

  const dropdownRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  // Close on click outside
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    document.addEventListener("keydown", handleEsc)
    return () => {
      document.removeEventListener("mousedown", handleClick)
      document.removeEventListener("keydown", handleEsc)
    }
  }, [open])

  // Sync temp values when opened
  useEffect(() => {
    if (open) {
      setTempStart(value.start)
      setTempEnd(value.end)
      setSelecting(null)
      setCalendarMonth(value.start.getMonth())
      setCalendarYear(value.start.getFullYear())
    }
  }, [open, value.start, value.end])

  const handleDayClick = useCallback((day: Date) => {
    if (!selecting || selecting === "start") {
      setTempStart(day)
      setTempEnd(null)
      setSelecting("end")
      setActivePreset(null)
    } else {
      // End selection
      if (tempStart && day < tempStart) {
        setTempEnd(tempStart)
        setTempStart(day)
      } else {
        setTempEnd(day)
      }
      setSelecting(null)
      setActivePreset(null)
    }
  }, [selecting, tempStart])

  const handlePresetClick = (preset: Preset) => {
    const range = preset.getRange()
    setTempStart(range.start)
    setTempEnd(range.end)
    setActivePreset(preset.key)
    setSelecting(null)
    setCalendarMonth(range.start.getMonth())
    setCalendarYear(range.start.getFullYear())
  }

  const handleApply = () => {
    if (tempStart && tempEnd) {
      onChange({ start: tempStart, end: tempEnd })
      setOpen(false)
    }
  }

  const handleCustomDays = () => {
    const days = parseInt(customDays)
    if (isNaN(days) || days <= 0) return

    const target = new Date()
    if (customTarget === "yesterday") target.setDate(target.getDate() - 1)

    const start = new Date(target)
    start.setDate(start.getDate() - days + 1)

    setTempStart(new Date(start.getFullYear(), start.getMonth(), start.getDate()))
    setTempEnd(new Date(target.getFullYear(), target.getMonth(), target.getDate()))
    setActivePreset(null)
    setSelecting(null)
    setCalendarMonth(start.getMonth())
    setCalendarYear(start.getFullYear())
  }

  const prevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11)
      setCalendarYear(calendarYear - 1)
    } else {
      setCalendarMonth(calendarMonth - 1)
    }
  }

  const nextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0)
      setCalendarYear(calendarYear + 1)
    } else {
      setCalendarMonth(calendarMonth + 1)
    }
  }

  // Second calendar month
  const nextCalMonth = calendarMonth === 11 ? 0 : calendarMonth + 1
  const nextCalYear = calendarMonth === 11 ? calendarYear + 1 : calendarYear

  const rangeLabel = `${formatDateShort(value.start)} — ${formatDateShort(value.end)}`

  return (
    <div className={cn("relative", className)}>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 bg-surface border border-border rounded-lg text-xs font-medium text-foreground hover:bg-muted transition-colors"
      >
        <Calendar size={14} className="text-muted-foreground" />
        <span className="hidden sm:inline">{rangeLabel}</span>
        <span className="sm:hidden">{formatDateShort(value.start).split(" ").slice(0, 2).join(" ")}</span>
        <ChevronDown size={12} className={cn("text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          ref={dropdownRef}
          className="absolute right-0 top-full mt-2 z-50 bg-surface border border-border rounded-xl shadow-2xl overflow-hidden animate-fade-in"
          style={{ width: "min(680px, 95vw)" }}
        >
          <div className="flex flex-col sm:flex-row">
            {/* Left — Presets */}
            <div className="w-full sm:w-48 border-b sm:border-b-0 sm:border-r border-border p-3 bg-muted/20">
              <div className="space-y-0.5">
                {presets.map((p) => (
                  <button
                    key={p.key}
                    onClick={() => handlePresetClick(p)}
                    className={cn(
                      "w-full text-left px-3 py-1.5 rounded-md text-xs transition-colors",
                      activePreset === p.key
                        ? "bg-primary text-primary-foreground font-semibold"
                        : "text-foreground hover:bg-muted"
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Custom days input */}
              <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={customDays}
                    onChange={(e) => setCustomDays(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCustomDays()}
                    placeholder="30"
                    className="w-12 px-2 py-1 text-xs bg-surface border border-border rounded text-foreground text-center"
                    min={1}
                    max={365}
                  />
                  <button
                    onClick={() => { setCustomTarget("today"); handleCustomDays() }}
                    className={cn(
                      "text-[10px] text-muted-foreground hover:text-foreground transition-colors",
                      customTarget === "today" && "text-primary font-semibold"
                    )}
                  >
                    zile până azi
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={customDays}
                    onChange={(e) => setCustomDays(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCustomDays()}
                    placeholder="30"
                    className="w-12 px-2 py-1 text-xs bg-surface border border-border rounded text-foreground text-center"
                    min={1}
                    max={365}
                  />
                  <button
                    onClick={() => { setCustomTarget("yesterday"); handleCustomDays() }}
                    className={cn(
                      "text-[10px] text-muted-foreground hover:text-foreground transition-colors",
                      customTarget === "yesterday" && "text-primary font-semibold"
                    )}
                  >
                    zile până ieri
                  </button>
                </div>
              </div>
            </div>

            {/* Right — Calendar */}
            <div className="flex-1 p-4">
              {/* Date inputs */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1">
                  <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Start</label>
                  <div className={cn(
                    "mt-1 px-3 py-1.5 rounded-lg border text-xs font-medium tabular-nums",
                    selecting === "start" || selecting === null
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border text-foreground"
                  )}>
                    {tempStart ? formatDateInput(tempStart) : "—"}
                  </div>
                </div>
                <span className="text-muted-foreground mt-4">—</span>
                <div className="flex-1">
                  <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">End</label>
                  <div className={cn(
                    "mt-1 px-3 py-1.5 rounded-lg border text-xs font-medium tabular-nums",
                    selecting === "end"
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border text-foreground"
                  )}>
                    {tempEnd ? formatDateInput(tempEnd) : "—"}
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={prevMonth}
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                <div className="text-xs font-semibold text-foreground">
                  {MONTHS_RO[calendarMonth]} {calendarYear}
                </div>
                <button
                  onClick={nextMonth}
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              {/* Calendar Grids — side by side on desktop */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <CalendarMonth
                  year={calendarYear}
                  month={calendarMonth}
                  rangeStart={tempStart}
                  rangeEnd={tempEnd}
                  onDayClick={handleDayClick}
                  hoverDate={selecting === "end" ? hoverDate : null}
                  onDayHover={setHoverDate}
                />
                <CalendarMonth
                  year={nextCalYear}
                  month={nextCalMonth}
                  rangeStart={tempStart}
                  rangeEnd={tempEnd}
                  onDayClick={handleDayClick}
                  hoverDate={selecting === "end" ? hoverDate : null}
                  onDayHover={setHoverDate}
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 mt-4 pt-3 border-t border-border/50">
                <button
                  onClick={() => setOpen(false)}
                  className="px-4 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Anulează
                </button>
                <button
                  onClick={handleApply}
                  disabled={!tempStart || !tempEnd}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors",
                    tempStart && tempEnd
                      ? "bg-primary text-primary-foreground hover:bg-primary-hover"
                      : "bg-muted text-muted-foreground cursor-not-allowed"
                  )}
                >
                  Aplică
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DateRangePickerProps {
  from: string
  to: string
  onChange: (from: string, to: string) => void
  className?: string
}

const PRESETS: { label: string; getValue: () => [string, string] }[] = [
  { label: 'Azi', getValue: () => { const d = fmt(new Date()); return [d, d] as [string, string] } },
  { label: 'Ieri', getValue: () => { const d = new Date(); d.setDate(d.getDate() - 1); const s = fmt(d); return [s, s] } },
  { label: 'Ultimele 7 zile', getValue: () => rangeAgo(7) },
  { label: 'Ultimele 14 zile', getValue: () => rangeAgo(14) },
  { label: 'Ultimele 30 zile', getValue: () => rangeAgo(30) },
  { label: 'Săptămâna aceasta', getValue: () => { const now = new Date(); const d = now.getDay() || 7; const mon = new Date(now); mon.setDate(now.getDate() - d + 1); return [fmt(mon), fmt(now)] } },
  { label: 'Luna aceasta', getValue: () => { const now = new Date(); return [fmt(new Date(now.getFullYear(), now.getMonth(), 1)), fmt(now)] } },
  { label: 'Luna trecută', getValue: () => { const now = new Date(); const s = new Date(now.getFullYear(), now.getMonth() - 1, 1); const e = new Date(now.getFullYear(), now.getMonth(), 0); return [fmt(s), fmt(e)] } },
  { label: 'Ultimele 90 zile', getValue: () => rangeAgo(90) },
]

function fmt(d: Date): string {
  return d.toISOString().split('T')[0]!
}

function rangeAgo(days: number): [string, string] {
  const now = new Date()
  const ago = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
  return [fmt(ago), fmt(now)]
}

function parseDate(s: string): Date {
  const parts = s.split('-').map(Number)
  return new Date(parts[0]!, parts[1]! - 1, parts[2]!)
}

const MONTHS_RO = ['Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie', 'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie']
const DAYS_RO = ['Lu', 'Ma', 'Mi', 'Jo', 'Vi', 'Sâ', 'Du']

function CalendarMonth({ year, month, from, to, hoverDate, onSelect, onHover }: {
  year: number; month: number; from: string | null; to: string | null;
  hoverDate: string | null;
  onSelect: (date: string) => void; onHover: (date: string | null) => void;
}) {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startWeekday = (firstDay.getDay() + 6) % 7
  const daysInMonth = lastDay.getDate()
  const today = fmt(new Date())

  const cells: (number | null)[] = []
  for (let i = 0; i < startWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const effectiveTo = to || hoverDate

  return (
    <div className="select-none" style={{ width: 268 }}>
      <div className="text-xs font-semibold text-foreground mb-2 text-center">
        {MONTHS_RO[month]} {year}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 34px)', gap: 4 }}>
        {DAYS_RO.map((d) => (
          <div key={d} style={{ width: 34, height: 24 }} className="text-[10px] text-muted-foreground flex items-center justify-center font-medium">{d}</div>
        ))}
        {cells.map((day, i) => {
          if (!day) return <div key={`e${i}`} style={{ width: 34, height: 34 }} />
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const isToday = dateStr === today
          const isFrom = dateStr === from
          const isTo = dateStr === effectiveTo
          const isInRange = from && effectiveTo && dateStr >= from && dateStr <= effectiveTo
          const isFuture = dateStr > today

          return (
            <button
              key={dateStr}
              disabled={isFuture}
              onClick={() => onSelect(dateStr)}
              onMouseEnter={() => onHover(dateStr)}
              onMouseLeave={() => onHover(null)}
              style={{ width: 34, height: 34 }}
              className={cn(
                "text-xs rounded-md transition-all duration-100 flex items-center justify-center",
                isFuture && "text-muted-foreground/30 cursor-not-allowed",
                !isFuture && "hover:bg-primary/10 cursor-pointer",
                isInRange && !isFrom && !isTo && "bg-primary/10 text-foreground",
                (isFrom || isTo) && "bg-primary text-white font-bold",
                isToday && !isFrom && !isTo && "ring-1 ring-primary/50",
              )}
            >
              {day}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function DateRangePicker({ from, to, onChange, className }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selFrom, setSelFrom] = useState<string | null>(from)
  const [selTo, setSelTo] = useState<string | null>(to)
  const [hoverDate, setHoverDate] = useState<string | null>(null)
  const [calMonth, setCalMonth] = useState(() => {
    const d = parseDate(from)
    return { year: d.getFullYear(), month: d.getMonth() }
  })
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false)
    }
    if (isOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isOpen])

  // Reset selection when opening
  useEffect(() => {
    if (isOpen) {
      setSelFrom(from)
      setSelTo(to)
      const d = parseDate(from)
      setCalMonth({ year: d.getFullYear(), month: d.getMonth() })
    }
  }, [isOpen])

  const nextMonth = useMemo(() => {
    const m = calMonth.month + 1
    return m > 11 ? { year: calMonth.year + 1, month: 0 } : { year: calMonth.year, month: m }
  }, [calMonth])

  function handleDaySelect(dateStr: string) {
    if (!selFrom || (selFrom && selTo)) {
      setSelFrom(dateStr)
      setSelTo(null)
    } else {
      if (dateStr < selFrom) {
        setSelTo(selFrom)
        setSelFrom(dateStr)
      } else {
        setSelTo(dateStr)
      }
    }
  }

  function handleApply() {
    if (selFrom && selTo) {
      onChange(selFrom, selTo)
      setIsOpen(false)
    }
  }

  function handlePreset(getValue: () => [string, string]) {
    const [f, t] = getValue()
    onChange(f, t)
    setIsOpen(false)
  }

  function goMonth(delta: number) {
    setCalMonth(prev => {
      let m = prev.month + delta
      let y = prev.year
      if (m < 0) { m = 11; y-- }
      if (m > 11) { m = 0; y++ }
      return { year: y, month: m }
    })
  }

  // Format display dates
  const displayFrom = parseDate(from).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric' })
  const displayTo = parseDate(to).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric' })

  // Find active preset
  const activePreset = PRESETS.find(p => {
    const [pf, pt] = p.getValue()
    return pf === from && pt === to
  })

  return (
    <div className={cn("relative", className)} ref={ref}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-muted/60 hover:bg-muted border border-border rounded-lg text-xs text-foreground transition-colors"
      >
        <Calendar size={13} className="text-muted-foreground" />
        <span className="hidden sm:inline">{activePreset?.label || `${displayFrom} — ${displayTo}`}</span>
        <span className="sm:hidden">{activePreset?.label || `${displayFrom.split(' ').slice(0, 2).join(' ')} — ${displayTo.split(' ').slice(0, 2).join(' ')}`}</span>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 z-50 bg-surface border border-border rounded-xl shadow-2xl animate-fade-in overflow-hidden">
          {/* Mobile: stacked, Desktop: side by side */}
          <div className="flex flex-col md:flex-row">
            {/* Presets sidebar */}
            <div className="md:w-44 border-b md:border-b-0 md:border-r border-border bg-muted/30 p-2 md:p-3">
              <div className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible">
                {PRESETS.map((preset) => {
                  const [pf, pt] = preset.getValue()
                  const isActive = pf === from && pt === to
                  return (
                    <button
                      key={preset.label}
                      onClick={() => handlePreset(preset.getValue as () => [string, string])}
                      className={cn(
                        "px-3 py-1.5 text-[11px] rounded-md whitespace-nowrap transition-colors text-left",
                        isActive
                          ? "bg-primary text-white font-semibold"
                          : "text-foreground hover:bg-muted"
                      )}
                    >
                      {preset.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Calendar area */}
            <div className="p-3 md:p-4">
              {/* Nav */}
              <div className="flex items-center justify-between mb-3">
                <button onClick={() => goMonth(-1)} className="w-7 h-7 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                  <ChevronLeft size={14} />
                </button>
                <div className="text-xs font-medium text-muted-foreground">
                  {selFrom && !selTo && <span className="text-primary">Selectează data de sfârșit</span>}
                  {(!selFrom) && <span className="text-primary">Selectează data de start</span>}
                  {selFrom && selTo && <span>{parseDate(selFrom).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' })} — {parseDate(selTo).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' })}</span>}
                </div>
                <button onClick={() => goMonth(1)} className="w-7 h-7 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                  <ChevronRight size={14} />
                </button>
              </div>

              {/* Calendars — 1 on mobile, 2 on desktop */}
              <div className="flex gap-6">
                <CalendarMonth
                  year={calMonth.year} month={calMonth.month}
                  from={selFrom} to={selTo} hoverDate={!selTo ? hoverDate : null}
                  onSelect={handleDaySelect} onHover={setHoverDate}
                />
                <div className="hidden md:block">
                  <CalendarMonth
                    year={nextMonth.year} month={nextMonth.month}
                    from={selFrom} to={selTo} hoverDate={!selTo ? hoverDate : null}
                    onSelect={handleDaySelect} onHover={setHoverDate}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-border">
                <button onClick={() => setIsOpen(false)} className="px-3 py-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors rounded-md">
                  Anulează
                </button>
                <button
                  onClick={handleApply}
                  disabled={!selFrom || !selTo}
                  className={cn(
                    "px-4 py-1.5 text-[11px] font-semibold rounded-md transition-colors",
                    selFrom && selTo
                      ? "bg-primary text-white hover:bg-primary/90"
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

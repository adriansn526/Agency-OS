"use client"

import { cn, formatDate, formatCurrency } from "@/lib/utils"
import type { ProjectTemplate } from "@repo/mock-data"
import { CheckCircle2, Circle, ArrowRight, Clock, DollarSign, Users, Target, Star, BarChart3, Calendar } from "lucide-react"

// ─── Shared Types ────────────────────────────────
interface ProjectViewProps {
  template: ProjectTemplate
  currentPhaseIndex: number      // which phase is active (0-based)
  checklistState: boolean[]      // parallel to template.checklist
  onToggleChecklist: (idx: number) => void
  progress: number               // 0-100
  linkedEntities?: LinkedEntity[] // for stepper view
  financials?: { income: number; expenses: number }
  kpiValues?: Record<string, string | number>
  startDate?: string
  deadline?: string
}

interface LinkedEntity {
  role: string       // "Client Final", "Instalator", "Furnizor"
  icon: string
  name: string
  status: string
  statusClass: string
  detail?: string
}

// ────────────────────────────────────────────────
// 1. TIMELINE VIEW — Agenție (proiecte lungi)
// ────────────────────────────────────────────────
export function TimelineView({ template, currentPhaseIndex, checklistState, onToggleChecklist, progress, kpiValues, startDate, deadline }: ProjectViewProps) {
  return (
    <div className="space-y-5">
      {/* Gantt-like Timeline */}
      <div className="bg-surface rounded-xl border border-border p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Calendar size={15} className="text-primary" /> Faze Proiect — {template.name}
        </h3>
        <div className="relative">
          {/* Phases as horizontal bars */}
          <div className="space-y-2">
            {template.phases.map((phase, i) => {
              const isActive = i === currentPhaseIndex
              const isDone = i < currentPhaseIndex
              const pct = isDone ? 100 : isActive ? Math.round((progress / 100) * template.phases.length - i) * 40 + 30 : 0
              return (
                <div key={phase} className="flex items-center gap-3">
                  {/* Phase indicator */}
                  <div className={cn("w-3 h-3 rounded-full flex-shrink-0 transition-all", isDone ? "bg-success" : isActive ? "bg-primary animate-pulse" : "bg-muted")} />
                  <span className={cn("text-xs font-medium w-36 flex-shrink-0", isDone ? "text-success" : isActive ? "text-primary" : "text-muted-foreground")}>{phase}</span>
                  {/* Bar */}
                  <div className="flex-1 h-6 bg-muted/50 rounded-md overflow-hidden relative">
                    <div
                      className={cn("h-full rounded-md transition-all duration-700", isDone ? "bg-success/20" : isActive ? "bg-primary/20" : "")}
                      style={{ width: `${Math.min(Math.max(pct, 0), 100)}%` }}
                    />
                    {isActive && (
                      <div className="absolute inset-0 flex items-center px-2">
                        <span className="text-[10px] font-semibold text-primary">Faza curentă</span>
                      </div>
                    )}
                    {isDone && (
                      <div className="absolute inset-0 flex items-center justify-end px-2">
                        <CheckCircle2 size={12} className="text-success" />
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          {/* Date range */}
          {startDate && deadline && (
            <div className="flex justify-between mt-3 pt-3 border-t border-border/50">
              <span className="text-[10px] text-muted-foreground">Start: {formatDate(startDate)}</span>
              <span className="text-[10px] text-muted-foreground">Deadline: {formatDate(deadline)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Checklist */}
      <ChecklistBlock items={template.checklist} state={checklistState} onToggle={onToggleChecklist} />

      {/* KPIs */}
      {kpiValues && <KPIBlock kpis={template.kpis} values={kpiValues} />}
    </div>
  )
}

// ────────────────────────────────────────────────
// 2. STEPPER VIEW — ClimaticPRO (proiecte scurte cu entități linkate)
// ────────────────────────────────────────────────
export function StepperView({ template, currentPhaseIndex, checklistState, onToggleChecklist, linkedEntities, financials, kpiValues }: ProjectViewProps) {
  return (
    <div className="space-y-5">
      {/* Horizontal Stepper */}
      <div className="bg-surface rounded-xl border border-border p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Target size={15} className="text-primary" /> Pași — {template.name}
        </h3>
        <div className="flex items-center gap-0 overflow-x-auto pb-2">
          {template.phases.map((phase, i) => {
            const isActive = i === currentPhaseIndex
            const isDone = i < currentPhaseIndex
            const isLast = i === template.phases.length - 1
            return (
              <div key={phase} className="flex items-center flex-shrink-0">
                <div className="flex flex-col items-center">
                  <div className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                    isDone ? "bg-success text-white" : isActive ? "bg-primary text-white ring-4 ring-primary/20 animate-pulse" : "bg-muted text-muted-foreground"
                  )}>
                    {isDone ? <CheckCircle2 size={16} /> : i + 1}
                  </div>
                  <span className={cn("text-[10px] mt-1.5 max-w-20 text-center leading-tight font-medium", isDone ? "text-success" : isActive ? "text-primary" : "text-muted-foreground")}>{phase}</span>
                </div>
                {!isLast && (
                  <div className={cn("w-8 h-0.5 mx-1 mt-[-12px]", isDone ? "bg-success" : "bg-muted")} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Linked Entities Panel */}
      {linkedEntities && linkedEntities.length > 0 && (
        <div className="bg-surface rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Users size={15} className="text-primary" /> Entități Implicate
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {linkedEntities.map((entity, i) => (
              <div key={i} className="bg-muted/30 rounded-lg p-3 border border-border/50 hover:border-primary/20 transition-all">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{entity.icon}</span>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{entity.role}</p>
                    <p className="text-xs font-semibold text-foreground">{entity.name}</p>
                  </div>
                </div>
                <span className={cn("px-1.5 py-0.5 text-[9px] font-semibold rounded-md", entity.statusClass)}>{entity.status}</span>
                {entity.detail && <p className="text-[10px] text-muted-foreground mt-1.5">{entity.detail}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mini P&L */}
      {financials && (
        <div className="bg-surface rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <DollarSign size={15} className="text-primary" /> Financiar Proiect
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1.5">💰 Venituri (Clienți Finali)</span>
              <span className="font-semibold text-success">+{formatCurrency(financials.income)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1.5">💸 Cheltuieli (Instalatori + Furnizori)</span>
              <span className="font-semibold text-destructive">-{formatCurrency(financials.expenses)}</span>
            </div>
            <div className="border-t border-border pt-2 flex justify-between text-sm">
              <span className="font-medium text-foreground flex items-center gap-1.5">📊 Profit Net</span>
              <span className={cn("font-bold text-base", financials.income - financials.expenses >= 0 ? "text-success" : "text-destructive")}>
                {formatCurrency(financials.income - financials.expenses)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Checklist */}
      <ChecklistBlock items={template.checklist} state={checklistState} onToggle={onToggleChecklist} />

      {/* KPIs */}
      {kpiValues && <KPIBlock kpis={template.kpis} values={kpiValues} />}
    </div>
  )
}

// ────────────────────────────────────────────────
// 3. CHECKLIST VIEW — Fudly (onboarding/setup scurt)
// ────────────────────────────────────────────────
export function ChecklistProjectView({ template, currentPhaseIndex, checklistState, onToggleChecklist, kpiValues }: ProjectViewProps) {
  const doneCount = checklistState.filter(Boolean).length
  const totalCount = checklistState.length
  const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0

  return (
    <div className="space-y-5">
      {/* Big Progress */}
      <div className="bg-surface rounded-xl border border-border p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Target size={15} className="text-primary" /> Progres Onboarding — {template.name}
        </h3>
        <div className="flex items-center gap-4 mb-4">
          <div className="relative w-20 h-20">
            <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="34" fill="none" stroke="currentColor" strokeWidth="6" className="text-muted" />
              <circle cx="40" cy="40" r="34" fill="none" stroke="currentColor" strokeWidth="6"
                className={cn(pct >= 100 ? "text-success" : "text-primary")}
                strokeDasharray={`${2 * Math.PI * 34}`}
                strokeDashoffset={`${2 * Math.PI * 34 * (1 - pct / 100)}`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-lg font-bold text-foreground">{pct}%</span>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{doneCount} din {totalCount} pași completați</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Faza curentă: <span className="font-medium text-primary">{template.phases[currentPhaseIndex] || 'Finalizat'}</span>
            </p>
          </div>
        </div>

        {/* Phase pills */}
        <div className="flex items-center gap-1 flex-wrap mb-4">
          {template.phases.map((phase, i) => (
            <span key={phase} className={cn(
              "px-2 py-0.5 text-[10px] font-medium rounded-full transition-all",
              i < currentPhaseIndex ? "bg-success/10 text-success" :
              i === currentPhaseIndex ? "bg-primary/10 text-primary ring-1 ring-primary/30" :
              "bg-muted text-muted-foreground"
            )}>{phase}</span>
          ))}
        </div>
      </div>

      {/* Interactive Checklist */}
      <div className="bg-surface rounded-xl border border-border p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3">Checklist Onboarding</h3>
        <div className="space-y-1">
          {template.checklist.map((item, i) => (
            <button
              key={i}
              onClick={() => onToggleChecklist(i)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all hover:bg-muted/50",
                checklistState[i] && "opacity-60"
              )}
            >
              <div className={cn(
                "w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all",
                checklistState[i] ? "bg-success border-success" : "border-border"
              )}>
                {checklistState[i] && <CheckCircle2 size={12} className="text-white" />}
              </div>
              <span className={cn("text-sm", checklistState[i] ? "line-through text-muted-foreground" : "text-foreground")}>{item}</span>
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      {kpiValues && <KPIBlock kpis={template.kpis} values={kpiValues} />}
    </div>
  )
}

// ────────────────────────────────────────────────
// SHARED: Checklist block (for timeline & stepper)
// ────────────────────────────────────────────────
function ChecklistBlock({ items, state, onToggle }: { items: string[]; state: boolean[]; onToggle: (i: number) => void }) {
  const doneCount = state.filter(Boolean).length
  return (
    <div className="bg-surface rounded-xl border border-border p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">Checklist</h3>
        <span className="text-[10px] text-muted-foreground font-medium">{doneCount}/{items.length}</span>
      </div>
      <div className="space-y-0.5">
        {items.map((item, i) => (
          <button
            key={i}
            onClick={() => onToggle(i)}
            className={cn(
              "w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-left transition-all hover:bg-muted/40",
              state[i] && "opacity-50"
            )}
          >
            <div className={cn(
              "w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all",
              state[i] ? "bg-success border-success" : "border-border"
            )}>
              {state[i] && <CheckCircle2 size={10} className="text-white" />}
            </div>
            <span className={cn("text-xs", state[i] ? "line-through text-muted-foreground" : "text-foreground")}>{item}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────
// SHARED: KPI block
// ────────────────────────────────────────────────
function KPIBlock({ kpis, values }: { kpis: string[]; values: Record<string, string | number> }) {
  return (
    <div className="bg-surface rounded-xl border border-border p-5">
      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <BarChart3 size={15} className="text-primary" /> KPIs
      </h3>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((kpi) => (
          <div key={kpi} className="bg-muted/30 rounded-lg p-3 border border-border/50">
            <p className="text-sm font-bold text-foreground">{values[kpi] ?? '—'}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{kpi}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────
// AUTO-SELECTOR: picks the right view based on viewType
// ────────────────────────────────────────────────
export function ProjectView(props: ProjectViewProps) {
  switch (props.template.viewType) {
    case 'timeline':
      return <TimelineView {...props} />
    case 'stepper':
      return <StepperView {...props} />
    case 'checklist':
      return <ChecklistProjectView {...props} />
    default:
      return <TimelineView {...props} />
  }
}

"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { usePanel } from "@/components/panel-context"
import { useBusinessLine } from "@/components/business-line-context"
import { BusinessLineBadge } from "@/components/business-line-switcher"
import { cn, formatCurrency, formatDate, getInitials } from "@/lib/utils"
import { NewLeadModal } from "@/components/entity-forms"
import { FilterBar, type FilterCondition } from "@/components/lead-filters"
import {
  Plus, GripVertical, Calendar, DollarSign, ArrowUpRight,
  KanbanSquare, List, Table2, Search, ArrowUpDown, ArrowUp, ArrowDown,
  ChevronLeft, ChevronRight, Filter, Mail, ArrowRightLeft, Users, Download, Trash2, X, Check,
  Loader2, Columns3, Eye, EyeOff,
} from "lucide-react"
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  // getPaginationRowModel removed — using server-side pagination
  flexRender,
  type ColumnDef,
  type VisibilityState,
  type SortingState,
} from "@tanstack/react-table"

/* ============================================================
   Types & Configs
   ============================================================ */

interface Lead {
  id: string
  businessLine: string
  businessLineName: string
  businessLineId: string
  entityType: string
  companyName: string
  contactPerson: string
  email: string
  phone: string | null
  status: string
  source: string
  estimatedValue: number
  probability: number
  priority: string
  assignedTo: string
  nextAction: string | null
  nextActionDate: string | null
  notes: string
  convertedToId: string | null
  city: string | null
  customFields: Record<string, any> | null
  // CSV import fields
  cui: string | null
  website: string | null
  county: string | null
  industry: string | null
  caenCode: string | null
  caenDescription: string | null
  revenue: number | null
  employees: number | null
  companyStatus: string | null
  foundedYear: number | null
  contactRole: string | null
  phone2: string | null
  phone3: string | null
  email2: string | null
  createdAt: string
  updatedAt: string
}

type ViewMode = "kanban" | "table" | "pipeline"

const viewOptions: { value: ViewMode; label: string; icon: React.ReactNode }[] = [
  { value: "kanban", label: "Kanban", icon: <KanbanSquare size={15} /> },
  { value: "table", label: "Tabel", icon: <Table2 size={15} /> },
  { value: "pipeline", label: "Pipeline", icon: <List size={15} /> },
]

/* ── Kanban Config ── */

interface KanbanColumn {
  status: string
  label: string
  color: string
  bgColor: string
  borderColor: string
}

const stageColorMap: Record<string, { color: string; bgColor: string; borderColor: string }> = {
  nou: { color: "text-primary", bgColor: "bg-primary/10", borderColor: "border-primary/30" },
  contactat: { color: "text-info", bgColor: "bg-info/10", borderColor: "border-info/30" },
  calificat: { color: "text-warning", bgColor: "bg-warning/10", borderColor: "border-warning/30" },
  oferta_trimisa: { color: "text-accent", bgColor: "bg-accent/10", borderColor: "border-accent/30" },
  negociere: { color: "text-primary", bgColor: "bg-primary/10", borderColor: "border-primary/30" },
  castigat: { color: "text-success", bgColor: "bg-success/10", borderColor: "border-success/30" },
  pierdut: { color: "text-destructive", bgColor: "bg-destructive/10", borderColor: "border-destructive/30" },
  trial: { color: "text-info", bgColor: "bg-info/10", borderColor: "border-info/30" },
  onboarding: { color: "text-warning", bgColor: "bg-warning/10", borderColor: "border-warning/30" },
  activ_fudly: { color: "text-success", bgColor: "bg-success/10", borderColor: "border-success/30" },
  churn_risk: { color: "text-destructive", bgColor: "bg-destructive/10", borderColor: "border-destructive/30" },
  churned: { color: "text-muted-foreground", bgColor: "bg-muted", borderColor: "border-muted" },
}

const priorityConfig: Record<string, { dot: string; label: string }> = {
  low: { dot: "bg-muted-foreground", label: "Low" },
  medium: { dot: "bg-warning", label: "Mediu" },
  high: { dot: "bg-destructive", label: "Ridicat" },
  urgent: { dot: "bg-destructive animate-pulse-subtle", label: "Urgent" },
}

const statusStyles: Record<string, string> = Object.fromEntries(
  Object.entries(stageColorMap).map(([k, v]) => [k, `${v.bgColor} ${v.color}`])
)

const statusConfig: Record<string, { label: string; color: string }> = {
  nou: { label: "Nou", color: "text-primary" },
  contactat: { label: "Contactat", color: "text-info" }, calificat: { label: "Calificat", color: "text-warning" },
  oferta_trimisa: { label: "Ofertă Trimisă", color: "text-accent" }, negociere: { label: "Negociere", color: "text-primary" },
  castigat: { label: "Câștigat", color: "text-success" }, pierdut: { label: "Pierdut", color: "text-destructive" },
  trial: { label: "Trial", color: "text-info" }, onboarding: { label: "Onboarding", color: "text-warning" },
  activ_fudly: { label: "Activ", color: "text-success" }, churn_risk: { label: "Churn Risk", color: "text-destructive" },
  churned: { label: "Churned", color: "text-muted-foreground" },
}

/* ============================================================
   Main Page Component
   ============================================================ */

export default function LeadPage() {
  const router = useRouter()
  const { openLead } = usePanel()
  const { activeLineId, activeLine, isAll, activeEntityTypeId } = useBusinessLine()
  const [viewMode, setViewMode] = useState<ViewMode>("kanban")
  const [leadsState, setLeadsState] = useState<Lead[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [serverPage, setServerPage] = useState(1)
  const [serverPageSize, setServerPageSize] = useState(100)
  const [serverTotalPages, setServerTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [globalFilter, setGlobalFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [showNewLead, setShowNewLead] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showBulkPipeline, setShowBulkPipeline] = useState(false)
  const [advancedFilters, setAdvancedFilters] = useState<FilterCondition[]>([])

  // ─── Fetch leads from API ───
  const fetchLeads = useCallback(async (page = serverPage, pageSize = serverPageSize) => {
    setLoading(true)
    try {
      const params: Record<string, string> = { limit: String(pageSize), page: String(page) }
      if (!isAll && activeLine) params.businessLine = activeLine.id
      if (statusFilter !== "all") params.status = statusFilter
      if (globalFilter) params.search = globalFilter
      if (advancedFilters.length > 0) {
        params.filters = JSON.stringify(advancedFilters.map(f => ({ field: f.field, operator: f.operator, value: f.value })))
      }

      const qs = new URLSearchParams(params).toString()
      const res = await fetch(`/api/leads?${qs}`)
      const json = await res.json()
      const mapped = (json.data || []).map((l: any) => ({
        ...l,
        estimatedValue: l.value ?? l.estimatedValue ?? 0,
        probability: l.probability ?? 0,
        priority: l.priority || 'medium',
        source: l.source || 'website',
        assignedTo: l.assignedTo || '',
        businessLine: l.businessLine?.slug || l.businessLine || '',
        city: l.city || null,
        customFields: l.customFields || null,
      }))
      setLeadsState(mapped)
      setTotalCount(json.pagination?.total || mapped.length)
      setServerTotalPages(json.pagination?.totalPages || 1)
      setServerPage(page)
      setServerPageSize(pageSize)
    } catch (err) {
      console.error("Failed to fetch leads:", err)
    } finally {
      setLoading(false)
    }
  }, [isAll, activeLine, statusFilter, globalFilter, serverPage, serverPageSize, advancedFilters])

  useEffect(() => { fetchLeads(1, serverPageSize) }, [fetchLeads])

  const toggleSelect = (id: string) => setSelectedIds((prev) => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next
  })
  const selectAll = () => setSelectedIds(new Set(filteredLeads.map((l) => l.id)))
  const clearSelection = () => setSelectedIds(new Set())

  // Force table view on "Toate" (mixed pipelines)
  const effectiveViewMode = isAll && viewMode === "kanban" ? "table" : viewMode

  // Dynamic kanban columns from business line config
  const kanbanColumns: KanbanColumn[] = useMemo(() => {
    if (!activeLine) return [] // "Toate" → no kanban
    const et = (activeLine as any).entityTypes?.find((e: any) => e.id === activeEntityTypeId) || (activeLine as any).entityTypes?.[0]
    if (!et) {
      // Fallback: default pipeline
      return [
        { status: "contactat", label: "Contactat", ...stageColorMap.contactat! },
        { status: "calificat", label: "Calificat", ...stageColorMap.calificat! },
        { status: "oferta_trimisa", label: "Ofertă Trimisă", ...stageColorMap.oferta_trimisa! },
        { status: "negociere", label: "Negociere", ...stageColorMap.negociere! },
        { status: "castigat", label: "Câștigat", ...stageColorMap.castigat! },
        { status: "pierdut", label: "Pierdut", ...stageColorMap.pierdut! },
      ]
    }
    return et.pipeline.map((s: any) => {
      const colors = stageColorMap[s.key] || { color: "text-muted-foreground", bgColor: "bg-muted", borderColor: "border-muted" }
      return { status: s.key, label: s.label, ...colors }
    })
  }, [activeLine, activeEntityTypeId])

  // Dynamic filter options
  const filterOptions = useMemo(() => {
    if (!activeLine) {
      return [{ value: "all", label: "Toate" }]
    }
    const et = (activeLine as any).entityTypes?.find((e: any) => e.id === activeEntityTypeId) || (activeLine as any).entityTypes?.[0]
    if (!et) {
      return [
        { value: "all", label: "Toate" },
        { value: "contactat", label: "Contactat" }, { value: "calificat", label: "Calificat" },
        { value: "oferta_trimisa", label: "Ofertă Trimisă" }, { value: "negociere", label: "Negociere" },
        { value: "castigat", label: "Câștigat" }, { value: "pierdut", label: "Pierdut" },
      ]
    }
    return [
      { value: "all", label: "Toate" },
      ...et.pipeline.map((s: any) => ({ value: s.key, label: s.label })),
    ]
  }, [activeLine, activeEntityTypeId])

  // Filters are now applied server-side — no client-side filtering needed
  const filteredLeads = leadsState

  const closedStatuses = ["castigat", "pierdut", "churned"]
  const activeLeads = filteredLeads.filter((l) => !closedStatuses.includes(l.status))
  const pipelineValue = activeLeads.reduce((s, l) => s + l.estimatedValue, 0)

  // Handle drag-drop status change
  const handleStatusChange = useCallback(async (leadId: string, newStatus: string) => {
    // Optimistic update
    setLeadsState((prev) =>
      prev.map((lead) =>
        lead.id === leadId
          ? { ...lead, status: newStatus, updatedAt: new Date().toISOString() }
          : lead
      )
    )
    // Persist via API
    try {
      await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
    } catch (err) {
      console.error("Failed to update lead status:", err)
      fetchLeads() // revert on error
    }
  }, [fetchLeads])

  const handleClickLead = useCallback((lead: Lead) => {
    router.push(`/crm/lead-uri/${lead.id}`)
  }, [router])

  const handleBulkDelete = async () => {
    if (!confirm(`Sigur vrei să ștergi ${selectedIds.size} lead-uri?`)) return
    setLoading(true)
    try {
      const res = await fetch(`/api/leads/bulk-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) })
      })
      if (res.ok) {
        clearSelection()
        fetchLeads()
      } else {
        alert('Eroare la ștergerea lead-urilor.')
        setLoading(false)
      }
    } catch (err) {
      console.error(err)
      alert('Eroare la ștergerea lead-urilor.')
      setLoading(false)
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-4 animate-fade-in h-full flex flex-col">
      <NewLeadModal open={showNewLead} onClose={() => setShowNewLead(false)} onCreated={fetchLeads} />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-foreground">Lead-uri</h1>
          <p className="text-sm text-muted-foreground">
            {loading ? "Se încarcă..." : `${filteredLeads.length} lead-uri • ${formatCurrency(pipelineValue)} în pipeline`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center bg-muted rounded-lg p-0.5 gap-0.5">
            {viewOptions.map((opt) => {
              const isDisabled = isAll && opt.value === "kanban"
              return (
              <button
                key={opt.value}
                onClick={() => !isDisabled && setViewMode(opt.value)}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-200",
                  effectiveViewMode === opt.value
                    ? "bg-surface text-foreground shadow-xs"
                    : isDisabled
                    ? "text-muted-foreground/40 cursor-not-allowed"
                    : "text-muted-foreground hover:text-foreground"
                )}
                title={isDisabled ? 'Kanban nu e disponibil pe Toate' : opt.label}
                disabled={isDisabled}
              >
                {opt.icon}
                <span className="hidden sm:inline">{opt.label}</span>
              </button>
              )
            })}
          </div>

          <button onClick={() => setShowNewLead(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors shadow-sm">
            <Plus size={16} />
            <span className="hidden sm:inline">Lead Nou</span>
          </button>
        </div>
      </div>

      {/* Unified Filter Bar */}
      <div className="bg-surface rounded-xl border border-border flex-shrink-0 relative">
        {/* Row 1: Search + Status Tabs + Presets + Counter */}
        <div className="flex items-center gap-2 p-3 overflow-x-auto scrollbar-hide">
          {/* Search */}
          <div className="relative flex-shrink-0 w-48 sm:w-64 lg:w-80">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Caută companie, persoană..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="w-full h-9 pl-9 pr-3 bg-muted/50 rounded-lg border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
            />
          </div>

          {/* Divider */}
          <div className="w-px h-6 bg-border flex-shrink-0" />

          {/* Status Tabs */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <Filter size={14} className="text-muted-foreground flex-shrink-0" />
            {filterOptions.map((f) => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={cn(
                  "px-2 py-1 text-[11px] font-medium rounded-md transition-all whitespace-nowrap flex-shrink-0",
                  statusFilter === f.value
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Spacer — pushes presets to the right on desktop */}
          <div className="flex-1 min-w-2" />

          {/* Presets + Advanced Toggle + Counter */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <FilterBar
              filters={advancedFilters}
              onFiltersChange={setAdvancedFilters}
              totalCount={leadsState.length}
              filteredCount={filteredLeads.length}
            />
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-primary" size={24} />
        </div>
      )}

      {/* Content Views */}
      {!loading && (
        <div className="flex-1 min-h-0">
          {effectiveViewMode === "kanban" && kanbanColumns.length > 0 && (
            <KanbanView leads={filteredLeads} onStatusChange={handleStatusChange} onClickLead={handleClickLead} columns={kanbanColumns} />
          )}
          {effectiveViewMode === "table" && (
            <TableView leads={filteredLeads} onClickLead={handleClickLead} isAll={isAll} selectedIds={selectedIds} toggleSelect={toggleSelect} selectAll={selectAll} clearSelection={clearSelection} totalCount={totalCount} serverPage={serverPage} serverTotalPages={serverTotalPages} serverPageSize={serverPageSize} onServerPageChange={(p) => fetchLeads(p, serverPageSize)} onServerPageSizeChange={(s) => fetchLeads(1, s)} />
          )}
          {effectiveViewMode === "pipeline" && (
            <PipelineView leads={filteredLeads} onClickLead={handleClickLead} columns={kanbanColumns} />
          )}
        </div>
      )}

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-surface border border-border rounded-2xl shadow-2xl">
            <div className="flex items-center gap-2 pr-3 border-r border-border">
              <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center text-[11px] font-bold text-primary-foreground">{selectedIds.size}</div>
              <span className="text-xs font-medium text-foreground">selectate</span>
            </div>
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <Mail size={12} /> Email în masă
            </button>
            <div className="relative">
              <button onClick={() => setShowBulkPipeline(!showBulkPipeline)} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors">
                <ArrowRightLeft size={12} /> Mută în Pipeline
              </button>
              {showBulkPipeline && (
                <div className="absolute bottom-full mb-1 left-0 bg-surface border border-border rounded-xl shadow-xl p-1.5 w-44 z-50">
                  {Object.entries(statusConfig).map(([key, val]) => (
                    <button key={key} onClick={() => { setShowBulkPipeline(false); clearSelection() }} className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-lg hover:bg-muted transition-colors">
                      <span className={cn("w-2 h-2 rounded-full", val.color.replace('text-', 'bg-'))} />
                      {val.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={handleBulkDelete} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium bg-red-600/10 text-red-400 rounded-lg hover:bg-red-600/20 transition-colors">
              <Trash2 size={12} /> Șterge
            </button>
            <button onClick={clearSelection} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground ml-1">
              <X size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ============================================================
   KANBAN VIEW
   ============================================================ */

function KanbanView({
  leads: leadsState,
  onStatusChange,
  onClickLead,
  columns,
}: {
  leads: Lead[]
  onStatusChange: (leadId: string, newStatus: string) => void
  onClickLead: (lead: Lead) => void
  columns: KanbanColumn[]
}) {
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)

  const leadsByStatus = useMemo(() => {
    const map: Record<string, Lead[]> = {}
    columns.forEach((col) => { map[col.status] = [] })
    leadsState.forEach((lead) => { if (map[lead.status]) map[lead.status]!.push(lead) })
    return map
  }, [leadsState, columns])

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    setDraggedLeadId(leadId)
    e.dataTransfer.effectAllowed = "move"
    if (e.currentTarget instanceof HTMLElement) e.currentTarget.style.opacity = "0.5"
  }

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedLeadId(null)
    setDragOverColumn(null)
    if (e.currentTarget instanceof HTMLElement) e.currentTarget.style.opacity = "1"
  }

  const handleDrop = (e: React.DragEvent, newStatus: string) => {
    e.preventDefault()
    setDragOverColumn(null)
    if (!draggedLeadId) return
    onStatusChange(draggedLeadId, newStatus)
    setDraggedLeadId(null)
  }

  return (
    <div className="overflow-x-auto pb-4 h-full">
      <div className="flex gap-3 min-w-max h-full">
        {columns.map((col) => {
          const colLeads = leadsByStatus[col.status] || []
          const colValue = colLeads.reduce((s: number, l: Lead) => s + l.estimatedValue, 0)

          return (
            <div
              key={col.status}
              className={cn(
                "w-[280px] flex-shrink-0 flex flex-col rounded-xl bg-muted/30 border transition-all duration-200",
                dragOverColumn === col.status ? cn("border-2", col.borderColor, "bg-muted/50") : "border-border/50"
              )}
              onDragOver={(e) => { e.preventDefault(); setDragOverColumn(col.status) }}
              onDragLeave={() => setDragOverColumn(null)}
              onDrop={(e) => handleDrop(e, col.status)}
            >
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/30">
                <div className="flex items-center gap-2">
                  <div className={cn("w-2.5 h-2.5 rounded-full", col.color.replace("text-", "bg-"))} />
                  <span className="text-xs font-semibold text-foreground">{col.label}</span>
                  <span className="text-[11px] font-medium text-muted-foreground bg-muted rounded-full px-1.5 py-0.5">{colLeads.length}</span>
                </div>
                <span className={cn("text-[11px] font-semibold", col.color)}>{formatCurrency(colValue)}</span>
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {colLeads.map((lead) => (
                  <div
                    key={lead.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, lead.id)}
                    onDragEnd={handleDragEnd}
                    onClick={() => onClickLead(lead)}
                    className={cn(
                      "bg-surface rounded-lg border border-border p-3 cursor-pointer hover:border-primary/30 hover:shadow-md transition-all duration-150 group",
                      draggedLeadId === lead.id && "opacity-50"
                    )}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">{lead.companyName}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{lead.contactPerson}</p>
                      </div>
                      <GripVertical size={14} className="text-muted-foreground/30 group-hover:text-muted-foreground flex-shrink-0 cursor-grab" />
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground mb-2">
                      <div className="flex items-center gap-1"><DollarSign size={11} /><span className="font-semibold text-foreground-secondary">{formatCurrency(lead.estimatedValue)}</span></div>
                      <div className="flex items-center gap-1"><ArrowUpRight size={11} /><span>{lead.probability}%</span></div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5"><div className={cn("w-1.5 h-1.5 rounded-full", priorityConfig[lead.priority]?.dot)} /><span className="text-[10px] text-muted-foreground capitalize">{lead.priority}</span></div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground capitalize">{lead.source.replace("_", " ")}</span>
                    </div>
                    {lead.nextAction && (
                      <div className="mt-2 pt-2 border-t border-border/30 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <Calendar size={10} /><span className="truncate">{lead.nextAction}</span>
                      </div>
                    )}
                  </div>
                ))}
                {colLeads.length === 0 && (
                  <div className="flex items-center justify-center h-24 text-xs text-muted-foreground/50">Trage lead-uri aici</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ============================================================
   TABLE VIEW
   ============================================================ */

const DEFAULT_VISIBLE_COLUMNS: Record<string, boolean> = {
  select: true, companyName: true, status: true, email: true, phone: true,
  estimatedValue: true, probability: true,
  priority: true, source: true, city: true, county: true, industry: true,
  cui: false, caenCode: false, caenDescription: false, revenue: false, employees: false,
  companyStatus: false, foundedYear: false, website: false, contactRole: false,
  phone2: false, phone3: false, email2: false,
  activityDomain: false, services: false,
  boltRating: false, boltReviews: false, interestScore: false, updatedAt: true,
}

const COLUMN_LABELS: Record<string, string> = {
  select: '☑ Selectare', companyName: 'Companie', status: 'Status',
  email: 'Email', phone: 'Telefon',
  estimatedValue: 'Valoare', probability: 'Probabilitate', priority: 'Prioritate',
  source: 'Sursă', city: 'Oraș',
  county: 'Județ', industry: 'Industrie', cui: 'CUI', caenCode: 'Cod CAEN',
  caenDescription: 'Descriere CAEN', revenue: 'Cifra Afaceri', employees: 'Nr. Angajați',
  companyStatus: 'Stare Firmă', foundedYear: 'An Înființare', website: 'Website',
  contactRole: 'Funcție Contact', phone2: 'Telefon 2', phone3: 'Telefon 3', email2: 'Email 2',
  activityDomain: 'Domeniu Activitate', services: 'Servicii',
  boltRating: '⭐ Rating', boltReviews: 'Reviews', interestScore: 'Scor', updatedAt: 'Actualizat',
}

function TableView({ leads: data, onClickLead, isAll = false, selectedIds, toggleSelect, selectAll, clearSelection, totalCount, serverPage, serverTotalPages, serverPageSize, onServerPageChange, onServerPageSizeChange }: {
  leads: Lead[]; onClickLead: (lead: Lead) => void; isAll?: boolean
  selectedIds: Set<string>; toggleSelect: (id: string) => void; selectAll: () => void; clearSelection: () => void
  totalCount: number; serverPage: number; serverTotalPages: number; serverPageSize: number
  onServerPageChange: (page: number) => void; onServerPageSizeChange: (size: number) => void
}) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [showColumnPicker, setShowColumnPicker] = useState(false)
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('lead-table-columns')
        if (saved) return JSON.parse(saved)
      } catch {}
    }
    return DEFAULT_VISIBLE_COLUMNS
  })
  const [pageSize, setPageSize] = useState(serverPageSize)

  // Persist column preferences
  useEffect(() => {
    try {
      localStorage.setItem('lead-table-columns', JSON.stringify(columnVisibility))
    } catch {}
  }, [columnVisibility])

  const columns: ColumnDef<Lead>[] = useMemo(
    () => [
      {
        id: "select",
        header: () => (
          <input type="checkbox" className="accent-primary w-3.5 h-3.5 rounded" checked={selectedIds.size === data.length && data.length > 0} onChange={() => selectedIds.size === data.length ? clearSelection() : selectAll()} />
        ),
        cell: ({ row }: { row: { original: Lead } }) => (
          <input type="checkbox" className="accent-primary w-3.5 h-3.5 rounded" checked={selectedIds.has(row.original.id)} onClick={(e) => e.stopPropagation()} onChange={() => toggleSelect(row.original.id)} />
        ),
        enableSorting: false,
      },
      {
        accessorKey: "companyName",
        header: "Companie",
        cell: ({ row }: { row: { original: Lead } }) => (
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{row.original.companyName}</p>
            <p className="text-[11px] text-muted-foreground truncate">{row.original.contactPerson}</p>
          </div>
        ),
      },
      {
        accessorKey: "email",
        header: "Email",
        cell: ({ getValue }) => {
          const v = getValue() as string | null
          if (!v) return <span className="text-[10px] text-muted-foreground/50">—</span>
          return <a href={`mailto:${v}`} onClick={e => e.stopPropagation()} className="text-xs text-foreground hover:text-primary transition-colors truncate max-w-[180px] block">{v}</a>
        },
      },
      {
        accessorKey: "phone",
        header: "Telefon",
        cell: ({ getValue }) => {
          const v = getValue() as string | null
          if (!v) return <span className="text-[10px] text-muted-foreground/50">—</span>
          const isMobile = v.startsWith("07")
          const waNumber = isMobile ? `40${v.replace(/\s/g, "")}` : null
          return (
            <span className="flex items-center gap-1.5">
              <a href={`tel:${v}`} onClick={e => e.stopPropagation()} className="text-xs font-mono text-foreground hover:text-primary transition-colors">{v}</a>
              {waNumber && (
                <a href={`https://wa.me/${waNumber}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-green-500 hover:text-green-400 transition-colors flex-shrink-0" title="WhatsApp">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                </a>
              )}
            </span>
          )
        },
      },
      {
        accessorKey: "phone2",
        header: "Telefon 2",
        cell: ({ getValue }) => {
          const v = getValue() as string | null
          if (!v) return <span className="text-[10px] text-muted-foreground/50">—</span>
          const isMobile = v.startsWith("07")
          const waNumber = isMobile ? `40${v.replace(/\s/g, "")}` : null
          return (
            <span className="flex items-center gap-1.5">
              <a href={`tel:${v}`} onClick={e => e.stopPropagation()} className="text-xs font-mono text-foreground hover:text-primary transition-colors">{v}</a>
              {waNumber && (
                <a href={`https://wa.me/${waNumber}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-green-500 hover:text-green-400 transition-colors flex-shrink-0" title="WhatsApp">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                </a>
              )}
            </span>
          )
        },
      },
      {
        accessorKey: "phone3",
        header: "Telefon 3",
        cell: ({ getValue }) => {
          const v = getValue() as string | null
          if (!v) return <span className="text-[10px] text-muted-foreground/50">—</span>
          const isMobile = v.startsWith("07")
          const waNumber = isMobile ? `40${v.replace(/\s/g, "")}` : null
          return (
            <span className="flex items-center gap-1.5">
              <a href={`tel:${v}`} onClick={e => e.stopPropagation()} className="text-xs font-mono text-foreground hover:text-primary transition-colors">{v}</a>
              {waNumber && (
                <a href={`https://wa.me/${waNumber}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-green-500 hover:text-green-400 transition-colors flex-shrink-0" title="WhatsApp">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                </a>
              )}
            </span>
          )
        },
      },
      {
        accessorKey: "email2",
        header: "Email 2",
        cell: ({ getValue }) => {
          const v = getValue() as string | null
          if (!v) return <span className="text-[10px] text-muted-foreground/50">—</span>
          return <a href={`mailto:${v}`} onClick={e => e.stopPropagation()} className="text-xs text-foreground hover:text-primary transition-colors truncate max-w-[180px] block">{v}</a>
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ getValue }) => {
          const status = getValue() as string
          return <span className={cn("px-2 py-0.5 text-[11px] font-semibold rounded-full capitalize", statusStyles[status] || "bg-muted text-muted-foreground")}>{status.replace("_", " ")}</span>
        },
      },
      {
        accessorKey: "estimatedValue",
        header: "Valoare",
        cell: ({ getValue }) => <span className="text-sm font-semibold text-foreground tabular-nums">{formatCurrency(getValue() as number)}</span>,
      },
      {
        accessorKey: "probability",
        header: "Prob.",
        cell: ({ getValue }) => {
          const p = getValue() as number
          return (
            <div className="flex items-center gap-2">
              <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                <div className={cn("h-full rounded-full", p >= 70 ? "bg-success" : p >= 40 ? "bg-warning" : "bg-info")} style={{ width: `${p}%` }} />
              </div>
              <span className="text-xs text-muted-foreground tabular-nums">{p}%</span>
            </div>
          )
        },
      },
      {
        accessorKey: "priority",
        header: "Prioritate",
        cell: ({ getValue }) => {
          const p = getValue() as string
          return (
            <div className="flex items-center gap-1.5">
              <div className={cn("w-2 h-2 rounded-full", priorityConfig[p]?.dot)} />
              <span className="text-xs capitalize text-foreground-secondary">{priorityConfig[p]?.label}</span>
            </div>
          )
        },
      },
      {
        accessorKey: "source",
        header: "Sursă",
        cell: ({ getValue }) => {
          const s = (getValue() as string) || ''
          const display = s.length > 25 ? s.substring(0, 25) + '…' : s.replace("_", " ")
          return <span className="text-xs px-2 py-0.5 rounded-md bg-muted text-muted-foreground capitalize" title={s}>{display}</span>
        },
      },
      // ─── New CSV columns ───
      {
        accessorKey: "cui",
        header: "CUI",
        cell: ({ getValue }) => {
          const v = getValue() as string | null
          return v ? <span className="text-xs font-mono text-foreground-secondary">{v}</span> : <span className="text-[10px] text-muted-foreground/50">—</span>
        },
      },
      {
        accessorKey: "county",
        header: "Județ",
        cell: ({ getValue }) => {
          const v = getValue() as string | null
          return v ? <span className="text-xs text-foreground-secondary">{v}</span> : <span className="text-[10px] text-muted-foreground/50">—</span>
        },
      },
      {
        accessorKey: "city",
        header: "Oraș",
        cell: ({ getValue }) => {
          const v = getValue() as string | null
          return v ? <span className="text-xs text-foreground-secondary">{v}</span> : <span className="text-[10px] text-muted-foreground/50">—</span>
        },
      },
      {
        accessorKey: "industry",
        header: "Industrie",
        cell: ({ getValue }) => {
          const v = getValue() as string | null
          if (!v) return <span className="text-[10px] text-muted-foreground/50">—</span>
          const colors: Record<string, string> = {
            agricultura: 'bg-green-500/10 text-green-400', comert: 'bg-blue-500/10 text-blue-400',
            constructii: 'bg-orange-500/10 text-orange-400', medical: 'bg-red-500/10 text-red-400',
            fonduri: 'bg-purple-500/10 text-purple-400', altele: 'bg-muted text-muted-foreground',
          }
          return <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full uppercase", colors[v] || colors.altele)}>{v}</span>
        },
      },
      {
        accessorKey: "caenCode",
        header: "Cod CAEN",
        cell: ({ getValue }) => {
          const v = getValue() as string | null
          return v ? <span className="text-xs font-mono text-foreground-secondary">{v}</span> : <span className="text-[10px] text-muted-foreground/50">—</span>
        },
      },
      {
        accessorKey: "caenDescription",
        header: "Descriere CAEN",
        cell: ({ getValue }) => {
          const v = getValue() as string | null
          return v ? <span className="text-xs text-foreground-secondary truncate max-w-[200px] block" title={v}>{v}</span> : <span className="text-[10px] text-muted-foreground/50">—</span>
        },
      },
      {
        accessorKey: "revenue",
        header: "Cifra Afaceri",
        cell: ({ getValue }) => {
          const v = getValue() as number | null
          if (!v) return <span className="text-[10px] text-muted-foreground/50">—</span>
          return <span className="text-xs font-semibold text-foreground tabular-nums">{v.toLocaleString('ro-RO')} RON</span>
        },
      },
      {
        accessorKey: "employees",
        header: "Nr. Angajați",
        cell: ({ getValue }) => {
          const v = getValue() as number | null
          if (!v) return <span className="text-[10px] text-muted-foreground/50">—</span>
          return <span className="text-xs text-foreground-secondary tabular-nums">{v.toLocaleString()}</span>
        },
      },
      {
        accessorKey: "companyStatus",
        header: "Stare Firmă",
        cell: ({ getValue }) => {
          const v = getValue() as string | null
          if (!v) return <span className="text-[10px] text-muted-foreground/50">—</span>
          const color = v === 'Functiune' ? 'text-emerald-400' : 'text-red-400'
          return <span className={cn("text-[10px] font-bold", color)}>{v}</span>
        },
      },
      {
        accessorKey: "foundedYear",
        header: "An Înf.",
        cell: ({ getValue }) => {
          const v = getValue() as number | null
          return v ? <span className="text-xs text-foreground-secondary tabular-nums">{v}</span> : <span className="text-[10px] text-muted-foreground/50">—</span>
        },
      },
      {
        accessorKey: "website",
        header: "Website",
        cell: ({ getValue }) => {
          const v = getValue() as string | null
          if (!v) return <span className="text-[10px] text-muted-foreground/50">—</span>
          return <a href={v.startsWith('http') ? v : `https://${v}`} target="_blank" rel="noopener" onClick={e => e.stopPropagation()} className="text-xs text-primary hover:underline truncate max-w-[150px] block">{v.replace(/^https?:\/\//, '')}</a>
        },
      },
      {
        accessorKey: "contactRole",
        header: "Funcție",
        cell: ({ getValue }) => {
          const v = getValue() as string | null
          return v ? <span className="text-xs text-foreground-secondary">{v}</span> : <span className="text-[10px] text-muted-foreground/50">—</span>
        },
      },
      {
        accessorKey: "activityDomain",
        header: "Domeniu",
        cell: ({ getValue }) => {
          const v = getValue() as string | null
          if (!v) return <span className="text-[10px] text-muted-foreground/50">—</span>
          return <span className="text-xs text-foreground truncate max-w-[200px] block" title={v}>{v}</span>
        },
      },
      {
        accessorKey: "services",
        header: "Servicii",
        cell: ({ getValue }) => {
          const v = getValue() as string | null
          if (!v) return <span className="text-[10px] text-muted-foreground/50">—</span>
          // Show first 2 services as pills, rest as count
          const items = v.split('|').map(s => s.trim()).filter(Boolean)
          return (
            <div className="flex items-center gap-1 flex-wrap max-w-[250px]">
              {items.slice(0, 2).map((s, i) => (
                <span key={i} className="px-1.5 py-0.5 text-[10px] bg-primary/5 text-foreground rounded border border-border truncate max-w-[100px]" title={s}>{s}</span>
              ))}
              {items.length > 2 && <span className="text-[9px] text-muted-foreground">+{items.length - 2}</span>}
            </div>
          )
        },
      },
      // ─── Old custom field columns ───
      {
        id: "boltRating",
        header: "⭐ Rating",
        accessorFn: (row: Lead) => row.customFields?.bolt_rating ?? null,
        cell: ({ getValue }: { getValue: () => any }) => {
          const rating = getValue() as number | null
          if (!rating) return <span className="text-[10px] text-muted-foreground/50">—</span>
          return (
            <div className="flex items-center gap-1">
              <span className={cn("text-xs font-semibold tabular-nums", rating >= 4.5 ? "text-emerald-400" : rating >= 4.0 ? "text-amber-400" : "text-muted-foreground")}>{rating.toFixed(1)}</span>
              <span className="text-[10px]">⭐</span>
            </div>
          )
        },
      },
      {
        id: "boltReviews",
        header: "Reviews",
        accessorFn: (row: Lead) => row.customFields?.bolt_reviews ?? null,
        cell: ({ getValue }: { getValue: () => any }) => {
          const reviews = getValue() as number | null
          if (!reviews) return <span className="text-[10px] text-muted-foreground/50">—</span>
          return <span className="text-xs text-foreground-secondary tabular-nums">{reviews.toLocaleString()}</span>
        },
      },
      {
        id: "interestScore",
        header: "Scor",
        accessorFn: (row: Lead) => row.customFields?.interest_score ?? null,
        cell: ({ getValue }: { getValue: () => any }) => {
          const score = getValue() as number | null
          if (score === null || score === undefined) return <span className="text-[10px] text-muted-foreground/50">—</span>
          const segment = score >= 75 ? 'hot' : score >= 50 ? 'high' : score >= 30 ? 'medium' : 'low'
          const segColors: Record<string, string> = { hot: 'text-red-400', high: 'text-emerald-400', medium: 'text-amber-400', low: 'text-muted-foreground' }
          const segLabels: Record<string, string> = { hot: '🔥', high: '🟢', medium: '🟡', low: '⚪' }
          return (
            <div className="flex items-center gap-1">
              <span className="text-[10px]">{segLabels[segment]}</span>
              <span className={cn("text-xs font-bold tabular-nums", segColors[segment])}>{score}</span>
            </div>
          )
        },
      },
      {
        accessorKey: "updatedAt",
        header: "Actualizat",
        cell: ({ getValue }) => <span className="text-xs text-foreground-secondary tabular-nums">{formatDate(getValue() as string)}</span>,
      },
    ],
    [selectedIds, toggleSelect, selectAll, clearSelection, data]
  )

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnVisibility },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  // Column groups for the picker
  const columnGroups = useMemo(() => [
    { label: 'General', ids: ['companyName', 'status', 'estimatedValue', 'probability', 'priority', 'source', 'updatedAt'] },
    { label: 'Contact', ids: ['email', 'phone', 'phone2', 'phone3', 'email2', 'contactRole'] },
    { label: 'Locație', ids: ['city', 'county'] },
    { label: 'Business', ids: ['cui', 'industry', 'caenCode', 'caenDescription', 'revenue', 'employees', 'companyStatus', 'foundedYear', 'website', 'activityDomain', 'services'] },
    { label: 'Scoring', ids: ['boltRating', 'boltReviews', 'interestScore'] },
  ], [])

  return (
    <div className="bg-surface rounded-xl border border-border overflow-hidden">
      {/* Column visibility toggle bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 bg-muted/20">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          {totalCount.toLocaleString()} lead-uri total • {data.length.toLocaleString()} afișate
        </span>
        <div className="flex items-center gap-2">
          {/* Page size */}
          <select
            value={serverPageSize}
            onChange={e => { const s = Number(e.target.value); setPageSize(s); onServerPageSizeChange(s) }}
            className="text-[10px] px-2 py-1 bg-muted/50 border border-border rounded-md text-foreground"
          >
            <option value={25}>25 / pag</option>
            <option value={50}>50 / pag</option>
            <option value={100}>100 / pag</option>
          </select>
          {/* Column picker button */}
          <div className="relative">
            <button
              onClick={() => setShowColumnPicker(!showColumnPicker)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-medium rounded-lg transition-all",
                showColumnPicker ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <Columns3 size={12} />
              Coloane
            </button>
            {showColumnPicker && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowColumnPicker(false)} />
                <div className="absolute right-0 top-full mt-1 bg-surface border border-border rounded-xl shadow-2xl p-3 z-50 w-72 max-h-80 overflow-y-auto">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-foreground">Alege Coloanele</span>
                    <button
                      onClick={() => setColumnVisibility(DEFAULT_VISIBLE_COLUMNS)}
                      className="text-[9px] text-primary hover:underline"
                    >Reset</button>
                  </div>
                  {columnGroups.map(group => (
                    <div key={group.label} className="mb-2">
                      <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1">{group.label}</p>
                      <div className="space-y-0.5">
                        {group.ids.map(id => {
                          const isVisible = columnVisibility[id] !== false
                          return (
                            <button
                              key={id}
                              onClick={() => setColumnVisibility(prev => ({ ...prev, [id]: !isVisible }))}
                              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50 transition-colors text-left"
                            >
                              {isVisible ? <Eye size={11} className="text-primary" /> : <EyeOff size={11} className="text-muted-foreground/50" />}
                              <span className={cn("text-xs", isVisible ? "text-foreground font-medium" : "text-muted-foreground")}>{COLUMN_LABELS[id] || id}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-border">
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    onClick={header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined}
                    className={cn(
                      "h-10 px-4 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/30",
                      header.column.getCanSort() && "cursor-pointer select-none hover:text-foreground transition-colors"
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanSort() && (
                        <span className="text-muted-foreground/50">
                          {header.column.getIsSorted() === "asc" ? <ArrowUp size={12} /> : header.column.getIsSorted() === "desc" ? <ArrowDown size={12} /> : <ArrowUpDown size={12} />}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                onClick={() => onClickLead(row.original)}
                className={cn("border-b border-border/50 hover:bg-muted/30 cursor-pointer transition-colors", selectedIds.has(row.original.id) && "bg-primary/5 hover:bg-primary/10")}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3">{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/10">
        <span className="text-xs text-muted-foreground">
          {totalCount.toLocaleString()} lead-uri total • Pagina {serverPage} din {serverTotalPages}
        </span>
        <div className="flex items-center gap-1">
          <button onClick={() => onServerPageChange(serverPage - 1)} disabled={serverPage <= 1} className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-all"><ChevronLeft size={16} /></button>
          <span className="text-xs font-medium text-foreground px-2 tabular-nums">{serverPage}</span>
          <button onClick={() => onServerPageChange(serverPage + 1)} disabled={serverPage >= serverTotalPages} className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-all"><ChevronRight size={16} /></button>
        </div>
      </div>
    </div>
  )
}

/* ============================================================
   PIPELINE VIEW (compact grouped list)
   ============================================================ */

function PipelineView({ leads: data, onClickLead, columns }: { leads: Lead[]; onClickLead: (lead: Lead) => void; columns: KanbanColumn[] }) {
  const groupedByStatus = useMemo(() => {
    const map = new Map<string, Lead[]>()
    const order = columns.map((c) => c.status)
    order.forEach((s) => map.set(s, []))
    data.forEach((l) => { if (map.has(l.status)) map.get(l.status)!.push(l) })
    return Array.from(map.entries()).filter(([_, leads]) => leads.length > 0)
  }, [data, columns])

  return (
    <div className="space-y-4">
      {groupedByStatus.map(([status, statusLeads]) => {
        const colConfig = columns.find((c) => c.status === status)
        const totalValue = statusLeads.reduce((s, l) => s + l.estimatedValue, 0)

        return (
          <div key={status} className="bg-surface rounded-xl border border-border overflow-hidden">
            {/* Group header */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-muted/30 border-b border-border">
              <div className="flex items-center gap-2">
                <div className={cn("w-2.5 h-2.5 rounded-full", colConfig?.color.replace("text-", "bg-"))} />
                <span className="text-xs font-semibold text-foreground">{colConfig?.label}</span>
                <span className="text-[11px] text-muted-foreground bg-muted rounded-full px-1.5 py-0.5">{statusLeads.length}</span>
              </div>
              <span className={cn("text-xs font-semibold", colConfig?.color)}>{formatCurrency(totalValue)}</span>
            </div>

            {/* Items */}
            <div className="divide-y divide-border/50">
              {statusLeads.map((lead) => (
                <div
                  key={lead.id}
                  onClick={() => onClickLead(lead)}
                  className="flex items-center gap-4 px-4 py-3 hover:bg-muted/30 cursor-pointer transition-colors group"
                >
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary/15 to-accent/15 flex items-center justify-center text-[11px] font-bold text-primary flex-shrink-0">
                    {getInitials(lead.companyName)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">{lead.companyName}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{lead.contactPerson} • {lead.email}</p>
                  </div>

                  {/* Priority */}
                  <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0">
                    <div className={cn("w-1.5 h-1.5 rounded-full", priorityConfig[lead.priority]?.dot)} />
                    <span className="text-[10px] text-muted-foreground">{priorityConfig[lead.priority]?.label}</span>
                  </div>

                  {/* Source */}
                  <span className="hidden md:inline text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground capitalize flex-shrink-0">
                    {lead.source.replace("_", " ")}
                  </span>

                  {/* Value + Probability */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-foreground tabular-nums">{formatCurrency(lead.estimatedValue)}</p>
                    <p className="text-[10px] text-muted-foreground">{lead.probability}% prob.</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

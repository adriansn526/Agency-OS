"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useBusinessLine } from "@/components/business-line-context"
import { BusinessLineBadge } from "@/components/business-line-switcher"
import { OfferConfigurator } from "@/components/offer-configurator"
import { cn, formatCurrency, formatDate } from "@/lib/utils"
import {
  Send,
  FileText,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  Search,
  Target,
  DollarSign,
  TrendingUp,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  KanbanSquare,
  Table2,
  Sparkles,
  GripVertical,
  Loader2,
} from "lucide-react"
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table"

// ────────────────────────────────────────────
// Types
// ────────────────────────────────────────────

type OfferStatus = "draft" | "trimisa" | "vizualizata" | "acceptata" | "respinsa" | "expirata" | "contract_generat"

interface ApiOffer {
  id: string
  number: string
  businessLine: string
  businessLineName?: string
  entityName: string
  clientId?: string
  templateId?: string
  templateName: string
  status: OfferStatus
  value: number
  currency: string
  validUntil: string
  blocks: Array<{ id: string; title: string; aiGenerated?: boolean }>
  modules?: any[]
  customFields?: Record<string, any>
  createdBy?: string
  createdAt: string
  updatedAt?: string
  contractsCount?: number
}

// ────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────

type ViewMode = "table" | "kanban"

const offerStatusConfig: Record<OfferStatus, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
  draft:             { label: "Draft",       color: "text-muted-foreground", bgColor: "bg-muted",             icon: FileText },
  trimisa:           { label: "Trimisă",     color: "text-info",            bgColor: "bg-info/10",           icon: Send },
  vizualizata:       { label: "Vizualizată", color: "text-accent",          bgColor: "bg-accent/10",         icon: Eye },
  acceptata:         { label: "Acceptată",   color: "text-success",         bgColor: "bg-success/10",        icon: CheckCircle2 },
  respinsa:          { label: "Respinsă",    color: "text-destructive",     bgColor: "bg-destructive/10",    icon: XCircle },
  expirata:          { label: "Expirată",    color: "text-warning",         bgColor: "bg-warning/10",        icon: Clock },
  contract_generat:  { label: "Contract",    color: "text-primary",         bgColor: "bg-primary/10",        icon: FileText },
}

const pipelineColumns: { status: OfferStatus; label: string; color: string; borderColor: string }[] = [
  { status: "draft",       label: "Draft",       color: "text-muted-foreground", borderColor: "border-muted-foreground/50" },
  { status: "trimisa",     label: "Trimisă",     color: "text-info",             borderColor: "border-info/50" },
  { status: "vizualizata", label: "Vizualizată",  color: "text-accent",           borderColor: "border-accent/50" },
  { status: "acceptata",   label: "Acceptată",    color: "text-success",          borderColor: "border-success/50" },
  { status: "respinsa",    label: "Respinsă",     color: "text-destructive",      borderColor: "border-destructive/50" },
]

// ────────────────────────────────────────────
// Page
// ────────────────────────────────────────────

export default function OffersPage() {
  const router = useRouter()
  const { activeLine } = useBusinessLine()
  const [viewMode, setViewMode] = useState<ViewMode>("table")
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<OfferStatus | "all">("all")
  const [showCreateWizard, setShowCreateWizard] = useState(false)
  const [offers, setOffers] = useState<ApiOffer[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch offers from API
  const fetchOffers = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: "100" })
      if (activeLine) params.set("businessLine", activeLine.id)
      if (statusFilter !== "all") params.set("status", statusFilter)
      if (search) params.set("search", search)
      const res = await fetch(`/api/offers?${params}`)
      if (res.ok) {
        const json = await res.json()
        setOffers(json.data || [])
      }
    } catch (err) {
      console.error("Failed to fetch offers:", err)
    } finally {
      setLoading(false)
    }
  }, [activeLine, statusFilter, search])

  useEffect(() => { fetchOffers() }, [fetchOffers])

  // Client-side filtered (API already filters, but search might need local fallback)
  const filteredOffers = useMemo(() => {
    let data = offers
    if (activeLine) data = data.filter(o => o.businessLine === activeLine.id)
    if (statusFilter !== "all") data = data.filter(o => o.status === statusFilter)
    if (search) data = data.filter(o =>
      o.entityName.toLowerCase().includes(search.toLowerCase()) ||
      o.number.toLowerCase().includes(search.toLowerCase()) ||
      o.templateName?.toLowerCase().includes(search.toLowerCase())
    )
    return data
  }, [offers, activeLine, statusFilter, search])

  // Stats
  const stats = useMemo(() => {
    const data = activeLine ? offers.filter(o => o.businessLine === activeLine.id) : offers
    const active = data.filter(o => ['draft', 'trimisa', 'vizualizata'].includes(o.status))
    const accepted = data.filter(o => o.status === 'acceptata')
    const sent = data.filter(o => ['trimisa', 'vizualizata', 'acceptata', 'respinsa'].includes(o.status))
    const convRate = sent.length > 0 ? Math.round((accepted.length / sent.length) * 100) : 0
    const totalPipeline = active.reduce((s, o) => s + o.value, 0)
    return {
      total: data.length,
      active: active.length,
      convRate,
      totalPipeline,
    }
  }, [offers, activeLine])

  return (
    <div className="p-4 md:p-6 space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Oferte & Propuneri</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {activeLine ? `${activeLine.name} — gestionare oferte comerciale` : "Toate ofertele din toate liniile de business"}
          </p>
        </div>
        <Link
          href="/offers/new"
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary-hover transition-colors shadow-sm"
        >
          <Plus size={14} /> Ofertă Nouă
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Oferte", value: stats.total, icon: FileText, color: "text-foreground" },
          { label: "Active", value: stats.active, icon: Target, color: "text-primary" },
          { label: "Rată Conversie", value: `${stats.convRate}%`, icon: TrendingUp, color: "text-success" },
          { label: "Pipeline Valoare", value: formatCurrency(stats.totalPipeline), icon: DollarSign, color: "text-accent" },
        ].map((s) => {
          const Icon = s.icon
          return (
            <div key={s.label} className="bg-surface rounded-xl border border-border p-4 hover:border-primary/20 transition-all">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                  <Icon size={15} className={s.color} />
                </div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{s.label}</p>
              </div>
              <p className={cn("text-xl font-bold", s.color)}>{s.value}</p>
            </div>
          )
        })}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Caută oferte..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-muted/50 border border-border rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as OfferStatus | "all")}
            className="px-3 py-2 text-xs font-medium bg-muted/50 border border-border rounded-lg text-foreground"
          >
            <option value="all">Toate Statusurile</option>
            {Object.entries(offerStatusConfig).map(([key, cfg]) => (
              <option key={key} value={key}>{cfg.label}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
          {([
            { value: "table" as ViewMode, label: "Tabel", icon: <Table2 size={14} /> },
            { value: "kanban" as ViewMode, label: "Pipeline", icon: <KanbanSquare size={14} /> },
          ] as const).map((v) => (
            <button
              key={v.value}
              onClick={() => setViewMode(v.value)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                viewMode === v.value ? "bg-surface text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {v.icon} {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="text-primary animate-spin" />
          <span className="ml-3 text-sm text-muted-foreground">Se încarcă ofertele...</span>
        </div>
      ) : viewMode === "table" ? (
        <OffersTable offers={filteredOffers} />
      ) : (
        <OffersKanban offers={filteredOffers} onStatusChange={fetchOffers} />
      )}

      {/* Create Offer Configurator */}
      {showCreateWizard && <OfferConfigurator onClose={() => setShowCreateWizard(false)} />}
    </div>
  )
}

// ────────────────────────────────────────────
// Offers Table
// ────────────────────────────────────────────

function OffersTable({ offers: data }: { offers: ApiOffer[] }) {
  const router = useRouter()
  const [sorting, setSorting] = useState<SortingState>([])

  const columns: ColumnDef<ApiOffer>[] = useMemo(() => [
    {
      accessorKey: "number",
      header: "Nr. Ofertă",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">{row.original.number}</span>
          {row.original.blocks?.some((b) => b.aiGenerated) && (
            <span className="flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold uppercase bg-gradient-to-r from-violet-500/10 to-pink-500/10 text-violet-400 rounded-full border border-violet-500/20">
              <Sparkles size={8} /> AI
            </span>
          )}
        </div>
      ),
    },
    {
      accessorKey: "entityName",
      header: "Entitate",
      cell: ({ row }) => (
        <div>
          <p className="text-sm font-medium text-foreground">{row.original.entityName}</p>
          <p className="text-[11px] text-muted-foreground">{row.original.templateName}</p>
        </div>
      ),
    },
    {
      accessorKey: "businessLine",
      header: "Business Line",
      cell: ({ row }) => <BusinessLineBadge lineId={row.original.businessLine} />,
    },
    {
      accessorKey: "value",
      header: "Valoare",
      cell: ({ row }) => (
        <span className="text-sm font-semibold text-foreground">
          {formatCurrency(row.original.value)} {row.original.currency}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const cfg = offerStatusConfig[row.original.status] || offerStatusConfig.draft
        const Icon = cfg.icon
        return (
          <span className={cn("flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full w-fit", cfg.bgColor, cfg.color)}>
            <Icon size={12} /> {cfg.label}
          </span>
        )
      },
    },
    {
      accessorKey: "createdAt",
      header: "Data",
      cell: ({ row }) => <span className="text-xs text-muted-foreground">{formatDate(row.original.createdAt)}</span>,
    },
    {
      accessorKey: "validUntil",
      header: "Valabilă până",
      cell: ({ row }) => {
        const expired = new Date(row.original.validUntil) < new Date()
        return <span className={cn("text-xs", expired ? "text-destructive" : "text-muted-foreground")}>{formatDate(row.original.validUntil)}</span>
      },
    },
  ], [])

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  })

  return (
    <div className="bg-surface rounded-xl border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {table.getHeaderGroups().map((hg) =>
                hg.headers.map((header) => (
                  <th
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getIsSorted() === "asc" ? <ArrowUp size={12} /> :
                       header.column.getIsSorted() === "desc" ? <ArrowDown size={12} /> :
                       <ArrowUpDown size={12} className="opacity-30" />}
                    </div>
                  </th>
                ))
              )}
            </tr>
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center">
                  <FileText size={28} className="text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Nicio ofertă găsită.</p>
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} onClick={() => router.push(`/offers/${row.original.id}`)} className="border-b border-border/50 hover:bg-muted/20 transition-colors cursor-pointer">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-border">
        <p className="text-xs text-muted-foreground">{data.length} oferte</p>
        <div className="flex items-center gap-1">
          <button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground disabled:opacity-30 transition-colors">
            <ChevronLeft size={14} />
          </button>
          <span className="text-xs text-muted-foreground px-2">{table.getState().pagination.pageIndex + 1} / {table.getPageCount()}</span>
          <button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground disabled:opacity-30 transition-colors">
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────
// Offers Kanban (Pipeline)
// ────────────────────────────────────────────

function OffersKanban({ offers: data, onStatusChange }: { offers: ApiOffer[]; onStatusChange?: () => void }) {
  const router = useRouter()
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverCol, setDragOverCol] = useState<OfferStatus | null>(null)
  const [localOffers, setLocalOffers] = useState(data)

  // Sync when filters change
  useEffect(() => setLocalOffers(data), [data])

  const byStatus = useMemo(() => {
    const map: Record<string, ApiOffer[]> = {}
    pipelineColumns.forEach((c) => { map[c.status] = [] })
    localOffers.forEach((o) => { if (map[o.status]) map[o.status]!.push(o) })
    return map
  }, [localOffers])

  const handleDrop = async (e: React.DragEvent, newStatus: OfferStatus) => {
    e.preventDefault()
    setDragOverCol(null)
    if (!draggedId) return

    // Optimistic update
    setLocalOffers((prev) => prev.map((o) => o.id === draggedId ? { ...o, status: newStatus } : o))
    setDraggedId(null)

    // Persist to API
    try {
      await fetch(`/api/offers/${draggedId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      onStatusChange?.()
    } catch (err) {
      console.error('Failed to update offer status:', err)
    }
  }

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-3 min-w-max">
        {pipelineColumns.map((col) => {
          const colOffers = byStatus[col.status] || []
          const colValue = colOffers.reduce((s, o) => s + o.value, 0)
          const cfg = offerStatusConfig[col.status]
          const Icon = cfg.icon

          return (
            <div
              key={col.status}
              className={cn(
                "w-[260px] flex-shrink-0 flex flex-col rounded-xl bg-muted/30 border transition-all",
                dragOverCol === col.status ? cn("border-2", col.borderColor, "bg-muted/50") : "border-border/50"
              )}
              onDragOver={(e) => { e.preventDefault(); setDragOverCol(col.status) }}
              onDragLeave={() => setDragOverCol(null)}
              onDrop={(e) => handleDrop(e, col.status)}
            >
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/30">
                <div className="flex items-center gap-2">
                  <Icon size={13} className={col.color} />
                  <span className="text-xs font-semibold text-foreground">{col.label}</span>
                  <span className="text-[11px] font-medium text-muted-foreground bg-muted rounded-full px-1.5 py-0.5">{colOffers.length}</span>
                </div>
                <span className={cn("text-[11px] font-semibold", col.color)}>{formatCurrency(colValue)}</span>
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-2 max-h-96">
                {colOffers.map((offer) => (
                  <div
                    key={offer.id}
                    draggable
                    onDragStart={(e) => { setDraggedId(offer.id); e.dataTransfer.effectAllowed = "move"; (e.currentTarget as HTMLElement).style.opacity = "0.5" }}
                    onDragEnd={(e) => { setDraggedId(null); (e.currentTarget as HTMLElement).style.opacity = "1" }}
                    className={cn(
                      "bg-surface rounded-lg border border-border p-3 cursor-grab hover:border-primary/30 hover:shadow-md transition-all group",
                      draggedId === offer.id && "opacity-50"
                    )}
                    onClick={() => { if (!draggedId) router.push(`/offers/${offer.id}`) }}
                  >
                    <div className="flex items-start justify-between mb-1.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">{offer.entityName}</p>
                        <p className="text-[10px] text-muted-foreground">{offer.number}</p>
                      </div>
                      <GripVertical size={12} className="text-muted-foreground/30 group-hover:text-muted-foreground" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">{formatCurrency(offer.value)}</span>
                      <BusinessLineBadge lineId={offer.businessLine} />
                    </div>
                    {offer.blocks?.some((b) => b.aiGenerated) && (
                      <div className="mt-1.5 flex items-center gap-1 text-[9px] font-bold text-violet-400">
                        <Sparkles size={8} /> AI Generated
                      </div>
                    )}
                  </div>
                ))}
                {colOffers.length === 0 && (
                  <p className="text-[11px] text-muted-foreground/50 text-center py-4">Nicio ofertă</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

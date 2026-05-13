"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table"
import { fetchClients, type APIClient } from "@/lib/api"
import { usePanel } from "@/components/panel-context"
import { useBusinessLine } from "@/components/business-line-context"
import { cn, formatCurrency, formatDate, getInitials } from "@/lib/utils"
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  Download,
  Plus,
  Loader2,
  Eye,
} from "lucide-react"
import { NewClientModal } from "@/components/entity-forms"

const statusConfig: Record<string, { label: string; class: string }> = {
  activ: { label: "Activ", class: "bg-success/10 text-success" },
  inactiv: { label: "Inactiv", class: "bg-muted text-muted-foreground" },
  prospect: { label: "Prospect", class: "bg-info/10 text-info" },
}

export default function ClientiPage() {
  const { openClient } = usePanel()
  const { activeLineId, isAll, activeLine } = useBusinessLine()
  const router = useRouter()
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [showNewClient, setShowNewClient] = useState(false)
  const [clients, setClients] = useState<APIClient[]>([])
  const [loading, setLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)

  // Fetch from API
  const loadClients = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = { limit: "100" }
      if (!isAll && activeLine) params.businessLine = activeLine.id
      if (statusFilter !== "all") params.status = statusFilter
      if (globalFilter) params.search = globalFilter
      const res = await fetchClients(params)
      setClients(res.data)
      setTotalCount(res.pagination.total)
    } catch (err) {
      console.error("Failed to fetch clients:", err)
    } finally {
      setLoading(false)
    }
  }, [activeLineId, statusFilter, globalFilter, isAll, activeLine])

  useEffect(() => {
    loadClients()
  }, [loadClients])

  // Click pe row → navigare directă la pagina clientului
  const handleOpenClient = (apiClient: APIClient) => {
    router.push(`/crm/clienti/${apiClient.id}`)
  }

  // Preview panel — declanșat din icon
  const handlePreview = (e: React.MouseEvent, apiClient: APIClient) => {
    e.stopPropagation() // nu declanșa navigarea din row click
    const panelClient = {
      id: apiClient.id,
      businessLine: apiClient.businessLine.slug,
      entityType: apiClient.entityType,
      companyName: apiClient.companyName,
      cui: apiClient.cui || "",
      regCom: apiClient.regCom || undefined,
      contactPerson: apiClient.contactPerson,
      email: apiClient.email,
      phone: apiClient.phone || "",
      status: apiClient.status as any,
      industry: apiClient.industry || "",
      website: apiClient.website || undefined,
      address: apiClient.address || undefined,
      monthlyRevenue: 0,
      contractStartDate: apiClient.createdAt,
      services: [],
      notes: apiClient.notes || undefined,
      createdAt: apiClient.createdAt,
    }
    openClient(panelClient as any)
  }

  const columns: ColumnDef<APIClient>[] = useMemo(
    () => [
      {
        accessorKey: "companyName",
        header: "Companie",
        cell: ({ row }) => {
          const client = row.original
          return (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-[11px] font-bold text-primary flex-shrink-0">
                {getInitials(client.companyName)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{client.companyName}</p>
                <p className="text-[11px] text-muted-foreground truncate">{client.contactPerson}</p>
              </div>
            </div>
          )
        },
      },
      {
        accessorKey: "industry",
        header: "Industrie",
        cell: ({ getValue }) => (
          <span className="text-xs text-foreground-secondary">{(getValue() as string) || "—"}</span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ getValue }) => {
          const status = getValue() as string
          const config = statusConfig[status]
          return (
            <span className={cn("px-2.5 py-1 text-[11px] font-semibold rounded-full", config?.class)}>
              {config?.label || status}
            </span>
          )
        },
      },
      {
        id: "businessLine",
        header: "Linie",
        cell: ({ row }) => (
          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            {row.original.businessLine.name}
          </span>
        ),
      },
      {
        id: "stats",
        header: "Relații",
        cell: ({ row }) => {
          const c = row.original._count
          if (!c) return <span className="text-xs text-muted-foreground">—</span>
          return (
            <div className="flex gap-2 text-[10px] text-muted-foreground">
              {c.offers > 0 && <span title="Oferte">{c.offers} of.</span>}
              {c.contracts > 0 && <span title="Contracte">{c.contracts} ctr.</span>}
              {c.projects > 0 && <span title="Proiecte">{c.projects} pj.</span>}
              {c.invoices > 0 && <span title="Facturi">{c.invoices} inv.</span>}
              {(c.offers + c.contracts + c.projects + c.invoices === 0) && <span>—</span>}
            </div>
          )
        },
        enableSorting: false,
      },
      {
        accessorKey: "createdAt",
        header: "Adăugat",
        cell: ({ getValue }) => (
          <span className="text-xs text-foreground-secondary tabular-nums">
            {formatDate(getValue() as string)}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <button
            onClick={(e) => handlePreview(e, row.original)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors opacity-0 group-hover:opacity-100"
            title="Preview rapid"
          >
            <Eye size={14} />
          </button>
        ),
        enableSorting: false,
      },
    ],
    []
  )

  const table = useReactTable({
    data: clients,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 15 } },
  })

  return (
    <div className="p-4 md:p-6 space-y-4 animate-fade-in">
      <NewClientModal open={showNewClient} onClose={() => setShowNewClient(false)} />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Clienți</h1>
          <p className="text-sm text-muted-foreground">
            {totalCount} clienți • {clients.filter((c) => c.status === "activ").length} activi
          </p>
        </div>
        <button onClick={() => setShowNewClient(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors shadow-sm">
          <Plus size={16} />
          Client Nou
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-surface rounded-xl border border-border p-3">
        {/* Search */}
        <div className="relative flex-1 w-full sm:max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Caută companie, persoană, email..."
            value={globalFilter ?? ""}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="w-full h-9 pl-9 pr-3 bg-muted/50 rounded-lg border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
          />
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-1.5">
          <Filter size={14} className="text-muted-foreground" />
          {[
            { value: "all", label: "Toți" },
            { value: "activ", label: "Activi" },
            { value: "inactiv", label: "Inactivi" },
            { value: "prospect", label: "Prospecți" },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={cn(
                "px-2.5 py-1.5 text-xs font-medium rounded-lg transition-all",
                statusFilter === f.value
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Export */}
        <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors ml-auto">
          <Download size={14} />
          Export
        </button>
      </div>

      {/* Table */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="text-primary animate-spin" />
            <span className="ml-2 text-sm text-muted-foreground">Se încarcă...</span>
          </div>
        ) : (
          <>
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
                            {header.column.getIsSorted() === "asc" ? (
                              <ArrowUp size={12} />
                            ) : header.column.getIsSorted() === "desc" ? (
                              <ArrowDown size={12} />
                            ) : (
                              <ArrowUpDown size={12} />
                            )}
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
                  onClick={() => handleOpenClient(row.original)}
                  className="border-b border-border/50 hover:bg-muted/30 cursor-pointer transition-colors group"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/10">
          <span className="text-xs text-muted-foreground">
            Pagina {table.getState().pagination.pageIndex + 1} din {table.getPageCount()} • {totalCount} total
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
          </>
        )}
      </div>
    </div>
  )
}

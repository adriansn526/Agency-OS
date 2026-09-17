"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table"
import { fetchSuppliers, type APISupplier } from "@/lib/api"
import { cn, formatDate, getInitials } from "@/lib/utils"
import { Eye, Plus, Search, Building2 } from "lucide-react"
import { toast } from "sonner"
import { GripVertical, Columns, RefreshCw } from "lucide-react"
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import type { Header } from "@tanstack/react-table"



const DraggableTableHeader = ({ header }: { header: Header<APISupplier, unknown> }) => {
  const { attributes, isDragging, listeners, setNodeRef, transform, transition } = useSortable({
    id: header.column.id,
  })

  if (header.column.id === 'select') {
    return (
      <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap bg-muted/30 w-10">
        {flexRender(header.column.columnDef.header, header.getContext())}
      </th>
    )
  }

  const style: React.CSSProperties = {
    opacity: isDragging ? 0.8 : 1,
    position: "relative",
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 1 : 0,
  }

  return (
    <th
      ref={setNodeRef}
      style={style}
      className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap bg-muted/30"
    >
      <div className="flex items-center gap-2">
        <button {...attributes} {...listeners} className="cursor-grab hover:bg-background p-1 rounded-md text-muted-foreground hover:text-foreground">
          <GripVertical size={14} />
        </button>
        {header.isPlaceholder
          ? null
          : flexRender(header.column.columnDef.header, header.getContext())}
      </div>
    </th>
  )
}

const defaultColumnOrder = ["select", "name", "category", "status", "recurrence", "stats", "totalAmount", "createdAt"]

const statusConfig: Record<string, { label: string; class: string }> = {
  active: { label: "Activ", class: "bg-success/10 text-success" },
  inactive: { label: "Inactiv", class: "bg-muted text-muted-foreground" },
}

export default function SuppliersPage() {
  const router = useRouter()
  const [globalFilter, setGlobalFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [vatRegimeFilter, setVatRegimeFilter] = useState<string>("all")
  
  // Default date range: start of current month to end of current month
  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0]
  })

    const [rowSelection, setRowSelection] = useState({})
  const [categories, setCategories] = useState<{name: string}[]>([])
  
  useEffect(() => {
    fetch('/api/accounting/expense-categories?activeOnly=true')
      .then(res => res.json())
      .then(json => {
        if (json.data) setCategories(json.data)
      })
  }, [])

  const handleBulkAssignCategory = async (category: string) => {
    const selectedIds = Object.keys(rowSelection)
    if (!selectedIds.length || !category) return
    
    try {
      const res = await fetch('/api/suppliers/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supplierIds: selectedIds, data: { category } })
      })
      if (!res.ok) throw new Error('Failed to bulk assign')
      toast.success(`${selectedIds.length} furnizori actualizați cu succes!`)
      setRowSelection({})
      loadSuppliers()
    } catch (err) {
      toast.error('Eroare la actualizarea furnizorilor')
    }
  }

  const [suppliers, setSuppliers] = useState<APISupplier[]>([])
  const [loading, setLoading] = useState(true)

  const [showColMenu, setShowColMenu] = useState(false)
  const [columnVisibility, setColumnVisibility] = useState({})
  const [columnOrder, setColumnOrder] = useState<string[]>(defaultColumnOrder)
  
  useEffect(() => {
    const savedVisibility = localStorage.getItem('agencyos-suppliers-col-visibility')
    const savedOrder = localStorage.getItem('agencyos-suppliers-col-order')
    if (savedVisibility) setColumnVisibility(JSON.parse(savedVisibility))
    if (savedOrder) setColumnOrder(JSON.parse(savedOrder))
  }, [])

  const saveColumnVisibility = (updaterOrValue: any) => {
    setColumnVisibility((old: any) => {
      const newValue = typeof updaterOrValue === 'function' ? updaterOrValue(old) : updaterOrValue
      localStorage.setItem('agencyos-suppliers-col-visibility', JSON.stringify(newValue))
      return newValue
    })
  }

  const resetColumns = () => {
    setColumnVisibility({})
    setColumnOrder(defaultColumnOrder)
    localStorage.removeItem('agencyos-suppliers-col-visibility')
    localStorage.removeItem('agencyos-suppliers-col-order')
  }

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 5 } }),
    useSensor(KeyboardSensor)
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (active && over && active.id !== over.id) {
      setColumnOrder((order) => {
        const oldIndex = order.indexOf(active.id as string)
        const newIndex = order.indexOf(over.id as string)
        const newOrder = arrayMove(order, oldIndex, newIndex)
        localStorage.setItem('agencyos-suppliers-col-order', JSON.stringify(newOrder))
        return newOrder
      })
    }
  }


  const loadSuppliers = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = {}
      if (statusFilter !== "all") params.status = statusFilter
      if (vatRegimeFilter !== "all") params.vatRegime = vatRegimeFilter
      if (globalFilter) params.search = globalFilter
      if (startDate) params.startDate = startDate
      if (endDate) params.endDate = endDate
      const res = await fetchSuppliers(params)
      setSuppliers(res.data || [])
    } catch (err) {
      console.error("Failed to fetch suppliers:", err)
    } finally {
      setLoading(false)
    }
  }, [statusFilter, vatRegimeFilter, globalFilter, startDate, endDate])

  useEffect(() => {
    loadSuppliers()
  }, [loadSuppliers])

  const handleOpenSupplier = (supplier: APISupplier) => {
    router.push(`/suppliers/${supplier.id}`)
  }

  const columns: ColumnDef<APISupplier>[] = useMemo(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <div className="px-1" onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              className="w-4 h-4 rounded border-border accent-primary cursor-pointer"
              checked={table.getIsAllPageRowsSelected()}
              onChange={table.getToggleAllPageRowsSelectedHandler()}
            />
          </div>
        ),
        cell: ({ row }) => (
          <div className="px-1" onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              className="w-4 h-4 rounded border-border accent-primary cursor-pointer"
              checked={row.getIsSelected()}
              onChange={row.getToggleSelectedHandler()}
            />
          </div>
        ),
      },
      {
        accessorKey: "name",
        header: "Furnizor",
        cell: ({ row }) => {
          const s = row.original
          return (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-[11px] font-bold text-primary flex-shrink-0">
                {getInitials(s.name)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{s.name}</p>
                <p className="text-[11px] text-muted-foreground truncate">{s.cui || "Fără CUI"}</p>
              </div>
            </div>
          )
        },
      },
      {
        accessorKey: "category",
        header: "Categorie",
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
            <span className={cn("px-2.5 py-1 text-[11px] font-semibold rounded-full", config?.class || "bg-muted")}>
              {config?.label || status}
            </span>
          )
        },
      },
      {
        id: "recurrence",
        header: "Facturare",
        cell: ({ row }) => {
          const s = row.original
          return s.isRecurring ? (
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600">
              Recurent (Ziua {s.expectedDay || "-"})
            </span>
          ) : (
            <span className="text-[10px] uppercase px-2 py-0.5 text-muted-foreground">Ocasional</span>
          )
        },
      },
      {
        id: "stats",
        header: "Facturi",
        cell: ({ row }) => {
          const c = row.original._count
          return (
            <span className="text-xs text-muted-foreground font-medium">
              {c?.invoices || 0}
            </span>
          )
        },
      },
      {
        id: "totalAmount",
        header: () => (
          <div className="group relative inline-flex items-center gap-1 cursor-help">
            <span>Suma Totală</span>
            <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 bg-popover text-popover-foreground text-[10px] rounded shadow-lg w-48 whitespace-normal z-10 border">
              Suma brută a facturilor confirmate în perioada selectată (exclude facturile în așteptare).
            </div>
          </div>
        ),
        cell: ({ row }) => {
          const amount = (row.original as any).totalAmount || 0
          return (
            <span className="text-sm font-semibold text-foreground">
              {Number(amount).toLocaleString('ro-RO', { style: 'currency', currency: 'RON' })}
            </span>
          )
        },
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
    ],
    []
  )

  const table = useReactTable({
    data: suppliers,
    columns,
    getRowId: row => row.id,
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    state: {
      columnVisibility,
      columnOrder,
      rowSelection,
    },
    onColumnVisibilityChange: saveColumnVisibility,
    onColumnOrderChange: setColumnOrder,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border bg-surface px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Building2 size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Furnizori</h1>
            <p className="text-sm text-muted-foreground">Gestionează datele de facturare și extrasele.</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center justify-end gap-2">
          {/* Filters */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
            <input
              type="text"
              placeholder="Caută furnizor..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="h-9 w-[200px] bg-background border border-border rounded-lg pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
          
          <div className="flex gap-2 items-center bg-background border border-border rounded-lg px-2">
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-9 bg-transparent border-none text-xs outline-none focus:ring-0 text-muted-foreground" />
            <span className="text-muted-foreground text-xs">-</span>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-9 bg-transparent border-none text-xs outline-none focus:ring-0 text-muted-foreground" />
          </div>
          
          <div className="flex gap-2">
            <select
              className="h-9 rounded-xl bg-background border border-border/50 text-sm px-3 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium text-foreground min-w-[140px]"
              value={vatRegimeFilter}
              onChange={(e) => setVatRegimeFilter(e.target.value)}
            >
              <option value="all">Toate Tările</option>
              <option value="domestic">Național (RO)</option>
              <option value="intracommunity">Intracomunitar (UE)</option>
              <option value="extracommunity">Extra-comunitar (Non-UE)</option>
            </select>
            <select
              className="h-9 rounded-xl bg-background border border-border/50 text-sm px-3 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium text-foreground min-w-[120px]"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Toate statusurile</option>
              <option value="active">Activ</option>
              <option value="inactive">Inactiv</option>
            </select>
          </div>

          
          <div className="relative">
            <button
              onClick={() => setShowColMenu(!showColMenu)}
              className="h-9 px-3 bg-background border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors flex items-center gap-2 shadow-sm"
            >
              <Columns size={16} /> Coloane
            </button>
            {showColMenu && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-popover border border-border shadow-lg rounded-xl p-2 z-50">
                <div className="flex items-center justify-between px-2 py-1 mb-2 border-b border-border">
                  <span className="text-xs font-semibold text-muted-foreground uppercase">Vizibilitate</span>
                  <button onClick={resetColumns} className="text-xs text-primary hover:underline flex items-center gap-1">
                    <RefreshCw size={10} /> Reset
                  </button>
                </div>
                {table.getAllLeafColumns().map(column => {
                  return (
                    <div key={column.id} className="px-2 py-1.5 flex items-center gap-2 text-sm text-foreground hover:bg-muted/50 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={column.getIsVisible()}
                        onChange={column.getToggleVisibilityHandler()}
                        className="rounded border-muted-foreground/30 accent-primary"
                      />
                      <span className="flex-1 select-none" onClick={column.getToggleVisibilityHandler()}>
                        {typeof column.columnDef.header === 'string' ? column.columnDef.header : (column.id === 'totalAmount' ? 'Suma Totală' : column.id)}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          
          <button className="h-9 px-4 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2 shadow-sm">

            <Plus size={16} /> Adaugă Furnizor
          </button>
        </div>
      </div>

      
      {Object.keys(rowSelection).length > 0 && (
        <div className="bg-primary/5 border-b border-primary/20 px-6 py-3 flex items-center justify-between animate-in slide-in-from-top-2">
          <div className="text-sm font-medium text-primary">
            {Object.keys(rowSelection).length} furnizori selectați
          </div>
          <div className="flex items-center gap-3">
            <select 
              className="h-8 rounded-lg bg-background border border-border text-sm px-2 outline-none focus:ring-1 focus:ring-primary min-w-[150px]"
              onChange={(e) => {
                if (e.target.value) {
                  handleBulkAssignCategory(e.target.value)
                  e.target.value = ""
                }
              }}
              defaultValue=""
            >
              <option value="" disabled>Atribuie Categorie...</option>
              {categories.map(c => (
                <option key={c.name} value={c.name}>{c.name}</option>
              ))}
            </select>
            <button 
              onClick={() => setRowSelection({})} 
              className="text-xs text-muted-foreground hover:text-foreground hover:underline"
            >
              Anulează
            </button>
          </div>
        </div>
      )}

      {/* Table Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
              <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
              <p className="text-sm">Se încarcă furnizorii...</p>
            </div>
          ) : suppliers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[400px] text-center px-4">
              <Building2 className="w-12 h-12 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-1">Nu s-a găsit niciun furnizor</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                Adaugă un furnizor nou pentru a-i urmări plățile și facturile.
              </p>
              <button className="h-9 px-4 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors inline-flex items-center gap-2">
                <Plus size={16} /> Adaugă Primul Furnizor
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <DndContext
                      key={headerGroup.id}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                      sensors={sensors}
                    >
                      <tr className="border-b border-border bg-muted/30">
                        <SortableContext
                          items={headerGroup.headers.map(h => h.column.id)}
                          strategy={horizontalListSortingStrategy}
                        >
                          {headerGroup.headers.map((header) => (
                            <DraggableTableHeader key={header.id} header={header} />
                          ))}
                        </SortableContext>
                      </tr>
                    </DndContext>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => handleOpenSupplier(row.original)}
                      className="border-b border-border hover:bg-muted/30 transition-colors cursor-pointer group"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-4 py-3 align-middle">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

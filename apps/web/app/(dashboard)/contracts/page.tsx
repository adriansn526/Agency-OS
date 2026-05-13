"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  FileText,
  Search,
  Plus,
  Loader2,
  Calendar,
  DollarSign,
  Building2,
  ArrowRight,
} from "lucide-react"
import { useBusinessLine } from "@/components/business-line-context"
import { cn } from "@/lib/utils"

interface ContractItem {
  id: string
  number: string
  clientName: string
  clientId: string
  status: string
  value: number
  currency: string
  duration: number
  startDate: string
  endDate: string
  businessLine: string
  businessLineName: string
  offerNumber?: string
  createdAt: string
}

const statusLabels: Record<string, string> = {
  draft: "Draft",
  sent: "Trimis",
  signed: "Semnat",
  active: "Activ",
  expired: "Expirat",
  cancelled: "Anulat",
}

const statusColors: Record<string, string> = {
  draft: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  sent: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  signed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  active: "bg-green-500/10 text-green-400 border-green-500/20",
  expired: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  cancelled: "bg-red-500/10 text-red-400 border-red-500/20",
}

export default function ContractsPage() {
  const [contracts, setContracts] = useState<ContractItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const { activeLineId } = useBusinessLine()

  const fetchContracts = (searchTerm?: string) => {
    setLoading(true)
    const params = new URLSearchParams({ limit: "100" })
    if (activeLineId && activeLineId !== "all") params.set("businessLine", activeLineId)
    if (searchTerm) params.set("search", searchTerm)
    if (statusFilter !== "all") params.set("status", statusFilter)
    fetch(`/api/contracts?${params}`)
      .then((r) => r.json())
      .then((j) => setContracts(j.data || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchContracts(search)
  }, [activeLineId, statusFilter])

  const handleSearch = () => fetchContracts(search)

  const formatCurrency = (val: number, currency: string) =>
    new Intl.NumberFormat("ro-RO", { style: "currency", currency, minimumFractionDigits: 0 }).format(val)

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("ro-RO", { day: "numeric", month: "short", year: "numeric" })

  return (
    <div className="p-4 md:p-6 space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Contracte</h1>
          <p className="text-sm text-muted-foreground">
            {contracts.length} contracte • {contracts.filter((c) => c.status === "active" || c.status === "signed").length} active
          </p>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Caută contract sau client..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-surface border border-border rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm bg-surface border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="all">Toate statusurile</option>
          <option value="draft">Draft</option>
          <option value="sent">Trimis</option>
          <option value="signed">Semnat</option>
          <option value="active">Activ</option>
          <option value="expired">Expirat</option>
          <option value="cancelled">Anulat</option>
        </select>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-primary" />
        </div>
      )}

      {/* Empty */}
      {!loading && contracts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FileText size={40} className="text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">Niciun contract găsit.</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Generează un contract dintr-o ofertă acceptată.</p>
        </div>
      )}

      {/* Contracts Grid */}
      {!loading && contracts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {contracts.map((contract) => (
            <Link
              key={contract.id}
              href={`/contracts/${contract.id}`}
              className="group bg-surface rounded-xl border border-border p-4 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs font-mono font-bold text-primary">{contract.number}</p>
                  <p className="text-sm font-semibold text-foreground mt-0.5">{contract.clientName}</p>
                </div>
                <span className={cn("px-2 py-0.5 text-[10px] font-bold uppercase rounded-full border", statusColors[contract.status] || statusColors.draft)}>
                  {statusLabels[contract.status] || contract.status}
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <DollarSign size={11} />
                  <span>{formatCurrency(contract.value, contract.currency)} / lună</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar size={11} />
                  <span>{formatDate(contract.startDate)} — {formatDate(contract.endDate)}</span>
                  <span className="text-muted-foreground/50">({contract.duration} luni)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Building2 size={11} />
                  <span>{contract.businessLineName}</span>
                </div>
                {contract.offerNumber && (
                  <div className="flex items-center gap-1.5">
                    <FileText size={11} />
                    <span>Ref: {contract.offerNumber}</span>
                  </div>
                )}
              </div>

              <div className="mt-3 pt-2 border-t border-border/50 flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">{formatDate(contract.createdAt)}</span>
                <span className="text-[10px] text-primary font-medium flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  Deschide <ArrowRight size={10} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

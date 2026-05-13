"use client"

import { useState, useEffect } from "react"
import { useBusinessLine } from "@/components/business-line-context"
import { Users, Search, UserX, Phone, Mail, MapPin, Building2 } from "lucide-react"

export default function MarketingContactsPage() {
  const { activeLineId } = useBusinessLine()
  const [leads, setLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0 })

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({
      page: String(page),
      limit: "25",
    })
    if (activeLineId !== "all") params.set("businessLine", activeLineId)
    if (search) params.set("search", search)

    fetch(`/api/leads?${params}`)
      .then(r => r.json())
      .then(res => {
        setLeads(res.data || [])
        setPagination(res.pagination || { total: 0, totalPages: 0 })
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [activeLineId, page, search])

  const handleToggleOptOut = async (leadId: string, currentOptOut: boolean) => {
    try {
      await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          optOut: !currentOptOut,
          optOutAt: !currentOptOut ? new Date().toISOString() : null,
        }),
      })
      setLeads(prev =>
        prev.map(l => l.id === leadId ? { ...l, optOut: !currentOptOut } : l)
      )
    } catch (err) {
      console.error("Failed to toggle opt-out:", err)
    }
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px]">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            Contacte Marketing
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Lead-uri din CRM disponibile pentru campanii · {pagination.total} contacte
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Caută companie, contact, email..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
        />
      </div>

      {/* Table */}
      <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Companie</th>
                <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Contact</th>
                <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Telefon</th>
                <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Email</th>
                <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Județ</th>
                <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Industrie</th>
                <th className="text-center px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Opt-out</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(10)].map((_, i) => (
                  <tr key={i} className="border-b">
                    {[...Array(7)].map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-muted animate-pulse rounded" /></td>
                    ))}
                  </tr>
                ))
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    Niciun contact găsit
                  </td>
                </tr>
              ) : (
                leads.map(lead => (
                  <tr key={lead.id} className={`border-b hover:bg-muted/20 transition-colors ${lead.optOut ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <span className="font-medium truncate max-w-[200px]">{lead.companyName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{lead.contactPerson}</td>
                    <td className="px-4 py-3">
                      {lead.phone && (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Phone className="w-3 h-3" /> {lead.phone}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Mail className="w-3 h-3" /> <span className="truncate max-w-[180px]">{lead.email}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {lead.county && (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <MapPin className="w-3 h-3" /> {lead.county}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {lead.industry && (
                        <span className="px-2 py-0.5 text-[10px] font-semibold bg-muted rounded uppercase tracking-wider">
                          {lead.industry}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleToggleOptOut(lead.id, lead.optOut)}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                          lead.optOut
                            ? 'bg-red-100 text-red-600 hover:bg-red-200'
                            : 'bg-green-50 text-green-600 hover:bg-green-100'
                        }`}
                        title={lead.optOut ? 'Opt-out activ — click pentru reactivare' : 'Activ — click pentru opt-out'}
                      >
                        {lead.optOut ? <UserX className="w-4 h-4" /> : '✓'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20">
            <span className="text-xs text-muted-foreground">
              Pagina {page} din {pagination.totalPages} · {pagination.total} contacte
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 text-xs font-medium rounded border hover:bg-muted disabled:opacity-40"
              >
                ← Anterior
              </button>
              <button
                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
                className="px-3 py-1 text-xs font-medium rounded border hover:bg-muted disabled:opacity-40"
              >
                Următor →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

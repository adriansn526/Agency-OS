"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Search, User, Building2, X, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

/* ── Types ── */

export interface ClientOption {
  id: string
  companyName: string
  contactPerson: string
  email: string
  status: string
  industry?: string
}

interface ClientAutocompleteProps {
  value?: ClientOption | null
  onChange: (client: ClientOption | null) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

/* ── Component ── */

export function ClientAutocomplete({
  value,
  onChange,
  placeholder = "Caută client sau lead...",
  className,
  disabled,
}: ClientAutocompleteProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<ClientOption[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [highlightIdx, setHighlightIdx] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Fetch clients with debounce
  const searchClients = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 1) {
      setResults([])
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/clients?search=${encodeURIComponent(searchQuery)}&limit=10`)
      const json = await res.json()
      const clients: ClientOption[] = (json.data || []).map((c: any) => ({
        id: c.id,
        companyName: c.companyName,
        contactPerson: c.contactPerson,
        email: c.email,
        status: c.status,
        industry: c.industry,
      }))
      setResults(clients)
      setHighlightIdx(-1)
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!open) return
    debounceRef.current = setTimeout(() => searchClients(query), 250)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, open, searchClients])

  // Load initial results when opening
  useEffect(() => {
    if (open && results.length === 0 && query.length === 0) {
      searchClients("")
      // Fetch some recent clients
      fetch('/api/clients?limit=8')
        .then(r => r.json())
        .then(json => {
          if (json.data) {
            setResults(json.data.map((c: any) => ({
              id: c.id,
              companyName: c.companyName,
              contactPerson: c.contactPerson,
              email: c.email,
              status: c.status,
              industry: c.industry,
            })))
          }
        })
        .catch(() => {})
    }
  }, [open])

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  // Keyboard nav
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setHighlightIdx(prev => Math.min(prev + 1, results.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setHighlightIdx(prev => Math.max(prev - 1, 0))
    } else if (e.key === "Enter" && highlightIdx >= 0) {
      e.preventDefault()
      selectClient(results[highlightIdx]!)
    } else if (e.key === "Escape") {
      setOpen(false)
    }
  }

  const selectClient = (client: ClientOption) => {
    onChange(client)
    setQuery("")
    setOpen(false)
  }

  const clearSelection = () => {
    onChange(null)
    setQuery("")
    inputRef.current?.focus()
  }

  // ── Render selected client ──
  if (value) {
    return (
      <div className={cn("flex items-center gap-2 px-3 py-2 bg-primary/5 border border-primary/20 rounded-lg", className)}>
        <Building2 size={14} className="text-primary flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-foreground truncate">{value.companyName}</p>
          <p className="text-[10px] text-muted-foreground truncate">{value.contactPerson} • {value.email}</p>
        </div>
        {!disabled && (
          <button
            onClick={clearSelection}
            className="flex items-center justify-center w-5 h-5 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
          >
            <X size={10} />
          </button>
        )}
      </div>
    )
  }

  // ── Render search input ──
  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full pl-8 pr-3 py-2 text-xs bg-muted/30 border border-border rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all"
        />
        {loading && (
          <Loader2 size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground animate-spin" />
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-surface border border-border rounded-xl shadow-lg shadow-black/10 max-h-64 overflow-y-auto animate-fade-in"
        >
          {results.length === 0 && !loading && query.length > 0 && (
            <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
              Niciun client găsit pentru „{query}"
            </div>
          )}
          {results.length === 0 && !loading && query.length === 0 && (
            <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
              Scrie pentru a căuta...
            </div>
          )}
          {results.map((client, idx) => (
            <button
              key={client.id}
              onClick={() => selectClient(client)}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-muted/50",
                highlightIdx === idx && "bg-primary/5",
                idx < results.length - 1 && "border-b border-border/30"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                client.status === "activ" ? "bg-emerald-500/10" : "bg-muted"
              )}>
                <User size={13} className={client.status === "activ" ? "text-emerald-500" : "text-muted-foreground"} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">{client.companyName}</p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {client.contactPerson}
                  {client.industry && <span className="ml-1 text-muted-foreground/50">• {client.industry}</span>}
                </p>
              </div>
              <span className={cn(
                "px-1.5 py-0.5 text-[8px] font-bold uppercase rounded-full",
                client.status === "activ" ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-muted-foreground"
              )}>
                {client.status}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

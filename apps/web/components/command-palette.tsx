"use client"

import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { cn, formatCurrency } from "@/lib/utils"
import { allClients, allLeads, projects, offers, businessLines } from "@repo/mock-data"
import { Search, X, Users, FolderKanban, Send, ArrowRight, CornerDownLeft, Hash } from "lucide-react"

// ────────────────────────────────────────────
// Search Index
// ────────────────────────────────────────────

interface SearchResult {
  type: "entity" | "project" | "offer" | "page"
  title: string
  subtitle: string
  href: string
  businessLine?: string
  icon: React.ElementType
}

const pages: SearchResult[] = [
  { type: "page", title: "Dashboard", subtitle: "Pagina principală", href: "/", icon: Hash },
  { type: "page", title: "CRM", subtitle: "Managementul relațiilor cu clienții", href: "/crm", icon: Hash },
  { type: "page", title: "Lead-uri", subtitle: "Pipeline lead-uri", href: "/crm/lead-uri", icon: Hash },
  { type: "page", title: "Clienți", subtitle: "Lista clienți", href: "/crm/clienti", icon: Hash },
  { type: "page", title: "Proiecte", subtitle: "Board proiecte", href: "/projects", icon: Hash },
  { type: "page", title: "Financiar", subtitle: "Dashboard financiar", href: "/finance", icon: Hash },
  { type: "page", title: "Oferte", subtitle: "Oferte & Propuneri", href: "/offers", icon: Hash },
  { type: "page", title: "Activity Log", subtitle: "Jurnal de activitate", href: "/activity", icon: Hash },
  { type: "page", title: "Setări", subtitle: "Configurare platformă", href: "/settings/business-lines", icon: Hash },
  { type: "page", title: "Roluri", subtitle: "Roluri & Permisiuni", href: "/settings/roles", icon: Hash },
]

function buildSearchIndex(): SearchResult[] {
  const results: SearchResult[] = []

  // Entities (clients)
  allClients.forEach((c) => {
    results.push({
      type: "entity",
      title: c.companyName,
      subtitle: `${c.contactPerson} • ${c.email}`,
      href: "/crm/clienti",
      businessLine: c.businessLine,
      icon: Users,
    })
  })

  // Leads
  allLeads.forEach((l) => {
    results.push({
      type: "entity",
      title: l.companyName,
      subtitle: `Lead • ${l.contactPerson} • ${formatCurrency(l.estimatedValue)}`,
      href: "/crm/lead-uri",
      businessLine: l.businessLine,
      icon: Users,
    })
  })

  // Projects
  projects.forEach((p) => {
    results.push({
      type: "project",
      title: p.name,
      subtitle: `Progres ${p.progress}% • ${formatCurrency(p.budget)}`,
      href: `/projects/${p.id}`,
      businessLine: p.businessLine,
      icon: FolderKanban,
    })
  })

  // Offers
  offers.forEach((o) => {
    results.push({
      type: "offer",
      title: `${o.number} — ${o.entityName}`,
      subtitle: `${o.templateName} • ${formatCurrency(o.value)}`,
      href: "/offers",
      businessLine: o.businessLine,
      icon: Send,
    })
  })

  return results
}

// ────────────────────────────────────────────
// Component
// ────────────────────────────────────────────

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const allResults = useMemo(() => buildSearchIndex(), [])

  // Keyboard shortcut: /
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // / to open (only when not in an input)
      if (e.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault()
        setOpen(true)
      }
      // Escape to close
      if (e.key === "Escape" && open) {
        setOpen(false)
        setQuery("")
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [open])

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
      setSelectedIndex(0)
    }
  }, [open])

  const results = useMemo(() => {
    if (!query.trim()) return pages // show pages when empty
    const q = query.toLowerCase()
    const matched = allResults.filter((r) =>
      r.title.toLowerCase().includes(q) ||
      r.subtitle.toLowerCase().includes(q)
    )
    // Group and limit
    return matched.slice(0, 12)
  }, [query, allResults])

  // Group results by type
  const grouped = useMemo(() => {
    const groups: Record<string, SearchResult[]> = {}
    results.forEach((r) => {
      const key = r.type === "page" ? "Pagini" : r.type === "entity" ? "Entități" : r.type === "project" ? "Proiecte" : "Oferte"
      if (!groups[key]) groups[key] = []
      groups[key]!.push(r)
    })
    return groups
  }, [results])

  // Flat list for keyboard nav
  const flatResults = useMemo(() => results, [results])

  const handleSelect = useCallback((result: SearchResult) => {
    // Save to recent
    setRecentSearches((prev) => {
      const updated = [query, ...prev.filter((s) => s !== query)].slice(0, 5)
      return updated
    })
    router.push(result.href)
    setOpen(false)
    setQuery("")
  }, [query, router])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex((i) => Math.min(i + 1, flatResults.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === "Enter" && flatResults[selectedIndex]) {
      e.preventDefault()
      handleSelect(flatResults[selectedIndex])
    }
  }

  if (!open) return null

  let globalIdx = -1

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[15vh]" onClick={() => { setOpen(false); setQuery("") }}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" />
      <div
        className="relative bg-surface rounded-2xl border border-border shadow-2xl w-full max-w-xl mx-4 animate-scale-in overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
          <Search size={18} className="text-muted-foreground flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0) }}
            onKeyDown={handleKeyDown}
            placeholder="Caută clienți, proiecte, oferte, pagini..."
            className="flex-1 text-sm bg-transparent text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
          />
          <kbd className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground bg-muted rounded border border-border">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto py-2">
          {/* Recent searches */}
          {!query && recentSearches.length > 0 && (
            <div className="px-3 pb-2">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1">Căutări recente</p>
              {recentSearches.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setQuery(s)}
                  className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                >
                  <Search size={11} /> {s}
                </button>
              ))}
            </div>
          )}

          {Object.entries(grouped).map(([group, items]) => (
            <div key={group}>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-1.5">{group}</p>
              {items.map((result) => {
                globalIdx++
                const idx = globalIdx
                const Icon = result.icon
                const bl = result.businessLine ? businessLines.find((b) => b.id === result.businessLine) : null
                return (
                  <button
                    key={`${result.type}-${result.title}-${idx}`}
                    onClick={() => handleSelect(result)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={cn(
                      "flex items-center gap-3 w-full px-4 py-2.5 text-left transition-colors",
                      selectedIndex === idx ? "bg-primary/5 text-foreground" : "text-foreground hover:bg-muted/50"
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                      selectedIndex === idx ? "bg-primary/10" : "bg-muted"
                    )}>
                      <Icon size={14} className={selectedIndex === idx ? "text-primary" : "text-muted-foreground"} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{result.title}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{result.subtitle}</p>
                    </div>
                    {bl && (
                      <span className="text-lg flex-shrink-0">{bl.icon}</span>
                    )}
                    {selectedIndex === idx && (
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground flex-shrink-0">
                        <CornerDownLeft size={10} /> Enter
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          ))}

          {query && flatResults.length === 0 && (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">Niciun rezultat pentru „{query}"</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 px-4 py-2.5 border-t border-border text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 bg-muted rounded text-[9px] font-mono border border-border">↑↓</kbd> Navigare</span>
          <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 bg-muted rounded text-[9px] font-mono border border-border">↵</kbd> Selectează</span>
          <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 bg-muted rounded text-[9px] font-mono border border-border">/</kbd> Deschide</span>
        </div>
      </div>
    </div>
  )
}

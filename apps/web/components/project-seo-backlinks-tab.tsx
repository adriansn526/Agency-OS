"use client"

import React, { useState, useEffect, useMemo } from "react"
import { Loader2, Link2, ArrowUpRight, ArrowDownRight, Activity, ChevronRight, ChevronDown, ArrowUpDown, ChevronLeft } from "lucide-react"

interface Props {
  domain: string;
  competitors?: string[];
  summary: any;
  backlinks: any[];
}

export function ProjectSeoBacklinksTab({ domain, competitors = [], summary: initialSummary, backlinks: initialBacklinks }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [detailError, setDetailError] = useState<string | null>(null)
  
  // Domain selection & dynamic fetching
  const [selectedDomain, setSelectedDomain] = useState<string>(domain)
  const [loadingDynamic, setLoadingDynamic] = useState(false)
  const [dynamicSummary, setDynamicSummary] = useState<any>(null)
  const [dynamicBacklinks, setDynamicBacklinks] = useState<any[]>([])

  const summary = selectedDomain === domain ? initialSummary : dynamicSummary
  const backlinks = selectedDomain === domain ? initialBacklinks : dynamicBacklinks

  useEffect(() => {
    if (selectedDomain === domain) return

    setLoadingDynamic(true)
    setError(null)
    setDetailError(null)

    fetch('/api/seo/dataforseo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'backlinks', domain: selectedDomain })
    })
    .then(res => res.json())
    .then(data => {
      if (data.error) throw new Error(data.error)
      setDynamicSummary(data.summary || null)
      setDynamicBacklinks(data.detail || [])
    })
    .catch(err => setError(err.message))
    .finally(() => setLoadingDynamic(false))
  }, [selectedDomain, domain])

  // Table State
  const [sortCol, setSortCol] = useState<"domain"|"links"|"rank"|"auth">("auth")
  const [sortDir, setSortDir] = useState<"asc"|"desc">("desc")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set())

  const groupedBacklinks = useMemo(() => {
    const groups = new Map<string, any>()
    for (const bl of backlinks) {
      if (!groups.has(bl.domain_from)) {
        groups.set(bl.domain_from, {
          domain: bl.domain_from,
          maxRank: bl.rank || 0,
          domainAuth: bl.domain_from_rank || 0,
          links: [],
          status: bl.page_to_status_code
        })
      }
      const group = groups.get(bl.domain_from)
      group.links.push(bl)
      if (bl.rank > group.maxRank) group.maxRank = bl.rank
    }
    
    const arr = Array.from(groups.values())
    
    arr.sort((a, b) => {
      let valA, valB
      if (sortCol === "domain") { valA = a.domain; valB = b.domain }
      else if (sortCol === "links") { valA = a.links.length; valB = b.links.length }
      else if (sortCol === "auth") { valA = a.domainAuth; valB = b.domainAuth }
      else { valA = a.maxRank; valB = b.maxRank }
      
      if (valA < valB) return sortDir === "asc" ? -1 : 1
      if (valA > valB) return sortDir === "asc" ? 1 : -1
      return 0
    })
    return arr
  }, [backlinks, sortCol, sortDir])

  const totalPages = Math.ceil(groupedBacklinks.length / itemsPerPage)
  const paginatedGroups = groupedBacklinks.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const toggleDomain = (dom: string) => {
    setExpandedDomains(prev => {
      const next = new Set(prev)
      if (next.has(dom)) next.delete(dom)
      else next.add(dom)
      return next
    })
  }

  const handleSort = (col: "domain"|"links"|"rank"|"auth") => {
    if (sortCol === col) {
      setSortDir(sortDir === "asc" ? "desc" : "asc")
    } else {
      setSortCol(col)
      setSortDir("desc")
    }
    setCurrentPage(1)
  }

  if (!domain) {
    return (
      <div className="p-8 text-center text-muted-foreground bg-surface border border-border rounded-xl">
        <Activity className="w-8 h-8 mx-auto mb-3 opacity-20" />
        <p>Acest proiect nu are configurat un domeniu pentru a rula analiza de Backlinks.</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500">
        <h3 className="font-semibold mb-1">Eroare DataForSEO</h3>
        <p className="text-sm">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Profil Backlink-uri</h2>
          <p className="text-sm text-muted-foreground">Analiză SEO Off-Page și comparare cu competitorii</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">Analizează:</label>
          <select 
            value={selectedDomain}
            onChange={(e) => setSelectedDomain(e.target.value)}
            disabled={loadingDynamic}
            className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 min-w-[250px]"
          >
            <option value={domain}>⭐ Propriul Domeniu ({domain})</option>
            {competitors.length > 0 && <optgroup label="Competitori (Din Surse Content)">
              {competitors.map(c => (
                <option key={c} value={c}>Competitor: {c}</option>
              ))}
            </optgroup>}
          </select>
          {loadingDynamic && <Loader2 className="animate-spin text-primary ml-2" size={20} />}
        </div>
      </div>

      {/* METRICS ROW */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-surface border border-border p-5 rounded-xl">
          <div className="text-sm text-muted-foreground mb-1 font-medium">Domain Trust (Rank)</div>
          <div className="text-3xl font-bold text-foreground">{summary?.rank || 0} <span className="text-xs text-muted-foreground font-normal">/1000</span></div>
        </div>
        <div className="bg-surface border border-border p-5 rounded-xl">
          <div className="text-sm text-muted-foreground mb-1 font-medium">Total Backlink-uri</div>
          <div className="text-3xl font-bold text-blue-500">{summary?.backlinks?.toLocaleString() || 0}</div>
        </div>
        <div className="bg-surface border border-border p-5 rounded-xl">
          <div className="text-sm text-muted-foreground mb-1 font-medium">Domenii Referente</div>
          <div className="text-3xl font-bold text-indigo-400">{summary?.referring_domains?.toLocaleString() || 0}</div>
        </div>
        <div className="bg-surface border border-border p-5 rounded-xl">
          <div className="text-sm text-muted-foreground mb-1 font-medium">Pagini Referente</div>
          <div className="text-3xl font-bold text-emerald-500">{summary?.referring_pages?.toLocaleString() || 0}</div>
        </div>
      </div>

      {/* BACKLINKS TABLE */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border bg-background/50 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Link2 size={16} className="text-primary" />
            Top Domenii Referente
          </h3>
          <div className="text-xs text-muted-foreground flex gap-4">
            <span className="flex items-center gap-1"><ArrowUpRight size={14} className="text-green-500" /> Dofollow</span>
            <span className="flex items-center gap-1"><ArrowDownRight size={14} className="text-red-400" /> Nofollow</span>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-background/30 text-muted-foreground border-b border-border">
                <th className="py-3 px-4 font-medium w-[5%] text-center">Nr.</th>
                <th className="py-3 px-4 font-medium cursor-pointer hover:text-foreground" onClick={() => handleSort("domain")}>
                  <div className="flex items-center gap-1">Domeniu / Pagini <ArrowUpDown size={12}/></div>
                </th>
                <th className="py-3 px-4 font-medium cursor-pointer hover:text-foreground text-center" onClick={() => handleSort("links")}>
                  <div className="flex items-center justify-center gap-1">Nr. Link-uri <ArrowUpDown size={12}/></div>
                </th>
                <th className="py-3 px-4 font-medium cursor-pointer hover:text-foreground text-center" onClick={() => handleSort("auth")}>
                  <div className="flex items-center justify-center gap-1">Domain Auth. <ArrowUpDown size={12}/></div>
                </th>
                <th className="py-3 px-4 font-medium cursor-pointer hover:text-foreground text-center" onClick={() => handleSort("rank")}>
                  <div className="flex items-center justify-center gap-1">Rank (Max) <ArrowUpDown size={12}/></div>
                </th>
              </tr>
            </thead>
            <tbody>
              {detailError ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-red-400 font-medium">
                    {detailError}
                  </td>
                </tr>
              ) : groupedBacklinks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted-foreground">
                    Nu au fost găsite backlink-uri externe.
                  </td>
                </tr>
              ) : (
                paginatedGroups.map((group, groupIdx) => {
                  const isExpanded = expandedDomains.has(group.domain)
                  const globalIdx = (currentPage - 1) * itemsPerPage + groupIdx + 1
                  
                  return (
                    <React.Fragment key={group.domain}>
                      {/* PARENT ROW */}
                      <tr 
                        className="border-b border-border/50 hover:bg-white/5 transition-colors cursor-pointer group"
                        onClick={() => toggleDomain(group.domain)}
                      >
                        <td className="py-3 px-4 text-center text-muted-foreground">{globalIdx}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <button className="p-1 hover:bg-white/10 rounded">
                              {isExpanded ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
                            </button>
                            <span className="font-semibold text-primary">{group.domain}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded text-xs font-medium">
                            {group.links.length}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={group.domainAuth > 500 ? "text-green-500 font-semibold" : group.domainAuth > 200 ? "text-yellow-500 font-semibold" : "text-muted-foreground font-semibold"}>
                            {group.domainAuth || 0}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={group.maxRank > 500 ? "text-green-500 font-semibold" : group.maxRank > 200 ? "text-yellow-500 font-semibold" : "text-muted-foreground font-semibold"}>
                            {group.maxRank || 0}
                          </span>
                        </td>
                      </tr>
                      
                      {/* CHILD ROWS */}
                      {isExpanded && group.links.map((bl: any, i: number) => {
                        const isDofollow = !bl.anchor?.toLowerCase().includes("nofollow")
                        return (
                          <tr key={`${group.domain}-${i}`} className="border-b border-border/20 bg-background/20 hover:bg-white/5">
                            <td className="py-2 px-4"></td>
                            <td className="py-2 px-4" colSpan={4}>
                              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 py-2 border-l-2 border-primary/30 pl-4 ml-4">
                                
                                <div className="col-span-2">
                                  <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                                    {isDofollow ? <ArrowUpRight size={12} className="text-success" /> : <ArrowDownRight size={12} className="text-warning" />}
                                    Sursă ({bl.page_to_status_code === 200 ? 'OK' : bl.page_to_status_code})
                                  </div>
                                  <a href={bl.url_from} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-400 hover:underline truncate block" title={bl.url_from}>
                                    {new URL(bl.url_from).pathname}
                                  </a>
                                </div>
                                
                                <div>
                                  <div className="text-xs text-muted-foreground mb-1">Text Ancoră</div>
                                  <div className="text-sm font-medium truncate" title={bl.anchor || 'N/A'}>{bl.anchor || 'N/A'}</div>
                                </div>
                                
                                <div>
                                  <div className="text-xs text-muted-foreground mb-1">Destinație</div>
                                  <div className="text-sm text-foreground truncate" title={bl.url_to}>
                                    {new URL(bl.url_to).pathname || '/'}
                                  </div>
                                </div>
                                
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </React.Fragment>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* PAGINATION */}
        {!detailError && groupedBacklinks.length > 0 && (
          <div className="p-4 border-t border-border flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Afișare {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, groupedBacklinks.length)} din {groupedBacklinks.length} domenii
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded bg-surface border border-border text-sm hover:bg-muted disabled:opacity-50 flex items-center gap-1"
              >
                <ChevronLeft size={14}/> Înapoi
              </button>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded bg-surface border border-border text-sm hover:bg-muted disabled:opacity-50 flex items-center gap-1"
              >
                Înainte <ChevronRight size={14}/>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

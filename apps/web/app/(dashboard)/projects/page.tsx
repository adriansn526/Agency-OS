"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import Link from "next/link"
import { cn, formatCurrency, formatDate } from "@/lib/utils"
import { useBusinessLine } from "@/components/business-line-context"
import { BusinessLineBadge } from "@/components/business-line-switcher"
import {
  FolderKanban,
  Clock,
  CalendarDays,
  Users,
  TrendingUp,
  Plus,
  Loader2,
  Search,
  ChevronDown,
} from "lucide-react"
import { NewProjectModal } from "@/components/entity-forms"

interface APIProject {
  id: string
  name: string
  status: string
  progress: number
  templateId: string
  startDate: string | null
  dueDate: string | null
  budget: number | null
  assignedTo: string | null
  metadata: any
  businessLine: { slug: string; name: string; icon?: string; color?: string }
  client: { id: string; companyName: string; contactPerson?: string }
}

const statusConfig: Record<string, { label: string; class: string; dot: string }> = {
  planificare: { label: "Planificare", class: "bg-info/10 text-info", dot: "bg-info" },
  in_lucru: { label: "În Lucru", class: "bg-primary/10 text-primary", dot: "bg-primary" },
  review: { label: "Review", class: "bg-warning/10 text-warning", dot: "bg-warning" },
  finalizat: { label: "Finalizat", class: "bg-success/10 text-success", dot: "bg-success" },
  suspendat: { label: "Suspendat", class: "bg-destructive/10 text-destructive", dot: "bg-destructive" },
}

const templateConfig: Record<string, { label: string; class: string }> = {
  seo_project: { label: "SEO", class: "bg-success/10 text-success" },
  seo_programmatic: { label: "SEO Programatic", class: "bg-accent/10 text-accent" },
  ads_campaign: { label: "Google Ads", class: "bg-warning/10 text-warning" },
  web_dev_project: { label: "Web Dev", class: "bg-primary/10 text-primary" },
  social_media: { label: "Social Media", class: "bg-pink-500/10 text-pink-500" },
  mentenanta: { label: "Mentenanță", class: "bg-muted text-muted-foreground" },
}

export default function ProiectePage() {
  const [showNewProject, setShowNewProject] = useState(false)
  const [projects, setProjects] = useState<APIProject[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [clientSearch, setClientSearch] = useState('')
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false)
  const clientDropdownRef = useRef<HTMLDivElement>(null)
  const [templateFilter, setTemplateFilter] = useState('all')
  const [clientFilter, setClientFilter] = useState('all')
  const [sortBy, setSortBy] = useState('updatedAt')
  const [sortOrder, setSortOrder] = useState('desc')
  const { activeLineId, isAll } = useBusinessLine()

  // Track unique clients for filter dropdown
  const [allClients, setAllClients] = useState<Array<{ id: string; name: string }>>([])

  const fetchProjects = (searchTerm?: string) => {
    setLoading(true)
    const params = new URLSearchParams({ limit: '100' })
    if (activeLineId && activeLineId !== 'all') {
      params.set('businessLine', activeLineId)
    }
    if (searchTerm) params.set('search', searchTerm)
    if (statusFilter !== 'all') params.set('status', statusFilter)
    if (templateFilter !== 'all') params.set('templateId', templateFilter)
    if (clientFilter !== 'all') params.set('clientId', clientFilter)
    params.set('sort', sortBy)
    params.set('order', sortOrder)
    fetch(`/api/projects?${params}`)
      .then(r => r.json())
      .then(j => {
        setProjects(j.data || [])
        // Extract unique clients
        const clients = (j.data || []).reduce((acc: Map<string, string>, p: APIProject) => {
          if (p.client?.id && p.client?.companyName) acc.set(p.client.id, p.client.companyName)
          return acc
        }, new Map<string, string>())
        setAllClients(Array.from(clients, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)))
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchProjects(search)
  }, [activeLineId, statusFilter, templateFilter, clientFilter, sortBy, sortOrder])

  // Close client dropdown on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(e.target as Node)) {
        setClientDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleProjectCreated = () => {
    setShowNewProject(false)
    fetchProjects(search)
  }

  const handleSearch = () => {
    fetchProjects(search)
  }

  return (
    <div className="p-4 md:p-6 space-y-4 animate-fade-in">
      <NewProjectModal open={showNewProject} onClose={() => setShowNewProject(false)} />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Proiecte</h1>
          <p className="text-sm text-muted-foreground">
            {projects.length} proiecte • {projects.filter((p) => p.status === "in_lucru").length} în lucru
          </p>
        </div>
        <button onClick={() => setShowNewProject(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors shadow-sm">
          <Plus size={16} />
          Proiect Nou
        </button>
      </div>

      {/* Search + Filters */}
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Caută proiect sau client..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-surface border border-border rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm bg-surface border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="all">Toate statusurile</option>
            <option value="planificare">Planificare</option>
            <option value="in_lucru">În Lucru</option>
            <option value="review">Review</option>
            <option value="finalizat">Finalizat</option>
            <option value="suspendat">Suspendat</option>
          </select>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={templateFilter}
            onChange={(e) => setTemplateFilter(e.target.value)}
            className="px-3 py-2 text-sm bg-surface border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="all">Toate tipurile</option>
            <option value="seo_project">SEO</option>
            <option value="seo_programmatic">SEO Programatic</option>
            <option value="ads_campaign">Google Ads</option>
            <option value="web_dev_project">Web Dev</option>
            <option value="social_media">Social Media</option>
            <option value="mentenanta">Mentenanță</option>
          </select>
          <div className="relative" ref={clientDropdownRef}>
            <button
              type="button"
              onClick={() => setClientDropdownOpen(!clientDropdownOpen)}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-surface border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 min-w-[160px] justify-between"
            >
              <span className="truncate">{clientFilter === 'all' ? 'Toți clienții' : allClients.find(c => c.id === clientFilter)?.name || 'Client'}</span>
              <ChevronDown size={14} className={cn("text-muted-foreground transition-transform", clientDropdownOpen && "rotate-180")} />
            </button>
            {clientDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-surface border border-border rounded-lg shadow-xl z-50 overflow-hidden">
                <div className="p-2 border-b border-border">
                  <input
                    type="text"
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    placeholder="Caută client..."
                    autoFocus
                    className="w-full px-2 py-1.5 text-sm bg-background border border-border rounded text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
                  />
                </div>
                <div className="max-h-48 overflow-y-auto">
                  <button
                    onClick={() => { setClientFilter('all'); setClientDropdownOpen(false); setClientSearch(''); }}
                    className={cn("w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors", clientFilter === 'all' && "bg-primary/10 text-primary font-medium")}
                  >
                    Toți clienții
                  </button>
                  {allClients
                    .filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase()))
                    .map(c => (
                      <button
                        key={c.id}
                        onClick={() => { setClientFilter(c.id); setClientDropdownOpen(false); setClientSearch(''); }}
                        className={cn("w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors", clientFilter === c.id && "bg-primary/10 text-primary font-medium")}
                      >
                        {c.name}
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>
          <select
            value={`${sortBy}:${sortOrder}`}
            onChange={(e) => {
              const parts = e.target.value.split(':')
              setSortBy(parts[0] || 'updatedAt')
              setSortOrder(parts[1] || 'desc')
            }}
            className="px-3 py-2 text-sm bg-surface border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="updatedAt:desc">Ultima actualizare ↓</option>
            <option value="updatedAt:asc">Ultima actualizare ↑</option>
            <option value="name:asc">Nume A→Z</option>
            <option value="name:desc">Nume Z→A</option>
            <option value="createdAt:desc">Cele mai noi</option>
            <option value="createdAt:asc">Cele mai vechi</option>
            <option value="progress:desc">Progres ↓</option>
            <option value="progress:asc">Progres ↑</option>
          </select>
          {(statusFilter !== 'all' || templateFilter !== 'all' || clientFilter !== 'all' || search) && (
            <button
              onClick={() => { setStatusFilter('all'); setTemplateFilter('all'); setClientFilter('all'); setSearch(''); fetchProjects(); }}
              className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground border border-border rounded-lg bg-surface hover:bg-muted transition-colors"
            >
              ✕ Resetează
            </button>
          )}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-primary" size={24} />
        </div>
      )}

      {/* Empty state */}
      {!loading && projects.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FolderKanban size={40} className="text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-foreground">Niciun proiect</p>
          <p className="text-xs text-muted-foreground mt-1">Creează primul proiect folosind butonul de mai sus.</p>
        </div>
      )}

      {/* Projects Grid */}
      {!loading && projects.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map((project) => {
            const sc = statusConfig[project.status]
            const tc = templateConfig[project.templateId] || { label: project.templateId, class: "bg-muted text-muted-foreground" }

            return (
              <Link
                href={`/projects/${project.id}`}
                key={project.id}
                className="bg-surface rounded-xl border border-border p-4 hover:border-primary/20 hover:shadow-md transition-all duration-200 cursor-pointer group block"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                      {project.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {project.client?.companyName || "—"}
                    </p>
                  </div>
                  <span className={cn("px-2 py-0.5 text-[10px] font-semibold rounded-full flex-shrink-0 ml-2", sc?.class)}>
                    {sc?.label || project.status}
                  </span>
                </div>

                {/* Type badge + BL badge */}
                <div className="flex items-center gap-1.5 mb-3">
                  <span className={cn("px-2 py-0.5 text-[10px] font-medium rounded-md", tc?.class)}>
                    {tc?.label}
                  </span>
                  {isAll && <BusinessLineBadge lineId={project.businessLine?.slug} />}
                </div>

                {/* Progress bar */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-muted-foreground">Progres</span>
                    <span className="text-[11px] font-semibold text-foreground">{project.progress}%</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        project.progress >= 80 ? "bg-success" : project.progress >= 50 ? "bg-primary" : "bg-info"
                      )}
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {project.budget && (
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <TrendingUp size={12} className="text-muted-foreground" />
                      <span className="text-foreground-secondary">{formatCurrency(project.budget)}</span>
                    </div>
                  )}
                  {project.metadata?.kpis && (
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <FolderKanban size={12} className="text-muted-foreground" />
                      <span className="text-foreground-secondary">{project.metadata.kpis.length} KPI-uri</span>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-border/50">
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <CalendarDays size={12} />
                    <span>{project.dueDate ? formatDate(project.dueDate) : project.startDate ? formatDate(project.startDate) : '—'}</span>
                  </div>
                  {project.assignedTo && (
                    <div className="flex items-center gap-1">
                      <Users size={12} className="text-muted-foreground" />
                      <div className="w-5 h-5 rounded-full bg-muted border border-surface flex items-center justify-center text-[8px] font-bold text-muted-foreground">
                        {project.assignedTo[0]?.toUpperCase()}
                      </div>
                    </div>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

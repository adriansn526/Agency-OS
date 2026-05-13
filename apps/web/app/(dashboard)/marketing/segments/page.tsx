"use client"

import { useState, useEffect } from "react"
import { useBusinessLine } from "@/components/business-line-context"
import { Filter, Plus, Users, Trash2, Edit, X, Search, Eye, ExternalLink } from "lucide-react"

const FILTER_FIELDS = [
  { value: "county", label: "Județ" },
  { value: "city", label: "Oraș" },
  { value: "industry", label: "Industrie" },
  { value: "status", label: "Status" },
  { value: "source", label: "Sursă" },
  { value: "activityDomain", label: "Domeniu activitate" },
  { value: "services", label: "Servicii" },
  { value: "revenue", label: "Cifra de afaceri" },
  { value: "employees", label: "Angajați" },
  { value: "foundedYear", label: "An înființare" },
  { value: "companyStatus", label: "Status firmă" },
  { value: "phone", label: "Telefon" },
  { value: "email", label: "Email" },
  { value: "website", label: "Website" },
  // ─── Custom Fields (BoltFood) ───
  { value: "cf.bolt_rating", label: "⭐ Rating Bolt" },
  { value: "cf.bolt_reviews", label: "📊 Nr. Review-uri Bolt" },
  { value: "cf.platform_dependency", label: "🔗 Dependență platformă" },
  { value: "cf.digital_presence", label: "🌐 Prezență digitală" },
  { value: "cf.bolt_sponsored", label: "💰 Bolt Sponsored" },
  { value: "cf.popularity_tier", label: "📈 Popularitate" },
  { value: "cf.interest_score", label: "🎯 Scor interes" },
  // ─── Campaign Suppression ───
  { value: "lastCampaignAt", label: "📩 Ultima campanie" },
  { value: "campaignCount", label: "📬 Nr. campanii trimise" },
]

const OPERATORS = [
  { value: "contains", label: "conține" },
  { value: "equals", label: "este egal cu" },
  { value: "not_equals", label: "nu este egal cu" },
  { value: "starts_with", label: "începe cu" },
  { value: "exists", label: "există" },
  { value: "not_exists", label: "nu există" },
  { value: "gt", label: "mai mare ca" },
  { value: "gte", label: "mai mare sau egal" },
  { value: "lt", label: "mai mic ca" },
  { value: "lte", label: "mai mic sau egal" },
]

interface FilterCondition {
  field: string
  operator: string
  value: any
}

interface Segment {
  id: string
  name: string
  description: string | null
  filters: FilterCondition[]
  contactCount: number
  _count: { campaigns: number }
  createdAt: string
}

export default function MarketingSegmentsPage() {
  const { activeLineId, activeLine } = useBusinessLine()
  const [segments, setSegments] = useState<Segment[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Form State
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [filters, setFilters] = useState<FilterCondition[]>([
    { field: "county", operator: "contains", value: "" },
  ])
  const [previewCount, setPreviewCount] = useState<number | null>(null)
  const [previewLeads, setPreviewLeads] = useState<any[]>([])
  const [showPreviewTable, setShowPreviewTable] = useState(false)
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadSegments()
  }, [activeLineId])

  const loadSegments = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/marketing/segments?businessLine=${activeLineId}`)
      const data = await res.json()
      setSegments(data.data || [])
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  const handlePreview = async () => {
    try {
      const validFilters = filters.filter(f => f.field && f.operator && (f.value !== undefined && f.value !== '' || f.operator === 'exists' || f.operator === 'not_exists'))
      const slug = activeLine?.id || activeLineId
      const res = await fetch('/api/marketing/segments/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessLineSlug: slug, filters: validFilters }),
      })
      const data = await res.json()
      setPreviewCount(data.count ?? 0)
      setPreviewLeads(data.leads || [])
      setShowPreviewTable(true)
    } catch (err) {
      console.error(err)
    }
  }

  const handleSave = async () => {
    if (!name) return alert('Numele segmentului este obligatoriu')
    if (!editingId && !activeLine?.id) return alert('Selectează o linie de business')
    setSaving(true)
    try {
      const validFilters = filters.filter(f => f.field && f.operator)
      const endpoint = editingId
        ? `/api/marketing/segments/${editingId}`
        : '/api/marketing/segments'
      const method = editingId ? 'PATCH' : 'POST'

      const slug = activeLine?.id || activeLineId

      const payload: any = {
        name,
        description: description || null,
        filters: validFilters,
        excludedLeadIds: Array.from(excludedIds),
      }
      // Only include businessLineSlug for new segments
      if (!editingId) payload.businessLineSlug = slug

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        console.error('[Save Segment] Error:', res.status, errData)
        alert(`Eroare la salvare: ${errData.error || res.statusText}`)
        setSaving(false)
        return
      }

      resetForm()
      loadSegments()
    } catch (err) {
      console.error(err)
      alert('Eroare la salvare. Verifică consola.')
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Sigur vrei să ștergi acest segment?")) return
    await fetch(`/api/marketing/segments/${id}`, { method: 'DELETE' })
    loadSegments()
  }

  const handleEdit = (seg: Segment) => {
    setEditingId(seg.id)
    setName(seg.name)
    setDescription(seg.description || "")
    setFilters(seg.filters.length > 0 ? seg.filters : [{ field: "county", operator: "contains", value: "" }])
    setExcludedIds(new Set((seg as any).excludedLeadIds || []))
    setShowCreate(true)
  }

  const resetForm = () => {
    setShowCreate(false)
    setEditingId(null)
    setName("")
    setDescription("")
    setFilters([{ field: "county", operator: "contains", value: "" }])
    setPreviewCount(null)
    setPreviewLeads([])
    setShowPreviewTable(false)
    setExcludedIds(new Set())
  }

  const addFilter = () => {
    setFilters(prev => [...prev, { field: "county", operator: "contains", value: "" }])
  }

  const removeFilter = (idx: number) => {
    setFilters(prev => prev.filter((_, i) => i !== idx))
  }

  const updateFilter = (idx: number, key: keyof FilterCondition, val: any) => {
    setFilters(prev => prev.map((f, i) => i === idx ? { ...f, [key]: val } : f))
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Filter className="w-6 h-6 text-primary" />
            Segmente
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Grupează lead-urile pe baza filtrelor pentru campanii targetate
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowCreate(true) }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" /> Segment Nou
        </button>
      </div>

      {/* Segment Builder Modal */}
      {showCreate && (
        <div className="bg-card border rounded-xl p-6 shadow-lg space-y-5 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">{editingId ? "Editare Segment" : "Segment Nou"}</h3>
            <button onClick={resetForm} className="p-1 rounded hover:bg-muted"><X className="w-5 h-5" /></button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Nume Segment</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ex: Instalatori Cluj-Napoca"
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Descriere (opțional)</label>
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Descriere scurtă..."
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          {/* Filter Builder */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-muted-foreground uppercase">Filtre</label>
            {filters.map((f, idx) => (
              <div key={idx} className="flex items-center gap-2">
                {idx > 0 && <span className="text-xs font-bold text-muted-foreground">ȘI</span>}
                <select
                  value={f.field}
                  onChange={e => updateFilter(idx, 'field', e.target.value)}
                  className="border rounded-lg px-2 py-2 text-sm bg-background"
                >
                  {FILTER_FIELDS.map(ff => (
                    <option key={ff.value} value={ff.value}>{ff.label}</option>
                  ))}
                </select>
                <select
                  value={f.operator}
                  onChange={e => updateFilter(idx, 'operator', e.target.value)}
                  className="border rounded-lg px-2 py-2 text-sm bg-background"
                >
                  {OPERATORS.map(op => (
                    <option key={op.value} value={op.value}>{op.label}</option>
                  ))}
                </select>
                {f.operator !== 'exists' && f.operator !== 'not_exists' && (
                  <input
                    type="text"
                    value={f.value}
                    onChange={e => updateFilter(idx, 'value', e.target.value)}
                    placeholder="Valoare..."
                    className="flex-1 border rounded-lg px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-primary/20"
                  />
                )}
                {filters.length > 1 && (
                  <button onClick={() => removeFilter(idx)} className="p-1.5 rounded hover:bg-red-50 text-red-500">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            <button onClick={addFilter} className="text-xs text-primary font-medium hover:underline">
              + Adaugă filtru
            </button>
          </div>

          {/* Preview + Actions */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-3">
              <button
                onClick={handlePreview}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
              >
                <Search className="w-4 h-4" /> Previzualizare
              </button>
              {previewCount !== null && (
                <span className="flex items-center gap-1 text-sm font-semibold">
                  <Users className="w-4 h-4 text-primary" />
                  {previewCount} contacte matching
                </span>
              )}
            </div>
            <button
              onClick={handleSave}
              disabled={saving || !name}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {saving ? "Se salvează..." : editingId ? "Actualizează" : "Salvează Segment"}
            </button>
          </div>

          {/* Preview Leads Table */}
          {showPreviewTable && previewLeads.length > 0 && (() => {
            // Detect duplicates by companyName
            const nameCount: Record<string, number> = {}
            previewLeads.forEach(l => { nameCount[l.companyName] = (nameCount[l.companyName] || 0) + 1 })
            const activeLeads = previewLeads.filter(l => !excludedIds.has(l.id))
            const duplicateNames = Object.entries(nameCount).filter(([_, c]) => c > 1).map(([n]) => n)
            
            return (
            <div className="mt-4 border rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b">
                <span className="text-sm font-semibold flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  Primele {previewLeads.length} din {previewCount} contacte
                  {excludedIds.size > 0 && (
                    <span className="text-xs font-normal text-red-400">
                      ({excludedIds.size} excluse → {(previewCount || 0) - excludedIds.size} active)
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-3">
                  {duplicateNames.length > 0 && (
                    <button
                      onClick={() => {
                        // Auto-exclude duplicates (keep first, exclude rest)
                        const seen = new Set<string>()
                        const newExcluded = new Set(excludedIds)
                        previewLeads.forEach(l => {
                          if (seen.has(l.companyName)) {
                            newExcluded.add(l.id)
                          } else {
                            seen.add(l.companyName)
                          }
                        })
                        setExcludedIds(newExcluded)
                      }}
                      className="text-xs px-2 py-1 rounded bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 transition-colors"
                    >
                      🔄 Deduplică ({duplicateNames.length} firme duplicate)
                    </button>
                  )}
                  {excludedIds.size > 0 && (
                    <button
                      onClick={() => setExcludedIds(new Set())}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Resetează excluderi
                    </button>
                  )}
                  <button
                    onClick={() => setShowPreviewTable(false)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Ascunde
                  </button>
                </div>
              </div>
              <div className="max-h-[400px] overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/30 sticky top-0">
                    <tr className="text-left text-xs font-semibold text-muted-foreground uppercase">
                      <th className="px-3 py-2 w-8">
                        <input
                          type="checkbox"
                          checked={excludedIds.size === 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setExcludedIds(new Set())
                            } else {
                              setExcludedIds(new Set(previewLeads.map(l => l.id)))
                            }
                          }}
                          className="rounded"
                          title="Selectează/deselectează toate"
                        />
                      </th>
                      <th className="px-3 py-2">#</th>
                      <th className="px-3 py-2">Firmă</th>
                      <th className="px-3 py-2">Locație</th>
                      <th className="px-3 py-2">Telefon</th>
                      <th className="px-3 py-2">⭐ Rating</th>
                      <th className="px-3 py-2">📊 Reviews</th>
                      <th className="px-3 py-2">🌐 Digital</th>
                      <th className="px-3 py-2">📩 Campanii</th>
                      <th className="px-3 py-2">Bolt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {previewLeads.map((lead: any, idx: number) => {
                      const isExcluded = excludedIds.has(lead.id)
                      const isDuplicate = (nameCount[lead.companyName] ?? 0) > 1
                      return (
                      <tr key={lead.id} className={`transition-colors ${
                        isExcluded ? 'opacity-40 bg-red-500/5 line-through' : 'hover:bg-muted/20'
                      } ${isDuplicate && !isExcluded ? 'bg-yellow-500/5' : ''}`}>
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={!isExcluded}
                            onChange={() => {
                              const next = new Set(excludedIds)
                              if (isExcluded) next.delete(lead.id)
                              else next.add(lead.id)
                              setExcludedIds(next)
                            }}
                            className="rounded"
                          />
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{idx + 1}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{lead.companyName}</span>
                            {isDuplicate && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-500 font-bold">DUP</span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">{lead.contactPerson}</div>
                        </td>
                        <td className="px-3 py-2 text-xs">
                          <div>{lead.city}</div>
                          <div className="text-muted-foreground truncate max-w-[200px]">{lead.address}</div>
                        </td>
                        <td className="px-3 py-2 font-mono text-xs">{lead.phone}</td>
                        <td className="px-3 py-2">
                          {lead.boltRating != null && (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                              lead.boltRating >= 4.5 ? 'bg-green-500/10 text-green-600' :
                              lead.boltRating >= 4.0 ? 'bg-yellow-500/10 text-yellow-600' :
                              'bg-red-500/10 text-red-500'
                            }`}>
                              ⭐ {lead.boltRating}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-xs">{lead.boltReviews ?? '-'}</td>
                        <td className="px-3 py-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            lead.digitalPresence === 'none' ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-600'
                          }`}>
                            {lead.digitalPresence === 'none' ? 'Fără site' : lead.digitalPresence}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          {lead.campaignCount > 0 ? (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400" title={lead.lastCampaignAt ? `Ultima: ${new Date(lead.lastCampaignAt).toLocaleDateString('ro-RO')}` : ''}>
                              {lead.campaignCount}x trimis
                            </span>
                          ) : (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-500">Nou</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {lead.boltUrl && (
                            <a href={lead.boltUrl} target="_blank" rel="noopener noreferrer"
                              className="text-primary hover:underline text-xs flex items-center gap-1">
                              <ExternalLink className="w-3 h-3" /> Bolt
                            </a>
                          )}
                        </td>
                      </tr>
                    )})
                    }
                  </tbody>
                </table>
              </div>
            </div>
          )})()}
        </div>
      )}

      {/* Segments List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          [...Array(6)].map((_, i) => (
            <div key={i} className="h-40 bg-muted animate-pulse rounded-xl" />
          ))
        ) : segments.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <Filter className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="font-medium">Niciun segment creat</p>
            <p className="text-sm">Creează primul tău segment pentru a targeta campanii</p>
          </div>
        ) : (
          segments.map(seg => (
            <div key={seg.id} className="bg-card border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow group">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-sm">{seg.name}</h3>
                  {seg.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{seg.description}</p>
                  )}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleEdit(seg)} className="p-1.5 rounded hover:bg-muted">
                    <Edit className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                  <button onClick={() => handleDelete(seg.id)} className="p-1.5 rounded hover:bg-red-50">
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Users className="w-4 h-4 text-primary" />
                  <strong>{seg.contactCount.toLocaleString()}</strong> contacte
                </span>
                <span className="text-muted-foreground text-xs">
                  {seg._count.campaigns} campanii
                </span>
              </div>

              {/* Filter pills */}
              <div className="flex flex-wrap gap-1 mt-3">
                {(seg.filters as FilterCondition[]).slice(0, 3).map((f, i) => (
                  <span key={i} className="px-2 py-0.5 bg-muted rounded text-[10px] font-medium">
                    {FILTER_FIELDS.find(ff => ff.value === f.field)?.label || f.field} {f.operator === 'exists' ? 'există' : f.operator === 'not_exists' ? 'nu există' : `${f.operator === 'contains' ? '~' : '='} ${f.value}`}
                  </span>
                ))}
                {(seg.filters as FilterCondition[]).length > 3 && (
                  <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-[10px] font-medium">
                    +{(seg.filters as FilterCondition[]).length - 3} mai multe
                  </span>
                )}
              </div>

              <div className="text-[10px] text-muted-foreground mt-3">
                Creat: {new Date(seg.createdAt).toLocaleDateString('ro-RO')}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

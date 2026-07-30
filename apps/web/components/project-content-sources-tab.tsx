"use client"

import React, { useState } from "react"
import { Globe, Plus, Link as LinkIcon, Trash2, Search, RefreshCw, ChevronDown, ChevronRight, Rss, FileText, Clock, Loader2, Pencil } from "lucide-react"
import { toast } from "sonner"

import { DraftAnalyzerModal } from './draft-analyzer-modal'

export interface DiscoveredArticle {
  id: string
  title: string
  url: string
  content?: string
  scrapedAt?: string
  status: 'pending' | 'scraped' | 'error'
}

export interface ContentSource {
  id: string
  name: string
  url: string
  category: string
  notes: string
  sourceLang: string
  targetLangs: string[]
  sourceType: 'article' | 'feed'
  cronSchedule?: 'manual' | 'daily' | 'weekly' | 'monthly'
  maxArticles?: number
  articles?: DiscoveredArticle[]
  lastCronScan?: string
  content?: string
  scrapedAt?: string
  status: 'pending' | 'scraped' | 'error'
}

const LANGUAGES = [
  { code: 'EN', label: '🇬🇧 English' },
  { code: 'RO', label: '🇷🇴 Română' },
  { code: 'DA', label: '🇩🇰 Dansk' },
  { code: 'DE', label: '🇩🇪 Deutsch' },
  { code: 'FR', label: '🇫🇷 Français' },
  { code: 'IT', label: '🇮🇹 Italiano' },
  { code: 'ES', label: '🇪🇸 Español' },
  { code: 'NL', label: '🇳🇱 Nederlands' },
  { code: 'PL', label: '🇵🇱 Polski' },
  { code: 'PT', label: '🇵🇹 Português' },
]

interface Props {
  projectId: string
  metadata: any
}

export function ProjectContentSourcesTab({ projectId, metadata }: Props) {
  const [sources, setSources] = useState<ContentSource[]>(metadata.contentSources || [])
  const [showAddForm, setShowAddForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [scrapingId, setScrapingId] = useState<string | null>(null)
  const [discoveringId, setDiscoveringId] = useState<string | null>(null)
  const [expandedFeed, setExpandedFeed] = useState<string | null>(null)
  const [analyzingSource, setAnalyzingSource] = useState<ContentSource | DiscoveredArticle | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    name: "",
    url: "",
    category: "",
    notes: "",
    sourceLang: "EN",
    targetLangs: [] as string[],
    sourceType: "article" as 'article' | 'feed',
    cronSchedule: "manual" as string,
    maxArticles: 10
  })

  const saveToApi = async (newSources: ContentSource[]) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metadata: { ...metadata, contentSources: newSources } })
      })
      if (res.ok) {
        setSources(newSources)
      } else {
        toast.error("Eroare la salvare.")
      }
    } catch (e) {
      toast.error("Eroare de rețea.")
    } finally {
      setSaving(false)
    }
  }

  const handleSaveForm = () => {
    if (!formData.name || !formData.url) {
      toast.error("Numele și URL-ul sunt obligatorii.")
      return
    }
    
    let newSources: ContentSource[];

    if (editingId) {
      // Edit existing source
      newSources = sources.map(s => {
        if (s.id === editingId) {
          return {
            ...s,
            name: formData.name,
            url: formData.url,
            category: formData.category,
            notes: formData.notes,
            sourceLang: formData.sourceLang,
            targetLangs: formData.targetLangs,
            sourceType: formData.sourceType,
            cronSchedule: formData.sourceType === 'feed' ? formData.cronSchedule as any : undefined,
            maxArticles: formData.sourceType === 'feed' ? formData.maxArticles : undefined,
            // Keep existing articles if feed
            articles: formData.sourceType === 'feed' ? (s.articles || []) : undefined,
          }
        }
        return s
      })
      toast.success("Sursă actualizată!")
    } else {
      // Add new source
      const newSource: ContentSource = {
        id: crypto.randomUUID(),
        name: formData.name,
        url: formData.url,
        category: formData.category,
        notes: formData.notes,
        sourceLang: formData.sourceLang,
        targetLangs: formData.targetLangs,
        sourceType: formData.sourceType,
        cronSchedule: formData.sourceType === 'feed' ? formData.cronSchedule as any : undefined,
        maxArticles: formData.sourceType === 'feed' ? formData.maxArticles : undefined,
        articles: formData.sourceType === 'feed' ? [] : undefined,
        status: 'pending'
      }
      newSources = [...sources, newSource]
      toast.success("Sursă adăugată!")
    }
    
    saveToApi(newSources)
    handleCancelForm()
  }

  const handleEditClick = (source: ContentSource) => {
    setFormData({
      name: source.name,
      url: source.url,
      category: source.category || "",
      notes: source.notes || "",
      sourceLang: source.sourceLang || "EN",
      targetLangs: source.targetLangs || [],
      sourceType: source.sourceType || "article",
      cronSchedule: source.cronSchedule || "manual",
      maxArticles: source.maxArticles || 10
    })
    setEditingId(source.id)
    setShowAddForm(true)
    // scroll to top smoothly
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleCancelForm = () => {
    setShowAddForm(false)
    setEditingId(null)
    setFormData({ name: "", url: "", category: "", notes: "", sourceLang: "EN", targetLangs: [], sourceType: "article", cronSchedule: "manual", maxArticles: 10 })
  }

  const handleDelete = (id: string) => {
    if (!confirm("Sigur vrei să ștergi această sursă?")) return
    const newSources = sources.filter(s => s.id !== id)
    saveToApi(newSources)
    toast.success("Sursă ștearsă.")
  }

  // Scrape a single article URL (for article-type sources or individual feed articles)
  const handleScrape = async (source: ContentSource) => {
    setScrapingId(source.id)
    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: source.url })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Eroare la scraping')
      
      const newSources = sources.map(s => {
        if (s.id === source.id) {
          return { ...s, content: data.content, status: 'scraped' as const, scrapedAt: new Date().toISOString() }
        }
        return s
      })
      await saveToApi(newSources)
      toast.success("Draft extras cu succes!")
    } catch (e: any) {
      toast.error(e.message || "Eroare la extragerea conținutului.")
      const newSources = sources.map(s => {
        if (s.id === source.id) return { ...s, status: 'error' as const }
        return s
      })
      saveToApi(newSources)
    } finally {
      setScrapingId(null)
    }
  }

  // Scrape a child article inside a feed source
  const handleScrapeArticle = async (feedId: string, articleId: string) => {
    setScrapingId(articleId)
    const feed = sources.find(s => s.id === feedId)
    const article = feed?.articles?.find(a => a.id === articleId)
    if (!article) return

    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: article.url })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Eroare la scraping')

      const newSources = sources.map(s => {
        if (s.id === feedId) {
          return {
            ...s,
            articles: s.articles?.map(a =>
              a.id === articleId
                ? { ...a, content: data.content, status: 'scraped' as const, scrapedAt: new Date().toISOString() }
                : a
            )
          }
        }
        return s
      })
      await saveToApi(newSources)
      toast.success("Articol extras!")
    } catch (e: any) {
      toast.error(e.message || "Eroare la scraping articol.")
    } finally {
      setScrapingId(null)
    }
  }

  // Discover articles from a feed URL
  const handleDiscover = async (source: ContentSource) => {
    setDiscoveringId(source.id)
    try {
      const res = await fetch('/api/scrape/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: source.url, maxArticles: source.maxArticles || 10 })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Eroare la descoperire')

      const existingUrls = new Set((source.articles || []).map(a => a.url))
      const newArticles: DiscoveredArticle[] = data.articles
        .filter((a: any) => !existingUrls.has(a.url))
        .map((a: any) => ({
          id: crypto.randomUUID(),
          title: a.title,
          url: a.url,
          status: 'pending' as const
        }))

      const newSources = sources.map(s => {
        if (s.id === source.id) {
          return {
            ...s,
            articles: [...(s.articles || []), ...newArticles],
            status: 'scraped' as const,
            lastCronScan: new Date().toISOString()
          }
        }
        return s
      })
      await saveToApi(newSources)
      setExpandedFeed(source.id)
      toast.success(`${newArticles.length} articole noi descoperite din ${data.totalFound} total!`)
    } catch (e: any) {
      toast.error(e.message || "Eroare la descoperirea articolelor.")
    } finally {
      setDiscoveringId(null)
    }
  }

  const cronLabels: Record<string, string> = {
    manual: 'Manual',
    daily: '🔄 Zilnic',
    weekly: '🔄 Săptămânal',
    monthly: '🔄 Lunar'
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Furnizori de Conținut (Surse)</h2>
          <p className="text-sm text-muted-foreground">Definește site-uri și articole concurente pentru a extrage și rafina conținut SEO de calitate.</p>
        </div>
        <button
          onClick={() => {
            if (showAddForm) {
              handleCancelForm()
            } else {
              setShowAddForm(true)
            }
          }}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium shadow-sm"
        >
          {showAddForm ? <Search size={16} /> : <Plus size={16} />}
          {showAddForm ? "Anulează" : "Adaugă Sursă"}
        </button>
      </div>

      {showAddForm && (
        <div className="bg-surface border border-border rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="font-medium text-foreground text-sm">{editingId ? "Editează Sursă" : "Adaugă Sursă Nouă"}</h3>
          
          {/* Source Type Selector */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, sourceType: 'article' })}
              className={`flex-1 flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                formData.sourceType === 'article'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-border/80 bg-background'
              }`}
            >
              <FileText size={20} className={formData.sourceType === 'article' ? 'text-primary' : 'text-muted-foreground'} />
              <div className="text-left">
                <p className={`text-sm font-medium ${formData.sourceType === 'article' ? 'text-primary' : 'text-foreground'}`}>📄 Articol Individual</p>
                <p className="text-[11px] text-muted-foreground">Un singur URL, scraping manual</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, sourceType: 'feed' })}
              className={`flex-1 flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                formData.sourceType === 'feed'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-border/80 bg-background'
              }`}
            >
              <Rss size={20} className={formData.sourceType === 'feed' ? 'text-primary' : 'text-muted-foreground'} />
              <div className="text-left">
                <p className={`text-sm font-medium ${formData.sourceType === 'feed' ? 'text-primary' : 'text-foreground'}`}>📡 Feed / Categorie</p>
                <p className="text-[11px] text-muted-foreground">Descoperă articole automat + cron opțional</p>
              </div>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Nume Sursă / Publicație</label>
              <input 
                type="text" 
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" 
                placeholder={formData.sourceType === 'feed' ? "ex: QIMA Blog" : "ex: QIMA - AQL Guide"}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                {formData.sourceType === 'feed' ? 'URL Feed / Categorie' : 'URL Articol'}
              </label>
              <input 
                type="url" 
                value={formData.url}
                onChange={e => setFormData({ ...formData, url: e.target.value })}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" 
                placeholder={formData.sourceType === 'feed' ? "ex: https://www.qima.com/blog" : "https://www.qima.com/blog/aql-guide"}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Categorie / Subiect</label>
              <input 
                type="text" 
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" 
                placeholder="ex: Tehnic & QC, Legislație, etc."
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Limba Sursă</label>
              <select
                value={formData.sourceLang}
                onChange={e => setFormData({ ...formData, sourceLang: e.target.value })}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                {LANGUAGES.map(l => (
                  <option key={l.code} value={l.code}>{l.label}</option>
                ))}
              </select>
            </div>

            {/* Feed-specific fields */}
            {formData.sourceType === 'feed' && (
              <>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Frecvență Scanare</label>
                  <select
                    value={formData.cronSchedule}
                    onChange={e => setFormData({ ...formData, cronSchedule: e.target.value })}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="manual">Manual (la cerere)</option>
                    <option value="daily">Zilnic</option>
                    <option value="weekly">Săptămânal</option>
                    <option value="monthly">Lunar</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Max Articole / Scanare</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={formData.maxArticles}
                    onChange={e => setFormData({ ...formData, maxArticles: parseInt(e.target.value) || 10 })}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </>
            )}

            <div className="md:col-span-2">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Limbi Țintă (pentru ce limbi vrei content)</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {LANGUAGES.map(l => {
                  const isSelected = formData.targetLangs.includes(l.code)
                  return (
                    <button
                      key={l.code}
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          targetLangs: isSelected
                            ? prev.targetLangs.filter(c => c !== l.code)
                            : [...prev.targetLangs, l.code]
                        }))
                      }}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                        isSelected
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background text-muted-foreground border-border hover:border-primary/50'
                      }`}
                    >
                      {l.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Note (Opțional)</label>
              <input 
                type="text" 
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" 
                placeholder="De ce este relevantă această sursă?"
              />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <button 
              onClick={handleSaveForm}
              disabled={saving}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium disabled:opacity-50"
            >
              {saving ? "Se salvează..." : "Salvează Sursa"}
            </button>
          </div>
        </div>
      )}

      {sources.length === 0 ? (
        <div className="bg-surface border border-dashed border-border/50 rounded-xl p-12 text-center">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Globe className="text-primary w-6 h-6" />
          </div>
          <h3 className="text-foreground font-medium mb-1">Nu există surse definite</h3>
          <p className="text-sm text-muted-foreground mb-4">Începe prin a adăuga publicații, bloguri concurente sau articole relevante pentru domeniul tău.</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors text-sm font-medium"
          >
            <Plus size={16} /> Adaugă Prima Sursă
          </button>
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-muted/30 border-b border-border">
                <tr>
                  <th className="py-3 px-4 font-medium text-muted-foreground">Sursă</th>
                  <th className="py-3 px-4 font-medium text-muted-foreground">Tip</th>
                  <th className="py-3 px-4 font-medium text-muted-foreground">Limbi</th>
                  <th className="py-3 px-4 font-medium text-muted-foreground">Status</th>
                  <th className="py-3 px-4 font-medium text-muted-foreground text-right">Acțiuni</th>
                </tr>
              </thead>
              <tbody>
                {sources.map((s) => (
                  <React.Fragment key={s.id}>
                    <tr className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            {s.sourceType === 'feed' && (
                              <button
                                onClick={() => setExpandedFeed(expandedFeed === s.id ? null : s.id)}
                                className="p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                              >
                                {expandedFeed === s.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                              </button>
                            )}
                            <span className="font-medium text-foreground">{s.name}</span>
                          </div>
                          <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1 mt-0.5 truncate max-w-[280px]">
                            <LinkIcon size={10} /> {s.url.replace(/^https?:\/\//, '')}
                          </a>
                          {s.category && (
                            <span className="mt-1 px-2 py-0.5 bg-muted text-muted-foreground text-[10px] rounded-md font-medium w-fit">
                              {s.category}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium w-fit ${
                            s.sourceType === 'feed' ? 'bg-blue-500/10 text-blue-500' : 'bg-muted text-muted-foreground'
                          }`}>
                            {s.sourceType === 'feed' ? <><Rss size={10} /> Feed</> : <><FileText size={10} /> Articol</>}
                          </span>
                          {s.sourceType === 'feed' && s.cronSchedule && s.cronSchedule !== 'manual' && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                              <Clock size={10} /> {cronLabels[s.cronSchedule]}
                            </span>
                          )}
                          {s.sourceType === 'feed' && (
                            <span className="text-[10px] text-muted-foreground">
                              {(s.articles || []).length} articole
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1">
                          {s.sourceLang && (
                            <span className="text-[10px] text-muted-foreground">Sursă: <span className="font-medium text-foreground">{s.sourceLang}</span></span>
                          )}
                          {s.targetLangs && s.targetLangs.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {s.targetLangs.map(lang => (
                                <span key={lang} className="px-1.5 py-0.5 bg-primary/10 text-primary text-[10px] rounded font-medium">
                                  {lang}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <div className={`w-2 h-2 rounded-full ${
                            s.sourceType === 'feed'
                              ? (s.articles?.length ? 'bg-success' : 'bg-warning')
                              : (s.status === 'scraped' ? 'bg-success' : s.status === 'error' ? 'bg-destructive' : 'bg-warning')
                          }`} />
                          <span className="text-xs font-medium text-foreground">
                            {s.sourceType === 'feed'
                              ? (s.articles?.length ? `${s.articles.filter(a => a.status === 'scraped').length}/${s.articles.length} extras` : 'Nescanat')
                              : (s.status === 'pending' ? 'În Așteptare' : s.status === 'scraped' ? 'Complet' : 'Eroare')
                            }
                          </span>
                          {s.scrapedAt && s.sourceType === 'article' && (
                            <span className="text-[10px] text-muted-foreground ml-1">
                              {new Date(s.scrapedAt).toLocaleDateString('ro-RO')}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          {/* Feed: Discover button */}
                          {s.sourceType === 'feed' && (
                            <button
                              onClick={() => handleDiscover(s)}
                              disabled={discoveringId === s.id}
                              className="px-2.5 py-1.5 bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 text-xs font-medium rounded-md transition-colors disabled:opacity-50 flex items-center gap-1"
                            >
                              {discoveringId === s.id ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
                              {discoveringId === s.id ? 'Scanare...' : 'Scanează'}
                            </button>
                          )}
                          {/* Article: Scrape + View Draft */}
                          {s.sourceType === 'article' && s.status === 'scraped' && (
                            <button
                              onClick={() => setAnalyzingSource(s)}
                              className="px-2.5 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 text-xs font-medium rounded-md transition-colors"
                            >
                              Vezi Draft
                            </button>
                          )}
                          {s.sourceType === 'article' && (
                            <button 
                              onClick={() => handleScrape(s)}
                              disabled={scrapingId === s.id}
                              className="p-1.5 text-primary hover:bg-primary/10 rounded-md transition-colors disabled:opacity-50"
                              title="Extrage Conținut"
                            >
                              <RefreshCw size={14} className={scrapingId === s.id ? "animate-spin" : ""} />
                            </button>
                          )}
                          <button 
                            onClick={() => handleEditClick(s)}
                            className="p-1.5 text-muted-foreground hover:bg-muted rounded-md transition-colors disabled:opacity-50"
                            disabled={scrapingId === s.id || discoveringId === s.id}
                            title="Editează sursă"
                          >
                            <Pencil size={14} />
                          </button>
                          <button 
                            onClick={() => handleDelete(s.id)}
                            className="p-1.5 text-destructive hover:bg-destructive/10 rounded-md transition-colors disabled:opacity-50"
                            disabled={scrapingId === s.id || discoveringId === s.id}
                            title="Șterge sursă"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded feed articles */}
                    {s.sourceType === 'feed' && expandedFeed === s.id && s.articles && s.articles.length > 0 && (
                      s.articles.map((article) => (
                        <tr key={article.id} className="bg-muted/10 border-b border-border/50 last:border-0">
                          <td className="py-2.5 px-4 pl-12">
                            <div className="flex flex-col">
                              <span className="text-xs font-medium text-foreground">{article.title}</span>
                              <a href={article.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary hover:underline flex items-center gap-1 mt-0.5 truncate max-w-[250px]">
                                <LinkIcon size={8} /> {article.url.replace(/^https?:\/\//, '')}
                              </a>
                            </div>
                          </td>
                          <td className="py-2.5 px-4">
                            <span className="text-[10px] text-muted-foreground">Sub-articol</span>
                          </td>
                          <td className="py-2.5 px-4"></td>
                          <td className="py-2.5 px-4">
                            <div className="flex items-center gap-1.5">
                              <div className={`w-1.5 h-1.5 rounded-full ${article.status === 'scraped' ? 'bg-success' : article.status === 'error' ? 'bg-destructive' : 'bg-warning'}`} />
                              <span className="text-[11px] text-muted-foreground">
                                {article.status === 'pending' ? 'Pending' : article.status === 'scraped' ? 'Extras' : 'Eroare'}
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5 px-4">
                            <div className="flex items-center justify-end gap-2">
                              {article.status === 'scraped' && (
                                <button
                                  onClick={() => setAnalyzingSource(article)}
                                  className="px-2 py-1 bg-primary/10 text-primary hover:bg-primary/20 text-[11px] font-medium rounded-md transition-colors"
                                >
                                  Draft
                                </button>
                              )}
                              <button
                                onClick={() => handleScrapeArticle(s.id, article.id)}
                                disabled={scrapingId === article.id}
                                className="p-1 text-primary hover:bg-primary/10 rounded-md transition-colors disabled:opacity-50"
                                title="Extrage articol"
                              >
                                <RefreshCw size={12} className={scrapingId === article.id ? "animate-spin" : ""} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}

                    {/* Expanded feed - no articles yet */}
                    {s.sourceType === 'feed' && expandedFeed === s.id && (!s.articles || s.articles.length === 0) && (
                      <tr className="bg-muted/10 border-b border-border/50">
                        <td colSpan={5} className="py-4 px-4 pl-12 text-center">
                          <p className="text-xs text-muted-foreground">Niciun articol descoperit încă. Apasă „Scanează" pentru a căuta articole.</p>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {analyzingSource && (
        <DraftAnalyzerModal 
          source={analyzingSource as any} 
          onClose={() => setAnalyzingSource(null)} 
        />
      )}
    </div>
  )
}

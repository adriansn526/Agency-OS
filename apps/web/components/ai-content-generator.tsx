"use client"

import { useState, useEffect, useRef } from "react"
import { Sparkles, Loader2, Copy, RefreshCw, ChevronDown, Check, FileText, Megaphone, MessageSquare, Linkedin, BookOpen } from "lucide-react"
import { cn } from "@/lib/utils"

type ContentType = 'seo_article'|'meta_description'|'ad_copy'|'social_caption'|'linkedin_post'|'blog_outline'

const CONTENT_TYPES: { value: ContentType; label: string; icon: React.ElementType; desc: string; templates: string[] }[] = [
  { value: 'seo_article', label: 'Articol SEO', icon: FileText, desc: 'Articol optimizat SEO cu H2/H3', templates: ['seo'] },
  { value: 'meta_description', label: 'Meta Description', icon: FileText, desc: '3 variante meta description', templates: ['seo'] },
  { value: 'ad_copy', label: 'Google Ads Copy', icon: Megaphone, desc: 'Headlines + descriptions', templates: ['ads'] },
  { value: 'social_caption', label: 'Social Caption', icon: MessageSquare, desc: 'Caption + hashtags', templates: ['social', 'instagram', 'facebook', 'tiktok'] },
  { value: 'linkedin_post', label: 'LinkedIn Post', icon: Linkedin, desc: 'Thought leadership post', templates: ['social', 'linkedin'] },
  { value: 'blog_outline', label: 'Blog Outline', icon: BookOpen, desc: 'Outline structurat articol', templates: ['seo', 'social'] },
]

const PLATFORMS = ['instagram','facebook','tiktok','twitter','linkedin']

interface Props {
  clientId: string
  templateId?: string
  brandDNA?: any
}

function getFilteredTypes(templateId?: string) {
  if (!templateId) return CONTENT_TYPES
  const tid = templateId.toLowerCase()
  // Determine category
  let category = 'all'
  if (tid.includes('seo')) category = 'seo'
  else if (tid.includes('ads') || tid.includes('campaign')) category = 'ads'
  else if (tid.includes('social') || tid.includes('instagram') || tid.includes('facebook') || tid.includes('tiktok')) category = 'social'
  else if (tid.includes('linkedin')) category = 'linkedin'

  if (category === 'all') return CONTENT_TYPES
  return CONTENT_TYPES.filter(ct => ct.templates.some(t => {
    if (category === 'ads') return t === 'ads'
    if (category === 'linkedin') return t === 'social' || t === 'linkedin'
    return t === category
  }))
}

export function AIContentGenerator({ clientId, templateId, brandDNA }: Props) {
  const filteredTypes = getFilteredTypes(templateId)
  const [type, setType] = useState<ContentType>(() => {
    if (templateId?.includes('seo')) return 'seo_article'
    if (templateId?.includes('ads') || templateId?.includes('campaign')) return 'ad_copy'
    if (templateId?.includes('social')||templateId?.includes('instagram')||templateId?.includes('facebook')||templateId?.includes('tiktok')) return 'social_caption'
    if (templateId?.includes('linkedin')) return 'linkedin_post'
    return filteredTypes[0]?.value || 'seo_article'
  })
  const [topic, setTopic] = useState('')
  const [platform, setPlatform] = useState('instagram')
  const [content, setContent] = useState('')
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string|null>(null)
  const [brand, setBrand] = useState<any>(brandDNA || null)
  const textRef = useRef<HTMLTextAreaElement>(null)

  // Load Brand DNA if not provided
  useEffect(() => {
    if (!brandDNA && clientId) {
      fetch(`/api/ai/brand-dna?clientId=${clientId}`)
        .then(r => r.json())
        .then(j => { if (j.data) setBrand(j.data) })
        .catch(() => {})
    }
  }, [clientId, brandDNA])

  const generate = async () => {
    if (!topic.trim()) return
    setGenerating(true); setError(null); setContent('')
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type, topic: topic.trim(), brand: brand || undefined,
          platform: type === 'social_caption' ? platform : undefined,
          language: 'ro',
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Generation failed')
      setContent(json.data.content)
    } catch(e) {
      setError(e instanceof Error ? e.message : 'Eroare la generare')
    } finally { setGenerating(false) }
  }

  const copyContent = () => {
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const selectedType = CONTENT_TYPES.find(t => t.value === type)!

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Sparkles size={16} className="text-primary"/>
        <h3 className="text-sm font-bold text-foreground">AI Content Generator</h3>
        {brand && (
          <span className="text-[9px] px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 font-medium">
            Brand DNA: {brand.name}
          </span>
        )}
      </div>

      {/* Controls */}
      <div className="bg-surface rounded-xl border border-border p-4 space-y-3">
        {/* Content Type */}
        <div>
          <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider mb-1 block">Tip Conținut</label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
            {filteredTypes.map(ct => {
              const Icon = ct.icon
              return (
                <button key={ct.value} onClick={() => setType(ct.value)}
                  className={cn("flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg border transition-all text-left",
                    type === ct.value ? "border-primary bg-primary/5 text-primary font-medium" : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
                  )}>
                  <Icon size={12}/> {ct.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Topic Input */}
        <div>
          <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider mb-1 block">
            {type === 'ad_copy' ? 'Produs / Serviciu' : type === 'social_caption' ? 'Subiect Postare' : 'Keyword / Topic'}
          </label>
          <input
            value={topic} onChange={e => setTopic(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !generating) generate() }}
            placeholder={type === 'seo_article' ? 'ex: servicii SEO pentru magazin online' : type === 'ad_copy' ? 'ex: servicii instalații climatizare' : 'ex: 5 sfaturi pentru optimizare web'}
            className="w-full px-3 py-2 text-sm bg-muted/50 border border-border rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {/* Platform selector (for social) */}
        {type === 'social_caption' && (
          <div>
            <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider mb-1 block">Platformă</label>
            <div className="flex gap-1.5">{PLATFORMS.map(p => (
              <button key={p} onClick={() => setPlatform(p)}
                className={cn("px-3 py-1.5 text-xs rounded-lg border capitalize transition-all",
                  platform === p ? "border-primary bg-primary/5 text-primary font-medium" : "border-border text-muted-foreground hover:text-foreground"
                )}>{p}</button>
            ))}</div>
          </div>
        )}

        {/* Brand DNA context indicator */}
        {brand && (
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"/>Brand DNA activ
            </span>
            <span>•</span>
            <span>Ton: <strong className="text-foreground">{brand.tone?.primary}</strong></span>
            <span>•</span>
            <span>Audiență: <strong className="text-foreground">{brand.audience?.primary}</strong></span>
            {brand.colors?.length > 0 && <>
              <span>•</span>
              <div className="flex gap-0.5">{brand.colors.slice(0,4).map((c: any, i: number) => (
                <div key={i} className="w-3 h-3 rounded-sm border border-border" style={{backgroundColor: c.hex}}/>
              ))}</div>
            </>}
          </div>
        )}

        {/* Generate Button */}
        <button onClick={generate} disabled={generating || !topic.trim()}
          className={cn("w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold rounded-lg transition-all",
            generating ? "bg-muted text-muted-foreground cursor-wait" :
            "bg-gradient-to-r from-violet-600 to-primary text-white hover:opacity-90 disabled:opacity-50"
          )}>
          {generating ? <><Loader2 size={14} className="animate-spin"/>Generare în curs...</> : <><Sparkles size={14}/>Generează {selectedType.label}</>}
        </button>
      </div>

      {/* Error */}
      {error && <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2 text-xs text-red-400">{error}</div>}

      {/* Output */}
      {content && (
        <div className="bg-surface rounded-xl border border-border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Sparkles size={12} className="text-primary"/> Rezultat — {selectedType.label}
            </h4>
            <div className="flex items-center gap-1.5">
              <button onClick={copyContent} className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-muted-foreground hover:text-foreground bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                {copied ? <><Check size={10} className="text-emerald-400"/>Copiat!</> : <><Copy size={10}/>Copiază</>}
              </button>
              <button onClick={generate} disabled={generating} className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-muted-foreground hover:text-primary bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                <RefreshCw size={10}/>Regenerează
              </button>
            </div>
          </div>
          <textarea ref={textRef} value={content} onChange={e => setContent(e.target.value)}
            className="w-full min-h-[300px] px-3 py-2 text-sm bg-muted/30 border border-border rounded-lg text-foreground font-mono leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <p className="text-[10px] text-muted-foreground text-right">{content.split(/\s+/).length} cuvinte • {content.length} caractere</p>
        </div>
      )}
    </div>
  )
}

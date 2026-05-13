"use client"

import { useState, useEffect, useCallback } from "react"
import { Dna, Loader2, RefreshCw, Palette, Type, Users, Target, Tag, Zap, AlertTriangle, Image as ImageIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface BrandDNAData {
  id: string; clientId: string; url: string; name: string; tagline?: string
  logoUrl?: string; favicon?: string; ogImage?: string
  logos: { url: string; alt: string }[]
  colors: { hex: string; name: string; usage: string; rgb: [number, number, number] }[]
  fonts: { family: string; usage: string; weight?: string }[]
  tone: { primary: string; secondary: string; description: string; formality: number; energy: number; warmth: number }
  audience: { primary: string; secondary: string; ageRange: string; interests: string[]; painPoints: string[] }
  industry?: string; category?: string; keywords: string[]; updatedAt: string
}

interface Props { clientId: string; clientWebsite?: string | null; clientWebsites?: string[]; compact?: boolean }

const STEPS = ["Launching browser","Crawling site","Extracting metadata","Extracting colors","Extracting fonts","Extracting logos","Extracting content","Analyzing tone","Complete"]

export function BrandDNACard({ clientId, clientWebsite, clientWebsites, compact }: Props) {
  const [data, setData] = useState<BrandDNAData | null>(null)
  const [loading, setLoading] = useState(true)
  const [crawling, setCrawling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState(0)

  const url = clientWebsites?.length ? (clientWebsites[0]!.startsWith("http") ? clientWebsites[0]! : `https://${clientWebsites[0]}`) : clientWebsite ? (clientWebsite.startsWith("http") ? clientWebsite : `https://${clientWebsite}`) : null

  const load = useCallback(async () => { setLoading(true); try { const r = await fetch(`/api/ai/brand-dna?clientId=${clientId}`); const j = await r.json(); setData(j.data||null) } catch { setError("Nu s-a putut încărca") } finally { setLoading(false) } }, [clientId])
  useEffect(() => { load() }, [load])

  const crawl = async () => {
    if (!url) return; setCrawling(true); setError(null); setStep(0)
    const iv = setInterval(() => setStep(p => Math.min(p+1, STEPS.length-2)), 3000)
    try {
      const r = await fetch("/api/ai/brand-dna", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ clientId, url }) })
      const j = await r.json(); if (!r.ok) throw new Error(j.error); setStep(STEPS.length-1); setData(j.data)
    } catch(e) { setError(e instanceof Error ? e.message : "Eroare") } finally { clearInterval(iv); setCrawling(false) }
  }

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="animate-spin text-primary" size={20}/><span className="ml-2 text-sm text-muted-foreground">Se încarcă Brand DNA...</span></div>

  if (crawling) return (
    <div className="bg-surface rounded-xl border border-primary/20 p-6 space-y-4">
      <div className="flex items-center gap-2"><Dna size={18} className="text-primary animate-pulse"/><h3 className="text-sm font-bold text-foreground">Analiză Brand în curs...</h3></div>
      <p className="text-xs text-muted-foreground">Se crawlează {url}</p>
      <div className="space-y-2">{STEPS.map((s, i) => (
        <div key={s} className="flex items-center gap-2">
          <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold", i<step?"bg-emerald-500 text-white":i===step?"bg-primary text-white animate-pulse":"bg-muted text-muted-foreground")}>{i<step?"✓":i+1}</div>
          <span className={cn("text-xs", i<=step?"text-foreground":"text-muted-foreground")}>{s}</span>
        </div>
      ))}</div>
    </div>
  )

  if (!data) return (
    <div className="bg-surface rounded-xl border border-dashed border-border p-8 text-center space-y-3">
      <Dna size={32} className="text-muted-foreground/30 mx-auto"/>
      <h3 className="text-sm font-semibold text-foreground">Brand DNA</h3>
      <p className="text-xs text-muted-foreground max-w-sm mx-auto">Analizează automat identitatea vizuală, tonul comunicării și audiența brand-ului.</p>
      {error && <p className="text-xs text-red-400 flex items-center justify-center gap-1"><AlertTriangle size={12}/>{error}</p>}
      {url ? <button onClick={crawl} className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-gradient-to-r from-violet-600 to-primary text-white rounded-lg hover:opacity-90 transition-all"><Dna size={14}/>Analizează Brand</button>
       : <p className="text-xs text-amber-400">Adaugă un website la client pentru a analiza brand-ul.</p>}
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {data.logoUrl && <img src={data.logoUrl} alt={data.name} className="w-8 h-8 rounded-lg object-contain bg-white/5 border border-border"/>}
          <div><h3 className="text-sm font-bold text-foreground">{data.name}</h3>{data.tagline && <p className="text-[10px] text-muted-foreground truncate max-w-[300px]">{data.tagline}</p>}</div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-muted-foreground">Actualizat: {new Date(data.updatedAt).toLocaleDateString("ro-RO")}</span>
          <button onClick={crawl} disabled={crawling} className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-muted-foreground hover:text-primary bg-muted/50 rounded-lg hover:bg-muted transition-colors"><RefreshCw size={10}/>Re-analizează</button>
        </div>
      </div>
      {error && <p className="text-xs text-red-400 flex items-center gap-1"><AlertTriangle size={12}/>{error}</p>}

      <div className={cn("grid gap-4", compact ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-2")}>
        {/* Colors */}
        <div className="bg-surface rounded-xl border border-border p-4">
          <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-3"><Palette size={13} className="text-violet-400"/>Paletă Culori</h4>
          <div className="flex gap-2 flex-wrap">{data.colors.map((c,i) => (
            <div key={i} className="text-center"><div className="w-10 h-10 rounded-lg border border-border shadow-sm" style={{backgroundColor:c.hex}} title={`${c.name} — ${c.usage}`}/><span className="text-[9px] text-muted-foreground block mt-1">{c.hex}</span><span className="text-[8px] text-muted-foreground/70 capitalize">{c.usage}</span></div>
          ))}{data.colors.length===0 && <span className="text-xs text-muted-foreground">Nicio culoare detectată</span>}</div>
        </div>

        {/* Fonts */}
        <div className="bg-surface rounded-xl border border-border p-4">
          <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-3"><Type size={13} className="text-blue-400"/>Fonturi</h4>
          <div className="space-y-2">{data.fonts.map((f,i) => (
            <div key={i} className="flex items-center justify-between"><span className="text-sm text-foreground" style={{fontFamily:f.family}}>{f.family}</span><span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground capitalize">{f.usage}</span></div>
          ))}{data.fonts.length===0 && <span className="text-xs text-muted-foreground">Niciun font custom</span>}</div>
        </div>

        {/* Tone */}
        <div className="bg-surface rounded-xl border border-border p-4">
          <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-3"><Zap size={13} className="text-amber-400"/>Ton & Voce</h4>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400">{data.tone.primary}</span>
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400">{data.tone.secondary}</span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">{data.tone.description}</p>
          <div className="space-y-2">{[{label:"Formalitate",value:data.tone.formality,color:"bg-violet-500"},{label:"Energie",value:data.tone.energy,color:"bg-amber-500"},{label:"Căldură",value:data.tone.warmth,color:"bg-rose-500"}].map(m=>(
            <div key={m.label} className="flex items-center gap-2"><span className="text-[10px] text-muted-foreground w-16">{m.label}</span><div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden"><div className={cn("h-full rounded-full",m.color)} style={{width:`${m.value}%`}}/></div><span className="text-[10px] font-mono text-muted-foreground w-7 text-right">{m.value}</span></div>
          ))}</div>
        </div>

        {/* Audience */}
        <div className="bg-surface rounded-xl border border-border p-4">
          <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-3"><Users size={13} className="text-emerald-400"/>Audiență</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between"><span className="text-[10px] text-muted-foreground">Primară</span><span className="text-xs font-medium text-foreground">{data.audience.primary}</span></div>
            <div className="flex items-center justify-between"><span className="text-[10px] text-muted-foreground">Secundară</span><span className="text-xs font-medium text-foreground">{data.audience.secondary}</span></div>
            <div className="flex items-center justify-between"><span className="text-[10px] text-muted-foreground">Vârstă</span><span className="text-xs font-medium text-foreground">{data.audience.ageRange}</span></div>
            {data.audience.interests?.length>0 && <div><span className="text-[10px] text-muted-foreground block mb-1">Interese</span><div className="flex flex-wrap gap-1">{data.audience.interests.map((x,i)=><span key={i} className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">{x}</span>)}</div></div>}
            {data.audience.painPoints?.length>0 && <div><span className="text-[10px] text-muted-foreground block mb-1">Pain Points</span><div className="flex flex-wrap gap-1">{data.audience.painPoints.map((x,i)=><span key={i} className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-400">{x}</span>)}</div></div>}
          </div>
        </div>

        {/* Industry & Keywords */}
        <div className="bg-surface rounded-xl border border-border p-4 lg:col-span-2">
          <div className="grid grid-cols-2 gap-4">
            <div><h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-2"><Target size={13} className="text-cyan-400"/>Industrie</h4><p className="text-sm font-medium text-foreground">{data.industry||"—"}</p><p className="text-xs text-muted-foreground">{data.category||"—"}</p></div>
            <div><h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-2"><Tag size={13} className="text-primary"/>Keywords</h4><div className="flex flex-wrap gap-1">{data.keywords.map((k,i)=><span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{k}</span>)}</div></div>
          </div>
        </div>

        {/* Visual Assets */}
        {(data.ogImage||data.logos?.length>0) && (
          <div className="bg-surface rounded-xl border border-border p-4 lg:col-span-2">
            <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-3"><ImageIcon size={13} className="text-pink-400"/>Assets Vizuale</h4>
            <div className="flex gap-3 flex-wrap">
              {data.ogImage && <div className="space-y-1"><img src={data.ogImage} alt="OG" className="h-20 rounded-lg border border-border object-cover"/><span className="text-[9px] text-muted-foreground">OG Image</span></div>}
              {data.logos?.slice(0,3).map((l,i)=><div key={i} className="space-y-1"><img src={l.url} alt={l.alt} className="h-20 rounded-lg border border-border object-contain bg-white/5 p-1"/><span className="text-[9px] text-muted-foreground">{l.alt}</span></div>)}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

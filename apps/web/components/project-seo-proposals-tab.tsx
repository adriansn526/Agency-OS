"use client"

import React, { useCallback, useEffect, useMemo, useState } from "react"
import { Loader2, Plus, Sparkles, Trash2, ChevronDown, ChevronRight, MousePointerClick } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { EST_CTR, PROPOSAL_STATUSES, type ProposalStatus } from "@/lib/seo/proposals"

interface Term { term: string; volume: number }
interface Row { id: string; mainTerm: string; mainVolume: number; longTails: Term[]; status: ProposalStatus; source: string; note?: string; claimedBy?: string; articleUrl?: string; volume: number; clicks: number }
interface Suggestion { mainTerm: string; mainVolume: number; longTails: Term[]; competitors: string[] }

const STATUS_LABEL: Record<ProposalStatus, string> = { propus: 'Propus', in_lucru: 'În lucru', publicat: 'Publicat', respins: 'Respins' }
const STATUS_CLASS: Record<ProposalStatus, string> = {
  propus: 'bg-blue-500/10 text-blue-400', in_lucru: 'bg-amber-500/10 text-amber-400', publicat: 'bg-green-500/10 text-green-400', respins: 'bg-muted text-muted-foreground',
}
const nf = (n: number) => n.toLocaleString('ro-RO')

/** "term; volum" per line → terms */
function parseTerms(text: string): Term[] {
  return text.split('\n').map(l => l.trim()).filter(Boolean).map(l => {
    const m = l.match(/^(.*?)[;|\t,]\s*(\d[\d.]*)\s*$/)
    return m ? { term: m[1]!.trim(), volume: Number(m[2]!.replace(/\./g, '')) } : { term: l, volume: 0 }
  })
}

export function ProjectSeoProposalsTab({ projectId, defaultCompetitors = [] }: { projectId: string; defaultCompetitors?: string[] }) {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState<'toate' | ProposalStatus>('toate')
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState({ mainTerm: '', mainVolume: '', longTails: '' })
  const [comp, setComp] = useState(defaultCompetitors.join(', '))
  const [covered, setCovered] = useState('')
  const [suggesting, setSuggesting] = useState(false)
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null)
  const [picked, setPicked] = useState<Set<number>>(new Set())

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch(`/api/seo/proposals?projectId=${projectId}`)
      const j = await r.json()
      if (!r.ok) throw new Error(j.error)
      setRows(j.data)
    } catch (e: any) { toast.error(e.message || 'Nu am putut încărca propunerile') } finally { setLoading(false) }
  }, [projectId])
  useEffect(() => { load() }, [load])

  const call = async (method: string, body?: any, qs = '') => {
    const r = await fetch(`/api/seo/proposals${qs}`, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify({ projectId, ...body }) : undefined })
    const j = await r.json()
    if (!r.ok) throw new Error(j.error || 'Eroare')
    return j.data
  }

  const shown = useMemo(() => rows.filter(r => filter === 'toate' ? r.status !== 'respins' : r.status === filter), [rows, filter])
  const sum = useMemo(() => shown.reduce((a, r) => ({ volume: a.volume + r.volume, clicks: a.clicks + r.clicks }), { volume: 0, clicks: 0 }), [shown])

  const add = async () => {
    try {
      await call('POST', { proposal: { mainTerm: draft.mainTerm, mainVolume: Number(draft.mainVolume) || 0, longTails: parseTerms(draft.longTails) } })
      setDraft({ mainTerm: '', mainVolume: '', longTails: '' }); setAdding(false); await load(); toast.success('Propunere adăugată')
    } catch (e: any) { toast.error(e.message) }
  }
  const setStatus = async (id: string, status: ProposalStatus) => {
    try { await call('PATCH', { id, status }); await load() } catch (e: any) { toast.error(e.message) }
  }
  const remove = async (id: string) => {
    if (!confirm('Ștergi propunerea?')) return
    try { await call('DELETE', undefined, `?projectId=${projectId}&id=${id}`); await load() } catch (e: any) { toast.error(e.message) }
  }
  const suggest = async () => {
    setSuggesting(true); setSuggestions(null)
    try {
      const r = await fetch('/api/seo/proposals/suggest', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, competitors: comp.split(/[\s,;]+/).filter(Boolean), covered: covered.split('\n').map(s => s.trim()).filter(Boolean) }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error)
      setSuggestions(j.data); setPicked(new Set(j.data.map((_: any, i: number) => i)))
      toast.success(`${j.data.length} articole candidate din ${j.meta.keywordsScanned} cuvinte-cheie`)
    } catch (e: any) { toast.error(e.message || 'Analiza a eșuat') } finally { setSuggesting(false) }
  }
  const addPicked = async () => {
    try {
      const proposals = suggestions!.filter((_, i) => picked.has(i)).map(s => ({ mainTerm: s.mainTerm, mainVolume: s.mainVolume, longTails: s.longTails, source: 'gap' }))
      const out = await call('POST', { proposals })
      setSuggestions(null); await load(); toast.success(`${out.added} adăugate${out.skipped ? `, ${out.skipped} existau deja` : ''}`)
    } catch (e: any) { toast.error(e.message) }
  }

  const toggle = (id: string) => setOpen(o => { const n = new Set(o); n.has(id) ? n.delete(id) : n.add(id); return n })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Articole propuse</h2>
          <p className="text-sm text-muted-foreground">Termen principal + long tail cu volumul de căutări lunare. Clicurile sunt estimate la {Math.round(EST_CTR * 100)}% din volum (poziții 3–5). Avocatul le vede în contul zoana-partners.com.</p>
        </div>
        <button onClick={() => setAdding(a => !a)} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"><Plus className="h-4 w-4" />Adaugă manual</button>
      </div>

      <div className="rounded-xl border border-border p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold"><Sparkles className="h-4 w-4 text-primary" />Sugerează din analiza concurenței</div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-xs text-muted-foreground">Concurenți (domenii, separate prin virgulă)
            <input value={comp} onChange={e => setComp(e.target.value)} placeholder="avocatura.com, avocatnet.ro" className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground" />
          </label>
          <label className="text-xs text-muted-foreground">Termeni deja acoperiți (opțional, câte unul pe linie)
            <textarea value={covered} onChange={e => setCovered(e.target.value)} rows={2} placeholder="furt&#10;art 208 hartuirea" className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground" />
          </label>
        </div>
        <button onClick={suggest} disabled={suggesting || !comp.trim()} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium disabled:opacity-50">
          {suggesting && <Loader2 className="h-4 w-4 animate-spin" />}Rulează analiza (DataForSEO)
        </button>
        {suggestions && (
          <div className="space-y-2">
            {suggestions.length === 0 ? <p className="text-sm text-muted-foreground">Nimic nou față de ce există deja.</p> : (
              <>
                <div className="max-h-80 overflow-auto rounded-lg border border-border divide-y divide-border">
                  {suggestions.map((s, i) => (
                    <label key={i} className="flex cursor-pointer items-start gap-3 p-2.5 text-sm">
                      <input type="checkbox" className="mt-1" checked={picked.has(i)} onChange={() => setPicked(p => { const n = new Set(p); n.has(i) ? n.delete(i) : n.add(i); return n })} />
                      <span className="flex-1"><b>{s.mainTerm}</b> <span className="text-muted-foreground">({nf(s.mainVolume)})</span>
                        {s.longTails.length > 0 && <span className="block text-xs text-muted-foreground">{s.longTails.map(t => `${t.term} (${nf(t.volume)})`).join(' · ')}</span>}
                      </span>
                      <span className="text-xs text-muted-foreground">{s.competitors.join(', ')}</span>
                    </label>
                  ))}
                </div>
                <button onClick={addPicked} disabled={!picked.size} className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">Adaugă {picked.size} selectate</button>
              </>
            )}
          </div>
        )}
      </div>

      {adding && (
        <div className="rounded-xl border border-border p-4 space-y-3">
          <div className="grid gap-3 md:grid-cols-[1fr_140px]">
            <input value={draft.mainTerm} onChange={e => setDraft({ ...draft, mainTerm: e.target.value })} placeholder="Termen principal" className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
            <input value={draft.mainVolume} onChange={e => setDraft({ ...draft, mainVolume: e.target.value })} inputMode="numeric" placeholder="Volum lunar" className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          </div>
          <textarea value={draft.longTails} onChange={e => setDraft({ ...draft, longTails: e.target.value })} rows={4} placeholder={"Long tail, câte unul pe linie: termen; volum\nuz de fals; 480"} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          <button onClick={add} disabled={!draft.mainTerm.trim()} className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">Salvează</button>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {(['toate', ...PROPOSAL_STATUSES] as const).map(s => (
          <button key={s} onClick={() => setFilter(s)} className={cn('rounded-full border px-3 py-1 text-xs', filter === s ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-muted-foreground')}>
            {s === 'toate' ? 'Active' : STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
              <tr><th className="p-3">Termen principal</th><th className="p-3 text-right">Volum</th><th className="p-3 text-right">Long tail</th><th className="p-3 text-right">Total volum</th><th className="p-3 text-right"><MousePointerClick className="mr-1 inline h-3 w-3" />Clicuri est./lună</th><th className="p-3">Status</th><th className="p-3" /></tr>
            </thead>
            <tbody>
              {shown.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Nicio propunere.</td></tr>}
              {shown.map(r => (
                <React.Fragment key={r.id}>
                  <tr className="border-t border-border align-top">
                    <td className="p-3"><button onClick={() => toggle(r.id)} className="flex items-center gap-1 text-left font-medium">{open.has(r.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}{r.mainTerm}</button>
                      {r.claimedBy && <div className="ml-5 text-xs text-muted-foreground">preluat de {r.claimedBy}</div>}</td>
                    <td className="p-3 text-right tabular-nums">{nf(r.mainVolume)}</td>
                    <td className="p-3 text-right tabular-nums">{r.longTails.length}</td>
                    <td className="p-3 text-right font-semibold tabular-nums">{nf(r.volume)}</td>
                    <td className="p-3 text-right tabular-nums">{nf(r.clicks)}</td>
                    <td className="p-3">
                      <select value={r.status} onChange={e => setStatus(r.id, e.target.value as ProposalStatus)} className={cn('rounded-md border-0 px-2 py-1 text-xs', STATUS_CLASS[r.status])}>
                        {PROPOSAL_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                      </select>
                    </td>
                    <td className="p-3"><button onClick={() => remove(r.id)} aria-label="Șterge" className="text-muted-foreground hover:text-red-400"><Trash2 className="h-4 w-4" /></button></td>
                  </tr>
                  {open.has(r.id) && (
                    <tr className="bg-muted/20"><td colSpan={7} className="px-8 py-3">
                      {r.longTails.length === 0 ? <span className="text-muted-foreground">Fără long tail.</span> : (
                        <ul className="grid gap-x-8 gap-y-1 sm:grid-cols-2">
                          {r.longTails.map(t => <li key={t.term} className="flex justify-between gap-4"><span>{t.term}</span><span className="tabular-nums text-muted-foreground">{nf(t.volume)}</span></li>)}
                        </ul>
                      )}
                    </td></tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-border bg-muted/40 font-semibold">
              <tr><td className="p-3">Total ({shown.length} articole)</td><td /><td /><td className="p-3 text-right tabular-nums">{nf(sum.volume)}</td><td className="p-3 text-right tabular-nums">{nf(sum.clicks)}</td><td colSpan={2} /></tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}

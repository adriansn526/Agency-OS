"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Check, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert } from "@/components/ui/alert"

export interface TranslationRow { id: string; sourceText: string; text: string; source: string; reviewed: boolean; products: number }

const input = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"

export function TranslationsTable({ rows: initial }: { rows: TranslationRow[] }) {
  const router = useRouter()
  const [rows, setRows] = useState(initial)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [bulk, setBulk] = useState(false)

  async function save(r: TranslationRow, approve: boolean) {
    const text = (drafts[r.id] ?? r.text).trim()
    if (text.length < 2 || text.length > 300) { setError("Traducerea trebuie să aibă între 2 și 300 de caractere."); return }
    setBusy(r.id); setError(null)
    try {
      const res = await fetch(`/api/commerce/translations/${r.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...(text !== r.text ? { text } : {}), reviewed: approve || text !== r.text }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error ?? `Eroare ${res.status}`)
      const t = j.translation as { text: string; source: string; reviewed: boolean }
      setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, text: t.text, source: t.source, reviewed: t.reviewed } : x)))
      setDrafts((d) => { const { [r.id]: _, ...rest } = d; return rest })
    } catch (e) { setError(e instanceof Error ? e.message : "Eroare la salvare") }
    finally { setBusy(null) }
  }

  async function approveAll() {
    const ids = rows.filter((r) => !r.reviewed && (drafts[r.id] ?? r.text) === r.text).map((r) => r.id)
    if (!ids.length) return
    setBulk(true); setError(null)
    try {
      const res = await fetch("/api/commerce/translations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids, reviewed: true }) })
      if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? `Eroare ${res.status}`)
      setRows((rs) => rs.map((x) => (ids.includes(x.id) ? { ...x, reviewed: true } : x)))
      router.refresh()
    } catch (e) { setError(e instanceof Error ? e.message : "Eroare la aprobare") }
    finally { setBulk(false) }
  }

  const pending = rows.filter((r) => !r.reviewed).length
  return (
    <div>
      {error && <Alert variant="destructive" className="m-3">{error}</Alert>}
      <div className="flex items-center justify-between border-b p-3 text-sm">
        <span className="text-muted-foreground">{rows.length} pe această pagină, {pending} neaprobate</span>
        <Button size="sm" variant="outline" disabled={bulk || pending === 0} onClick={approveAll}>
          {bulk ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}Aprobă tot ce e needitat de pe pagină
        </Button>
      </div>
      <table className="w-full text-sm">
        <thead><tr className="border-b text-left text-muted-foreground"><th className="p-3 w-[34%]">Engleză</th><th className="p-3">Română</th><th className="p-3 w-16">Produse</th><th className="p-3 w-48"></th></tr></thead>
        <tbody>
          {rows.map((r) => {
            const draft = drafts[r.id] ?? r.text
            const dirty = draft.trim() !== r.text
            return (
              <tr key={r.id} className="border-b last:border-0 align-top hover:bg-muted/40">
                <td className="p-3 font-mono text-xs leading-5">{r.sourceText}</td>
                <td className="p-3">
                  <input className={input} value={draft} maxLength={300} onChange={(e) => setDrafts((d) => ({ ...d, [r.id]: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === "Enter" && !busy) save(r, true) }} />
                </td>
                <td className="p-3 tabular-nums">{r.products}</td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <Button size="sm" disabled={busy === r.id || (!dirty && r.reviewed)} onClick={() => save(r, true)}>
                      {busy === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : dirty ? "Salvează" : "Aprobă"}
                    </Button>
                    {r.source === "manual" ? <Badge variant="secondary">manual</Badge> : r.reviewed ? <Badge variant="secondary">aprobat</Badge> : <Badge variant="outline">AI</Badge>}
                  </div>
                </td>
              </tr>
            )
          })}
          {rows.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">Nicio traducere.</td></tr>}
        </tbody>
      </table>
    </div>
  )
}

"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react"
import { api, inputCls } from "./shared"

/** Search a firm (website entry) by name and pick it; the value is the entry id. */
export function EntryPicker({ lineId, value, onChange, onPick, label = "Caută firma" }: {
  lineId: string; value: string; onChange: (id: string) => void; onPick?: (entry: any) => void; label?: string
}) {
  const [text, setText] = useState("")
  const [results, setResults] = useState<any[]>([])
  const [title, setTitle] = useState<string | null>(null)
  const q = `lineId=${encodeURIComponent(lineId)}`

  // show the name of an already chosen firm (e.g. when a saved rule is reopened)
  useEffect(() => {
    if (!value) { setTitle(null); return }
    api(`/api/website/entries/${value}?${q}`).then((e) => setTitle(e.title)).catch(() => setTitle(null))
  }, [value, q])

  useEffect(() => {
    if (text.trim().length < 2) { setResults([]); return }
    const t = setTimeout(() => { api(`/api/website/entries?${q}&q=${encodeURIComponent(text.trim())}`).then((r) => setResults(r.items ?? [])).catch(() => setResults([])) }, 250)
    return () => clearTimeout(t)
  }, [text, q])

  if (value) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-md border border-input bg-background px-3 h-9 text-sm">
        <span className="truncate">{title ?? "Firmă selectată"} <span className="text-xs text-muted-foreground">({value.slice(0, 8)}…)</span></span>
        <button type="button" className="text-xs text-primary hover:underline" onClick={() => { onChange(""); setText("") }}>Schimbă</button>
      </div>
    )
  }
  return (
    <div className="relative">
      <input aria-label={label} className={inputCls} placeholder={label} value={text} onChange={(e) => setText(e.target.value)} />
      {results.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full max-h-48 overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md text-sm">
          {results.map((r) => (
            <li key={r.id}>
              <button type="button" className="w-full text-left px-3 py-2 hover:bg-muted" onClick={async () => {
                onChange(r.id); setText(""); setResults([])
                if (onPick) { try { onPick(await api(`/api/website/entries/${r.id}?${q}`)) } catch { /* optional helper */ } }
              }}>
                {r.title} <span className="text-xs text-muted-foreground">{[r.city, r.county].filter(Boolean).join(", ")}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

"use client"

import { useBusinessLine } from "@/components/business-line-context"

/**
 * Which business lines a supplier is shown on. Empty selection = ALL lines (shared supplier, e.g. software vendors).
 * "Doar liniile selectate" restricts it to the ticked lines.
 */
export function SupplierLinesField({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const { lines } = useBusinessLine()
  const scoped = value.length > 0
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id])
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">Linii de business</label>
      <div className="space-y-2 rounded-xl border border-border bg-background p-3">
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" checked={!scoped} onChange={() => onChange([])} />
          Toate liniile <span className="text-xs text-muted-foreground">(furnizor comun, apare peste tot)</span>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" checked={scoped} onChange={() => { if (!scoped && lines[0]) onChange([lines[0].id]) }} />
          Doar liniile selectate
        </label>
        {scoped && (
          <div className="ml-6 flex flex-wrap gap-x-4 gap-y-1">
            {lines.map((l) => (
              <label key={l.id} className="flex items-center gap-1.5 text-sm">
                <input type="checkbox" checked={value.includes(l.id)} onChange={() => toggle(l.id)} />
                {l.name}
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

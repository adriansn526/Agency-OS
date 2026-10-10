"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export function ActiveToggle({ productId, isActive }: { productId: string; isActive: boolean }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  async function toggle() {
    const msg = isActive ? "Dezactivezi produsul? Dispare imediat din storefront." : "Activezi produsul? Apare imediat în storefront."
    if (!confirm(msg)) return
    setBusy(true); setErr(null)
    try {
      const res = await fetch(`/api/commerce/products/${productId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !isActive }) })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Eroare")
      router.refresh()
    } catch (e) { setErr(e instanceof Error ? e.message : "Eroare") } finally { setBusy(false) }
  }
  return (
    <div className="flex items-center gap-3">
      <Badge variant={isActive ? "default" : "destructive"}>{isActive ? "Activ în storefront" : "Inactiv (ascuns din storefront)"}</Badge>
      <Button size="sm" variant="outline" onClick={toggle} disabled={busy}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{isActive ? "Dezactivează" : "Activează"}</Button>
      {err && <span className="text-sm text-destructive">{err}</span>}
    </div>
  )
}

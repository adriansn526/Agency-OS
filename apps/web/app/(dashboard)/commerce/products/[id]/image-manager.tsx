"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Trash2, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"

interface Img { id: string; url: string | null; source: string; key: string; width: number | null; height: number | null }

export function ImageManager({ productId, images }: { productId: string; images: Img[] }) {
  const router = useRouter()
  const file = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function upload() {
    const f = file.current?.files?.[0]
    if (!f) return
    setBusy(true); setErr(null)
    try {
      const fd = new FormData(); fd.append("file", f)
      const res = await fetch(`/api/commerce/products/${productId}/images`, { method: "POST", body: fd })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(res.status === 413 ? "Fișierul este prea mare." : data.error || "Încărcarea a eșuat")
      if (file.current) file.current.value = ""
      router.refresh()
    } catch (e) { setErr(e instanceof Error ? e.message : "Eroare") } finally { setBusy(false) }
  }

  async function remove(id: string) {
    if (!confirm("Ștergi această poză încărcată manual?")) return
    setBusy(true); setErr(null)
    try {
      const res = await fetch(`/api/commerce/products/${productId}/images?imageId=${encodeURIComponent(id)}`, { method: "DELETE" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Ștergerea a eșuat")
      router.refresh()
    } catch (e) { setErr(e instanceof Error ? e.message : "Eroare") } finally { setBusy(false) }
  }

  return (
    <div className="grid gap-4">
      {images.length === 0 && <p className="text-sm text-muted-foreground">Produsul nu are poze. Încarcă una mai jos.</p>}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {images.map((i, idx) => (
          <div key={i.id} className="grid gap-1 text-xs">
            {i.url ? <img src={i.url} alt="" loading="lazy" className="aspect-square w-full rounded border object-contain bg-white" /> : <div className="aspect-square rounded border border-dashed" />}
            <div className="flex items-center gap-1">
              {idx === 0 && <Badge>principală</Badge>}
              <Badge variant="secondary">{i.source === "manual" ? "manual" : "auto"}</Badge>
              {i.source === "manual" && <button className="ml-auto text-destructive" disabled={busy} onClick={() => remove(i.id)} title="Șterge"><Trash2 className="h-4 w-4" /></button>}
            </div>
            <div className="truncate text-muted-foreground" title={i.key}>{i.key.split("/").slice(-1)[0]}{i.width ? ` · ${i.width}×${i.height}` : ""}</div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3 border-t pt-4">
        <input ref={file} type="file" accept="image/jpeg,image/png,image/webp" className="text-sm" />
        <Button size="sm" onClick={upload} disabled={busy}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />} Încarcă poză</Button>
        <span className="text-xs text-muted-foreground">JPEG/PNG/WebP, max 8 MB. Pozele manuale au prioritate față de cele importate.</span>
      </div>
      {err && <Alert variant="destructive">{err}</Alert>}
    </div>
  )
}

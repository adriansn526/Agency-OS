"use client"
/* eslint-disable @typescript-eslint/no-explicit-any, @next/next/no-img-element */
import { useRef, useState } from "react"
import { toast } from "sonner"
import { ImagePlus, Loader2, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { api, ApiError, inputCls, labelCls } from "./shared"

export interface MediaItem { id: string; url: string; alt: string | null; width: number | null; height: number | null }
const ACCEPT = "image/jpeg,image/png,image/webp,image/gif"
const MAX_MB = { logo: 3, cover: 8, image: 10 } as const

async function upload(lineId: string, entryId: string, kind: "logo" | "cover" | "image", file: File) {
  const form = new FormData()
  form.set("file", file); form.set("kind", kind)
  const res = await fetch(`/api/website/entries/${entryId}/media?lineId=${encodeURIComponent(lineId)}`, { method: "POST", body: form })
  const j = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(j.error || "Încărcarea a eșuat")
  return j.data
}

/** Logo, cover and gallery upload for a saved entry. Files are validated and re-encoded on the server (WebP, no EXIF). */
export function EntryImages({ lineId, entryId, logoUrl, coverUrl, media, onLogo, onCover, onMedia }: {
  lineId: string; entryId: string; logoUrl: string; coverUrl: string; media: MediaItem[]
  onLogo: (url: string) => void; onCover: (url: string) => void; onMedia: (m: MediaItem[]) => void
}) {
  const q = `lineId=${encodeURIComponent(lineId)}`
  const [busy, setBusy] = useState<string | null>(null)
  const logoRef = useRef<HTMLInputElement>(null), coverRef = useRef<HTMLInputElement>(null), galleryRef = useRef<HTMLInputElement>(null)

  async function run(name: string, fn: () => Promise<void>) {
    setBusy(name)
    try { await fn() } catch (e) { toast.error(e instanceof ApiError ? e.message : "Eroare") } finally { setBusy(null) }
  }
  const tooBig = (f: File, kind: keyof typeof MAX_MB) => (f.size > MAX_MB[kind] * 1_000_000 ? (toast.error(`„${f.name}” depășește ${MAX_MB[kind]} MB`), true) : false)

  const single = (kind: "logo" | "cover", ref: React.RefObject<HTMLInputElement | null>, set: (u: string) => void) => (
    <div>
      <label className={labelCls}>{kind === "logo" ? "Logo" : "Imagine de copertă"}</label>
      <div className="flex items-center gap-3">
        <div className={`flex items-center justify-center rounded-md border border-border bg-muted/30 overflow-hidden ${kind === "logo" ? "h-16 w-16" : "h-16 w-28"}`}>
          {(kind === "logo" ? logoUrl : coverUrl) ? <img src={kind === "logo" ? logoUrl : coverUrl} alt="" className="h-full w-full object-contain" /> : <ImagePlus className="h-5 w-5 text-muted-foreground" />}
        </div>
        <input ref={ref} type="file" accept={ACCEPT} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f && !tooBig(f, kind)) void run(kind, async () => { const r = await upload(lineId, entryId, kind, f); set(r.url); toast.success("Imagine încărcată") }) }} />
        <Button type="button" size="sm" variant="outline" disabled={busy === kind} onClick={() => ref.current?.click()}>{busy === kind ? <Loader2 className="h-4 w-4 animate-spin" /> : "Încarcă"}</Button>
        {(kind === "logo" ? logoUrl : coverUrl) && <Button type="button" size="sm" variant="ghost" disabled={busy === `${kind}-del`} onClick={() => run(`${kind}-del`, async () => { await api(`/api/website/entries/${entryId}/media?${q}&kind=${kind}`, "DELETE"); set(""); toast.success("Imagine ștearsă") })}><Trash2 className="h-4 w-4" /></Button>}
      </div>
    </div>
  )

  return (
    <section>
      <h3 className="text-sm font-semibold mb-2">Imagini</h3>
      <p className="text-xs text-muted-foreground mb-3">JPG, PNG, WebP sau GIF. Imaginile sunt redimensionate și convertite în WebP; datele EXIF (locație, aparat) se șterg. Se publică la o adresă publică.</p>
      <div className="grid grid-cols-2 gap-4">{single("logo", logoRef, onLogo)}{single("cover", coverRef, onCover)}</div>

      <div className="mt-5">
        <div className="flex items-center justify-between mb-2">
          <label className={labelCls}>Galerie / portofoliu ({media.length}/30)</label>
          <input ref={galleryRef} type="file" accept={ACCEPT} multiple className="hidden" onChange={(e) => {
            const files = Array.from(e.target.files ?? []); e.target.value = ""
            void run("gallery", async () => {
              let next = media
              for (const f of files) { if (tooBig(f, "image")) continue; const m = await upload(lineId, entryId, "image", f); next = [...next, m]; onMedia(next) }
              if (files.length) toast.success("Imagini încărcate")
            })
          }} />
          <Button type="button" size="sm" variant="outline" disabled={busy === "gallery" || media.length >= 30} onClick={() => galleryRef.current?.click()}>{busy === "gallery" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Adaugă imagini"}</Button>
        </div>
        {media.length === 0 ? <p className="text-sm text-muted-foreground">Nicio imagine încă.</p> : (
          <ul className="grid grid-cols-3 gap-3">
            {media.map((m) => (
              <li key={m.id} className="rounded-md border border-border overflow-hidden">
                <img src={m.url} alt={m.alt ?? ""} className="aspect-[4/3] w-full object-cover" loading="lazy" />
                <div className="p-2 flex items-center gap-1">
                  <input aria-label="Text alternativ" className={inputCls + " h-8 text-xs"} placeholder="Descriere (alt)" defaultValue={m.alt ?? ""} maxLength={200}
                    onBlur={(e) => { const v = e.target.value.trim(); if (v !== (m.alt ?? "")) void run(`alt-${m.id}`, async () => { await api(`/api/website/entries/${entryId}/media/${m.id}?${q}`, "PATCH", { alt: v }); onMedia(media.map((x) => x.id === m.id ? { ...x, alt: v || null } : x)) }) }} />
                  <Button type="button" size="sm" variant="ghost" aria-label="Șterge imaginea" disabled={busy === `del-${m.id}`} onClick={() => run(`del-${m.id}`, async () => { await api(`/api/website/entries/${entryId}/media/${m.id}?${q}`, "DELETE"); onMedia(media.filter((x) => x.id !== m.id)) })}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react"
import { toast } from "sonner"
import { Copy, KeyRound, Loader2, Trash2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { api, ApiError, fmtDate, inputCls, labelCls } from "./shared"

export function OverviewTab({ lineId, overview, reload }: { lineId: string; overview: any; reload: () => Promise<void> }) {
  const channel = overview?.channel
  const [siteUrl, setSiteUrl] = useState<string>(channel?.siteUrl ?? "")
  const [validity, setValidity] = useState<number>(channel?.previewValidityDays ?? 14)
  const [legalEmail, setLegalEmail] = useState<string>(channel?.legalEmail ?? "")
  const [label, setLabel] = useState("")
  const [newKey, setNewKey] = useState<{ key: string; label: string } | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const q = `lineId=${encodeURIComponent(lineId)}`

  async function run<T>(name: string, fn: () => Promise<T>, ok?: string) {
    setBusy(name)
    try { const r = await fn(); if (ok) toast.success(ok); await reload(); return r }
    catch (e) { toast.error(e instanceof ApiError ? [e.message, ...(e.details ?? [])].join(" — ") : "Eroare") }
    finally { setBusy(null) }
  }

  if (!channel) {
    return (
      <Card><CardContent className="p-8 flex flex-col items-start gap-4">
        <div>
          <h2 className="text-lg font-semibold">Website nu este activat pe această linie</h2>
          <p className="text-sm text-muted-foreground max-w-xl">Activarea creează canalul de publicare. Apoi definești colecțiile (de exemplu „Companii”), adaugi intrări și emiți o cheie API pentru site.</p>
        </div>
        <div className="w-full max-w-md">
          <label className={labelCls} htmlFor="siteurl">Adresa site-ului (opțional)</label>
          <input id="siteurl" className={inputCls} placeholder="https://exemplu.ro" value={siteUrl} onChange={(e) => setSiteUrl(e.target.value)} />
        </div>
        <Button disabled={busy === "enable"} onClick={() => run("enable", () => api(`/api/website/channel?${q}`, "POST", { siteUrl: siteUrl || undefined }), "Website activat")}>
          {busy === "enable" && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Activează Website
        </Button>
      </CardContent></Card>
    )
  }

  const entries = overview.counts?.entries ?? {}
  const stat = (label: string, v: number) => (
    <div className="rounded-lg border p-4"><div className="text-2xl font-bold tabular-nums">{v}</div><div className="text-xs text-muted-foreground">{label}</div></div>
  )

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-5 gap-3">
        {stat("Colecții", overview.counts.collections)}
        {stat("Publicate", entries.published ?? 0)}
        {stat("Ciorne", entries.draft ?? 0)}
        {stat("Suspendate", entries.suspended ?? 0)}
        {stat("Recenzii în așteptare", overview.counts.pendingReviews)}
      </div>

      <Card className="lg:col-span-1">
        <CardHeader><CardTitle>Setări site</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div>
            <label className={labelCls} htmlFor="siteurl2">Adresa site-ului</label>
            <input id="siteurl2" className={inputCls} placeholder="https://exemplu.ro" value={siteUrl} onChange={(e) => setSiteUrl(e.target.value)} />
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-1" checked={channel.isEnabled} onChange={(e) => run("toggle", () => api(`/api/website/channel?${q}`, "PATCH", { isEnabled: e.target.checked }), e.target.checked ? "Publicare activă" : "Publicare oprită")} />
            <span>Publicare activă <span className="text-muted-foreground">(oprită = API-ul răspunde 401)</span></span>
          </label>
          <div>
            <label className={labelCls} htmlFor="pv-days">Valabilitatea linkului de previzualizare (zile de la trimitere)</label>
            <div className="flex items-center gap-2">
              <input id="pv-days" type="number" min={1} max={90} className={inputCls + " w-24"} value={validity} onChange={(e) => setValidity(Number(e.target.value))} />
              <Button size="sm" variant="outline" disabled={busy === "validity" || !Number.isInteger(validity) || validity < 1 || validity > 90 || validity === (channel.previewValidityDays ?? 14)} onClick={() => run("validity", () => api(`/api/website/channel?${q}`, "PATCH", { previewValidityDays: validity }), "Valabilitate salvată")}>Salvează</Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Se aplică linkurilor generate de acum încolo; cele deja trimise își păstrează data.</p>
          </div>
          <div>
            <label className={labelCls} htmlFor="legal-email">Email de contact în documentele juridice</label>
            <div className="flex items-center gap-2">
              <input id="legal-email" type="email" className={inputCls} placeholder="parteneri@intraconstruct.ro" value={legalEmail} onChange={(e) => setLegalEmail(e.target.value)} />
              <Button size="sm" variant="outline" disabled={busy === "legal" || legalEmail === (channel.legalEmail ?? "")} onClick={() => run("legal", () => api(`/api/website/channel?${q}`, "PATCH", { legalEmail: legalEmail.trim() || null }), "Email salvat")}>Salvează</Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Datele societății (denumire, CUI, sediu) vin din Setări → Companie; goală, se folosește emailul societății.</p>
          </div>
          <Button size="sm" variant="outline" disabled={busy === "save" || siteUrl === (channel.siteUrl ?? "")} onClick={() => run("save", () => api(`/api/website/channel?${q}`, "PATCH", { siteUrl }), "Salvat")}>Salvează adresa</Button>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader><CardTitle className="flex items-center gap-2"><KeyRound className="h-4 w-4" /> Chei API</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">Site-ul își citește conținutul de pe server, cu <code className="text-xs">Authorization: Bearer ws_…</code>. Cheia se afișează o singură dată; aici se păstrează doar un hash. Nu o pune niciodată în codul din browser.</p>
          {newKey && (
            <div className="rounded-lg border border-primary/40 bg-primary/5 p-3">
              <div className="text-xs font-semibold mb-1">Cheia „{newKey.label}” — copiaz-o acum, nu se mai poate afișa:</div>
              <div className="flex items-center gap-2">
                <code className="flex-1 break-all text-xs bg-background border rounded px-2 py-1.5">{newKey.key}</code>
                <Button size="icon" variant="outline" aria-label="Copiază cheia" onClick={() => { navigator.clipboard.writeText(newKey.key); toast.success("Copiat") }}><Copy className="h-4 w-4" /></Button>
              </div>
              <Button size="sm" variant="ghost" className="mt-2" onClick={() => setNewKey(null)}>Am salvat-o</Button>
            </div>
          )}
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className={labelCls} htmlFor="keylabel">Cheie nouă — etichetă</label>
              <input id="keylabel" className={inputCls} placeholder="ex: Frontend producție" value={label} maxLength={60} onChange={(e) => setLabel(e.target.value)} />
            </div>
            <Button disabled={!label.trim() || busy === "key"} onClick={async () => {
              const r = await run("key", () => api<{ key: string; label: string }>(`/api/website/channel/keys?${q}`, "POST", { label }))
              if (r) { setNewKey(r); setLabel("") }
            }}>Generează</Button>
          </div>
          {channel.keys.length === 0 ? <p className="text-sm text-muted-foreground">Nicio cheie încă.</p> : (
            <ul className="divide-y rounded-lg border">
              {channel.keys.map((k: any) => (
                <li key={k.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                  <div><div className="font-medium">{k.label}</div><div className="text-xs text-muted-foreground">creată {fmtDate(k.createdAt)}</div></div>
                  <Button size="sm" variant="ghost" aria-label={`Revocă ${k.label}`} disabled={busy === `del-${k.id}`}
                    onClick={() => { if (confirm(`Revoci cheia „${k.label}”? Site-urile care o folosesc nu vor mai primi conținut.`)) run(`del-${k.id}`, () => api(`/api/website/channel/keys?${q}&keyId=${k.id}`, "DELETE"), "Cheie revocată") }}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <div className="text-xs text-muted-foreground flex items-center gap-2">Endpoint: <Badge variant="secondary">/api/storefront/website/…</Badge> · documentație în <code>docs/website-module.md</code></div>
        </CardContent>
      </Card>
    </div>
  )
}

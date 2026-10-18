"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */
import { AuthorizationsPanel } from "./authorizations-panel"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { Modal } from "@/components/modal"
import { Button } from "@/components/ui/button"
import { EntryImages, type MediaItem } from "./entry-images"
import { api, ApiError, Collection, Field, inputCls, labelCls, STATUS_RO, textareaCls } from "./shared"

interface Draft {
  collectionId: string; title: string; slug: string; summary: string; body: string; status: string; verified: boolean; featured: boolean; partnerAccess: boolean; plan: string; planUntil: string
  city: string; county: string; address: string; lat: string; lng: string
  email: string; phone: string; websiteUrl: string; coverUrl: string; logoUrl: string; seoTitle: string; seoDescription: string
  data: Record<string, any>
}
const empty = (collectionId: string): Draft => ({ collectionId, title: "", slug: "", summary: "", body: "", status: "draft", verified: false, featured: false, partnerAccess: false, plan: "gratuit", planUntil: "", city: "", county: "", address: "", lat: "", lng: "", email: "", phone: "", websiteUrl: "", coverUrl: "", logoUrl: "", seoTitle: "", seoDescription: "", data: {} })
const fromEntry = (e: any): Draft => ({
  collectionId: e.collectionId, title: e.title, slug: e.slug, summary: e.summary ?? "", body: e.body ?? "", status: e.status, verified: e.verified, featured: e.featured, partnerAccess: !!e.partnerAccess, plan: e.plan ?? "gratuit", planUntil: e.planUntil ? String(e.planUntil).slice(0, 10) : "",
  city: e.city ?? "", county: e.county ?? "", address: e.address ?? "", lat: e.lat == null ? "" : String(e.lat), lng: e.lng == null ? "" : String(e.lng),
  email: e.email ?? "", phone: e.phone ?? "", websiteUrl: e.websiteUrl ?? "", coverUrl: e.coverUrl ?? "", logoUrl: e.logoUrl ?? "", seoTitle: e.seoTitle ?? "", seoDescription: e.seoDescription ?? "", data: e.data ?? {},
})
const num = (s: string) => (s.trim() === "" ? null : Number(s.replace(",", ".")))

function FieldInput({ f, value, onChange }: { f: Field; value: any; onChange: (v: any) => void }) {
  const id = `cf-${f.key}`
  switch (f.type) {
    case "select": return <select id={id} className={inputCls} value={value ?? ""} onChange={(e) => onChange(e.target.value)}><option value="">—</option>{(f.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}</select>
    case "number": case "rating": return <input id={id} type="number" step="any" min={f.type === "rating" ? 0 : undefined} max={f.type === "rating" ? 5 : undefined} className={inputCls} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
    case "date": return <input id={id} type="date" className={inputCls} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
    case "list": return <textarea id={id} className={textareaCls} placeholder="Câte un element pe linie" value={Array.isArray(value) ? value.join("\n") : value ?? ""} onChange={(e) => onChange(e.target.value)} />
    default: return <input id={id} className={inputCls} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
  }
}

export function EntryEditor({ lineId, entryId, collections, defaultCollectionId, onClose, onSaved }: {
  lineId: string; entryId: string | null; collections: Collection[]; defaultCollectionId: string; onClose: () => void; onSaved: () => void
}) {
  const q = `lineId=${encodeURIComponent(lineId)}`
  const [draft, setDraft] = useState<Draft | null>(entryId ? null : empty(defaultCollectionId))
  const [media, setMedia] = useState<MediaItem[]>([])
  const [meta, setMeta] = useState<{ publishedAt?: string | null; tenantId?: string | null; leadId?: string | null; lead?: { id: string; companyName: string; status: string } | null } | null>(null)
  const [saving, setSaving] = useState(false)
  const [issues, setIssues] = useState<string[]>([])
  const alertRef = useRef<HTMLUListElement>(null)
  // the form scrolls inside the modal: bring the validation errors into view
  useEffect(() => { if (issues.length) alertRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }) }, [issues])

  useEffect(() => {
    if (!entryId) return
    api(`/api/website/entries/${entryId}?${q}`).then((e) => { setDraft(fromEntry(e)); setMeta(e); setMedia(e.media ?? []) }).catch((e) => { toast.error(e instanceof ApiError ? e.message : "Eroare"); onClose() })
  }, [entryId, q, onClose])

  const collection = collections.find((c) => c.id === draft?.collectionId)
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => d && { ...d, [k]: v })

  async function save() {
    if (!draft) return
    setSaving(true); setIssues([])
    const { collectionId, slug, lat, lng, ...rest } = draft
    const body: any = { ...rest, planUntil: rest.planUntil ? new Date(`${rest.planUntil}T23:59:59`).toISOString() : null, lat: num(lat), lng: num(lng), ...(slug ? { slug } : {}) }
    if (!entryId) body.collectionId = collectionId
    // empty strings mean "no value"; the API stores null
    for (const k of ["summary", "body", "city", "county", "address", "email", "phone", "websiteUrl", "coverUrl", "logoUrl", "seoTitle", "seoDescription"]) if (body[k] === "") body[k] = null
    try {
      await api(entryId ? `/api/website/entries/${entryId}?${q}` : `/api/website/entries?${q}`, entryId ? "PATCH" : "POST", body)
      toast.success(entryId ? "Intrare salvată" : "Intrare creată"); onSaved()
    } catch (e) { if (e instanceof ApiError) { setIssues([e.message, ...(e.details ?? [])]); toast.error(e.details?.[0] ?? e.message) } else toast.error("Eroare") }
    finally { setSaving(false) }
  }

  return (
    <Modal open onClose={onClose} title={entryId ? "Editează intrarea" : "Intrare nouă"} description={collection ? `${collection.name} · ${collection.key}` : undefined} size="lg">
      {!draft ? <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Se încarcă…</div> : (
        <div className="flex flex-col gap-5">
          {issues.length > 0 && <ul ref={alertRef} role="alert" className="rounded-md border border-destructive/50 p-3 text-sm text-destructive list-disc pl-6">{issues.map((m, i) => <li key={i}>{m}</li>)}</ul>}

          {meta?.lead && (
            <div className="flex items-center justify-between gap-3 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
              <span>Partener din CRM: <a className="font-medium underline" href={`/crm/lead-uri/${meta.lead.id}`}>{meta.lead.companyName}</a> <span className="text-xs text-muted-foreground">({meta.lead.status})</span></span>
              <Button size="sm" variant="ghost" disabled={saving} onClick={async () => {
                if (!entryId || !confirm("Dezlegi intrarea de lead-ul din CRM? Profilul public rămâne neschimbat.")) return
                setSaving(true)
                try { await api(`/api/website/entries/${entryId}?${q}`, "PATCH", { leadId: null }); setMeta({ ...meta, leadId: null, lead: null }); toast.success("Dezlegat de CRM") }
                catch (e) { toast.error(e instanceof ApiError ? e.message : "Eroare") } finally { setSaving(false) }
              }}>Dezleagă</Button>
            </div>
          )}

          <section className="grid grid-cols-2 gap-3">
            {!entryId && <div className="col-span-2"><label className={labelCls} htmlFor="e-col">Colecție</label>
              <select id="e-col" className={inputCls} value={draft.collectionId} onChange={(e) => set("collectionId", e.target.value)}>{collections.filter((c) => c.isActive).map((c) => <option key={c.id} value={c.id}>{c.namePlural}</option>)}</select></div>}
            <div className="col-span-2"><label className={labelCls} htmlFor="e-title">Titlu</label><input id="e-title" className={inputCls} value={draft.title} onChange={(e) => set("title", e.target.value)} /></div>
            <div><label className={labelCls} htmlFor="e-slug">Slug (în URL)</label><input id="e-slug" className={inputCls} placeholder={entryId ? "" : "se generează din titlu"} value={draft.slug} onChange={(e) => set("slug", e.target.value)} /></div>
            <div><label className={labelCls} htmlFor="e-status">Stare</label>
              <select id="e-status" className={inputCls} value={draft.status} onChange={(e) => set("status", e.target.value)}>{["draft", "preview", "published", "suspended"].map((s) => <option key={s} value={s}>{STATUS_RO[s]}</option>)}</select></div>
            <div><label className={labelCls} htmlFor="e-plan">Plan</label>
              <select id="e-plan" className={inputCls} value={draft.plan} onChange={(e) => set("plan", e.target.value)}><option value="gratuit">Gratuit (cererile directe se plătesc per cerere)</option><option value="abonament">Abonament (cereri directe incluse)</option></select></div>
            <div><label className={labelCls} htmlFor="e-planuntil">Abonament valabil până la</label><input id="e-planuntil" type="date" className={inputCls} value={draft.planUntil} disabled={draft.plan !== "abonament"} onChange={(e) => set("planUntil", e.target.value)} /></div>
            <div className="col-span-2 flex gap-5 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" checked={draft.verified} onChange={(e) => set("verified", e.target.checked)} /> Verificat</label>
              <label className="flex items-center gap-2" title="Firma poate intra în „Profilul meu” (link pe email / cod SMS) și își poate edita profilul"><input type="checkbox" checked={draft.partnerAccess} onChange={(e) => set("partnerAccess", e.target.checked)} /> Acces „Profilul meu”</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={draft.featured} onChange={(e) => set("featured", e.target.checked)} /> Recomandat (apare primul)</label>
              {meta?.tenantId && <span className="text-xs text-muted-foreground self-center">Partener activ în ERP</span>}
            </div>
            <div className="col-span-2"><label className={labelCls} htmlFor="e-sum">Rezumat (max 500)</label><textarea id="e-sum" maxLength={500} className={textareaCls} value={draft.summary} onChange={(e) => set("summary", e.target.value)} /></div>
            <div className="col-span-2"><label className={labelCls} htmlFor="e-body">Descriere (text simplu sau markdown; nu HTML)</label><textarea id="e-body" className={textareaCls + " min-h-[140px]"} value={draft.body} onChange={(e) => set("body", e.target.value)} /></div>
          </section>

          {collection && collection.fields.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold mb-2">Câmpuri {collection.name.toLowerCase()}</h3>
              <div className="grid grid-cols-2 gap-3">
                {collection.fields.filter((f) => f.key !== "autorizatii_verificate").map((f) => (
                  <div key={f.key} className={f.type === "list" ? "col-span-2" : ""}>
                    <label className={labelCls} htmlFor={`cf-${f.key}`}>{f.label}{f.required && draft.status === "published" && <span className="text-destructive"> *</span>}</label>
                    <FieldInput f={f} value={draft.data[f.key]} onChange={(v) => set("data", { ...draft.data, [f.key]: v })} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {entryId && collection?.key === "companii" && <AuthorizationsPanel lineId={lineId} entryId={entryId} value={draft.data.autorizatii_verificate} onChanged={(list) => set("data", { ...draft.data, autorizatii_verificate: list })} />}

          <section>
            <h3 className="text-sm font-semibold mb-2">Locație</h3>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelCls} htmlFor="e-city">Oraș</label><input id="e-city" className={inputCls} value={draft.city} onChange={(e) => set("city", e.target.value)} /></div>
              <div><label className={labelCls} htmlFor="e-county">Județ</label><input id="e-county" className={inputCls} value={draft.county} onChange={(e) => set("county", e.target.value)} /></div>
              <div className="col-span-2"><label className={labelCls} htmlFor="e-addr">Adresă</label><input id="e-addr" className={inputCls} value={draft.address} onChange={(e) => set("address", e.target.value)} /></div>
              <div><label className={labelCls} htmlFor="e-lat">Latitudine</label><input id="e-lat" inputMode="decimal" className={inputCls} value={draft.lat} onChange={(e) => set("lat", e.target.value)} /></div>
              <div><label className={labelCls} htmlFor="e-lng">Longitudine</label><input id="e-lng" inputMode="decimal" className={inputCls} value={draft.lng} onChange={(e) => set("lng", e.target.value)} /></div>
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold mb-2">Contact și imagine</h3>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelCls} htmlFor="e-email">Email (nu apare public; la cereri)</label><input id="e-email" type="email" className={inputCls} value={draft.email} onChange={(e) => set("email", e.target.value)} /></div>
              <div><label className={labelCls} htmlFor="e-phone">Telefon</label><input id="e-phone" className={inputCls} value={draft.phone} onChange={(e) => set("phone", e.target.value)} /></div>
              <div><label className={labelCls} htmlFor="e-web">Website</label><input id="e-web" className={inputCls} placeholder="https://" value={draft.websiteUrl} onChange={(e) => set("websiteUrl", e.target.value)} /></div>
              <div><label className={labelCls} htmlFor="e-logo">Logo (URL)</label><input id="e-logo" className={inputCls} placeholder="https://" value={draft.logoUrl} onChange={(e) => set("logoUrl", e.target.value)} /></div>
              <div><label className={labelCls} htmlFor="e-cover">Imagine de copertă (URL)</label><input id="e-cover" className={inputCls} placeholder="https://" value={draft.coverUrl} onChange={(e) => set("coverUrl", e.target.value)} /></div>
            </div>
          </section>

          {entryId ? (
            <EntryImages lineId={lineId} entryId={entryId} logoUrl={draft.logoUrl} coverUrl={draft.coverUrl} media={media}
              onLogo={(u) => set("logoUrl", u)} onCover={(u) => set("coverUrl", u)} onMedia={setMedia} />
          ) : (
            <p className="text-xs text-muted-foreground">Salvează intrarea ca să poți încărca logo și imagini.</p>
          )}

          <section>
            <h3 className="text-sm font-semibold mb-2">SEO</h3>
            <div className="grid gap-3">
              <div><label className={labelCls} htmlFor="e-st">Titlu SEO</label><input id="e-st" className={inputCls} value={draft.seoTitle} onChange={(e) => set("seoTitle", e.target.value)} /></div>
              <div><label className={labelCls} htmlFor="e-sd">Descriere SEO</label><textarea id="e-sd" className={textareaCls} value={draft.seoDescription} onChange={(e) => set("seoDescription", e.target.value)} /></div>
            </div>
          </section>

          <div className="flex justify-end gap-2 sticky -bottom-6 -mx-6 -mb-6 px-6 py-3 border-t border-border bg-surface">
            <Button variant="ghost" onClick={onClose}>Renunță</Button>
            <Button disabled={saving || draft.title.trim().length < 2 || !draft.collectionId} onClick={save}>{saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />} {draft.status === "published" ? "Salvează și publică" : "Salvează"}</Button>
          </div>
        </div>
      )}
    </Modal>
  )
}

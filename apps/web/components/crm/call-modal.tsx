"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { ChevronDown, MessageSquare, Phone } from "lucide-react"
import { Modal } from "@/components/modal"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { PORTAL_REASONS, PORTAL_USE, PORTAL_USE_LABEL, type PortalReason, type PortalUse } from "@/lib/crm/calls/outcome"
import { fmtTimer, OUTCOMES, quickCallbacks, telHref, companyProfile, phoneTag, toLocalInput, type OutcomeValue } from "./call-utils"

const inputCls = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
const labelCls = "block text-xs font-semibold text-foreground mb-1.5"

async function call<T = any>(url: string, method = "GET", body?: unknown): Promise<T & { _status: number }> {
  const res = await fetch(url, { method, headers: body === undefined ? undefined : { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) })
  const j = await res.json().catch(() => ({}))
  if (!res.ok) throw Object.assign(new Error(j.error || "Eroare"), { status: res.status, blockers: j.blockers as string[] | undefined, details: j.details as string[] | undefined })
  const data = j.data ?? j
  return (Array.isArray(data) ? data : { ...data, _status: res.status }) as T & { _status: number }
}

/** Call workspace for one lead: dial (phone or Phone Link), outcome, consents, callback date, notes, and an SMS from a template. */
export function CallModal({ leadId, lineSlug, open, onClose, onSaved, onNext }: { leadId: string | null; lineSlug: string; open: boolean; onClose: () => void; onSaved?: () => void; onNext?: () => void }) {
  const [lead, setLead] = useState<any>(null)
  const [templates, setTemplates] = useState<any[]>([])
  const [outcome, setOutcome] = useState<OutcomeValue | null>(null)
  const [consentSms, setConsentSms] = useState<"" | "da" | "nu">("")
  const [consentEmail, setConsentEmail] = useState<"" | "da" | "nu">("")
  const [portalUse, setPortalUse] = useState<"" | PortalUse>("")
  const [portalNames, setPortalNames] = useState("")
  const [portalReason, setPortalReason] = useState<"" | PortalReason>("")
  const [callback, setCallback] = useState("")
  const [notes, setNotes] = useState("")
  const [elapsed, setElapsed] = useState(0)
  const [running, setRunning] = useState(false)
  const [templateId, setTemplateId] = useState("")
  const [sms, setSms] = useState<{ text: string; length: number; blockers: string[]; alreadySent: boolean } | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [deliveries, setDeliveries] = useState<{ id: string; at: string; subject: string | null; state: "delivered" | "failed" | "pending" | "unknown"; deliveredAt: string | null }[]>([])
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  // load the lead and the SMS templates each time the modal opens for a lead; start from a clean form
  useEffect(() => {
    if (!open || !leadId) return
    setOutcome(null); setCallback(""); setNotes(""); setElapsed(0); setRunning(false); setSms(null); setTemplateId(""); setLead(null)
    call(`/api/leads/${leadId}`).then((l) => {
      setLead(l)
      const cf = (l.customFields ?? {}) as Record<string, string>
      setConsentSms(cf.acord_sms === "da" || cf.acord_sms === "nu" ? cf.acord_sms : ""); setConsentEmail(cf.acord_email === "da" || cf.acord_email === "nu" ? cf.acord_email : "")
      setPortalUse((PORTAL_USE.find((u) => PORTAL_USE_LABEL[u] === cf.alte_portaluri) ?? "") as "" | PortalUse); setPortalNames(typeof cf.alte_portaluri_nume === "string" ? cf.alte_portaluri_nume : ""); setPortalReason((PORTAL_REASONS.find((r) => r === cf.alte_portaluri_motiv) ?? "") as "" | PortalReason)
    }).catch(() => toast.error("Nu am putut încărca firma"))
    call(`/api/crm/calls/${leadId}/sms/delivery`).then((d: any) => setDeliveries(Array.isArray(d) ? d : [])).catch(() => setDeliveries([]))
    call(`/api/marketing/templates?businessLine=${encodeURIComponent(lineSlug)}&channel=sms`).then((t: any) => setTemplates(Array.isArray(t) ? t : [])).catch(() => setTemplates([]))
  }, [open, leadId, lineSlug])

  useEffect(() => {
    if (running) timer.current = setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => { if (timer.current) clearInterval(timer.current) }
  }, [running])

  const refreshDelivery = useCallback(async () => {
    if (!leadId) return
    try { const d = await call(`/api/crm/calls/${leadId}/sms/delivery`); setDeliveries(Array.isArray(d) ? d : []) } catch { /* the list stays as it was */ }
  }, [leadId])

  const loadSms = useCallback(async (id: string) => {
    if (!leadId || !id) { setSms(null); return }
    try { setSms(await call(`/api/crm/calls/${leadId}/sms?templateId=${encodeURIComponent(id)}`)) } catch { setSms(null) }
  }, [leadId])
  // the consent may have just changed in this form: the server decides, so refresh the preview after saving the call (see save) and on template change
  useEffect(() => { if (templateId) void loadSms(templateId) }, [templateId, loadSms])
  const profile = useMemo(() => companyProfile(lead), [lead])
  const [aboutOpen, setAboutOpen] = useState(true)

  if (!open || !leadId) return null
  const phones = [lead?.phone, lead?.phone2, lead?.phone3].filter((p: string | null) => p && p.toUpperCase() !== "N/A")
  const needsCallback = outcome === "revin"
  const noCallback = outcome === "refuza" || outcome === "numar_gresit"
  const callbackInvalid = needsCallback && (!callback || new Date(callback) <= new Date())

  async function save(next: boolean) {
    if (!outcome) return
    setBusy("save")
    try {
      await call(`/api/crm/calls/${leadId}/call`, "POST", {
        outcome, notes: notes.trim() || undefined, consentSms: consentSms || null, consentEmail: consentEmail || null,
        otherPortals: { use: portalUse || null, names: portalUse && portalUse !== "nu" ? portalNames.trim() || null : null, reason: portalUse && portalUse !== "nu" ? portalReason || null : null },
        callbackAt: callback && !noCallback ? new Date(callback).toISOString() : null, durationSec: elapsed > 0 ? elapsed : null,
      })
      toast.success("Apel salvat")
      setRunning(false); onSaved?.()
      if (next && onNext) onNext(); else if (templateId) await loadSms(templateId); else onClose()
    } catch (e: any) { toast.error([e.message, ...(e.details ?? [])].join(" — ")) } finally { setBusy(null) }
  }

  async function sendSms(resend = false) {
    if (!templateId) return
    setBusy("sms")
    try {
      await call(`/api/crm/calls/${leadId}/sms`, "POST", { templateId, resend })
      toast.success("SMS trimis"); await loadSms(templateId); void refreshDelivery(); onSaved?.()
    } catch (e: any) {
      if (e.status === 409 && e.blockers?.[0] === "already_sent") { if (confirm(`${e.message}\n\nRetrimiți?`)) await sendSms(true) }
      else toast.error(e.message)
    } finally { setBusy(null) }
  }

  return (
    <Modal open={open} onClose={onClose} title={lead ? lead.companyName : "Apel"} description={lead ? [lead.city, lead.county].filter(Boolean).join(", ") + (lead.contactPerson && lead.contactPerson !== "N/A" ? ` · ${lead.contactPerson}` : "") : undefined} size="lg">
      {!lead ? <p className="text-sm text-muted-foreground py-6">Se încarcă…</p> : (
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2">
            {phones.length === 0 && <span className="text-sm text-destructive">Firma nu are număr de telefon.</span>}
            {phones.map((p: string) => (
              <a key={p} href={telHref(p) ?? undefined} onClick={() => setRunning(true)} className={cn("inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90", !telHref(p) && "opacity-50 pointer-events-none")}>
                <Phone size={14} /> Sună {p}{phoneTag(profile.phoneTags, p) && <span className="text-[10px] font-normal opacity-80">· {phoneTag(profile.phoneTags, p)}</span>}
              </a>
            ))}
            <span className="ml-auto text-xs text-muted-foreground" aria-live="polite">Etapă: <b>{lead.status}</b>{lead.customFields?.rezultat_apel ? ` · ultimul rezultat: ${lead.customFields.rezultat_apel}` : ""}</span>
            {(running || elapsed > 0) && <span className="inline-flex items-center gap-1 text-sm font-mono" aria-label="Durata apelului"><span className={cn("h-2 w-2 rounded-full", running ? "bg-red-500 animate-pulse" : "bg-muted-foreground")} />{fmtTimer(elapsed)}
              <button type="button" className="ml-1 text-xs underline text-muted-foreground" onClick={() => setRunning((r) => !r)}>{running ? "Oprește" : "Reia"}</button></span>}
          </div>

          <section aria-label="Despre firmă" className="rounded-lg border border-border bg-muted/30">
            <button type="button" aria-expanded={aboutOpen} onClick={() => setAboutOpen((o) => !o)} className="flex w-full items-center justify-between px-3 py-2 text-sm font-semibold">
              Despre firmă <ChevronDown size={14} className={cn("transition-transform", aboutOpen && "rotate-180")} />
            </button>
            {aboutOpen && (
              <div className="flex flex-col gap-3 border-t border-border px-3 py-3 text-sm">
                {profile.people.length > 0 && <p><span className="text-muted-foreground">Persoane de contact: </span>{profile.people.map((x) => `${x.name}${x.role ? ` (${x.role})` : ""}`).join(" · ")}</p>}
                {profile.facts.length > 0 && <dl className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
                  {profile.facts.map((f) => (
                    <div key={f.label} className="flex gap-2"><dt className="shrink-0 text-muted-foreground">{f.label}:</dt>
                      <dd className={cn("min-w-0 break-words", f.warn && "font-semibold text-destructive")}>{f.href ? <a href={f.href} target="_blank" rel="noopener noreferrer" className="underline">{f.value}</a> : f.value}</dd></div>
                  ))}
                </dl>}
                {profile.signals.length > 0 && <ul className="flex flex-col gap-1 border-t border-border pt-2">
                  {profile.signals.map((f) => (
                    <li key={f.label} className={cn(f.warn && "text-destructive")}><span className="text-muted-foreground">{f.label}: </span>{f.href ? <a href={f.href} target="_blank" rel="noopener noreferrer" className="underline">{f.value}</a> : f.value}</li>
                  ))}
                </ul>}
                {profile.people.length + profile.facts.length + profile.signals.length === 0 && <p className="text-muted-foreground">Nu avem alte date despre această firmă.</p>}
              </div>
            )}
          </section>

          <fieldset>
            <legend className={labelCls}>Rezultatul apelului</legend>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Rezultatul apelului">
              {OUTCOMES.map((o) => (
                <button key={o.value} type="button" role="radio" aria-checked={outcome === o.value} title={o.hint} onClick={() => { setOutcome(o.value); if (o.value === "refuza" || o.value === "numar_gresit") setCallback("") }}
                  className={cn("rounded-lg border px-3 py-2 text-sm", outcome === o.value ? "border-primary bg-primary/10 font-semibold" : "border-border hover:bg-muted")}>{o.label}</button>
              ))}
            </div>
            {outcome && <p className="mt-1.5 text-xs text-muted-foreground">{OUTCOMES.find((o) => o.value === outcome)!.hint}</p>}
          </fieldset>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelCls} htmlFor="cm-sms">Acord SMS (la telefon)</label>
              <select id="cm-sms" className={inputCls} value={consentSms} onChange={(e) => setConsentSms(e.target.value as any)}><option value="">— nespecificat</option><option value="da">Da, putem trimite SMS</option><option value="nu">Nu</option></select>
            </div>
            <div>
              <label className={labelCls} htmlFor="cm-mail">Acord email</label>
              <select id="cm-mail" className={inputCls} value={consentEmail} onChange={(e) => setConsentEmail(e.target.value as any)}><option value="">— nespecificat</option><option value="da">Da</option><option value="nu">Nu</option></select>
            </div>
          </div>

          <fieldset className="rounded-lg border border-border p-3">
            <legend className="px-1 text-xs font-semibold">Alte portaluri (întrebarea din apel)</legend>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className={labelCls} htmlFor="cm-pu">Primește cereri din alte portaluri?</label>
                <select id="cm-pu" className={inputCls} value={portalUse} onChange={(e) => setPortalUse(e.target.value as "" | PortalUse)}><option value="">— nespecificat</option>{PORTAL_USE.map((u) => <option key={u} value={u}>{PORTAL_USE_LABEL[u]}</option>)}</select>
              </div>
              {portalUse && portalUse !== "nu" && (
                <>
                  <div>
                    <label className={labelCls} htmlFor="cm-pn">Care (cum le-a numit)</label>
                    <input id="cm-pn" className={inputCls} maxLength={120} value={portalNames} onChange={(e) => setPortalNames(e.target.value)} placeholder="doar ce spune el" />
                  </div>
                  <div>
                    <label className={labelCls} htmlFor="cm-pr">Principala nemulțumire</label>
                    <select id="cm-pr" className={inputCls} value={portalReason} onChange={(e) => setPortalReason(e.target.value as "" | PortalReason)}><option value="">— nespecificat</option>{PORTAL_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}</select>
                  </div>
                </>
              )}
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">Nu numi tu portalul și nu cere prețuri; notează doar ce spune firma.</p>
          </fieldset>

          {!noCallback && (
            <div>
              <label className={labelCls} htmlFor="cm-cb">{needsCallback ? "Revin la (obligatoriu)" : "Reapel (opțional)"}</label>
              <div className="flex flex-wrap items-center gap-2">
                <input id="cm-cb" type="datetime-local" className={cn(inputCls, "w-auto")} value={callback} onChange={(e) => setCallback(e.target.value)} />
                {quickCallbacks().map((q) => <button key={q.label} type="button" onClick={() => setCallback(toLocalInput(q.at))} className="rounded-md border border-border px-2.5 py-1.5 text-xs hover:bg-muted">{q.label}</button>)}
                {callback && <button type="button" onClick={() => setCallback("")} className="text-xs underline text-muted-foreground">Șterge</button>}
              </div>
              {callbackInvalid && <p className="mt-1 text-xs text-destructive">Alege o dată și o oră în viitor.</p>}
            </div>
          )}

          <div>
            <label className={labelCls} htmlFor="cm-notes">Notițe</label>
            <textarea id="cm-notes" rows={3} maxLength={2000} className={inputCls} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ce a spus, ce a cerut, cine e persoana de decizie…" />
          </div>

          <section className="rounded-lg border border-border p-3" aria-label="SMS din șablon">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><MessageSquare size={14} /> SMS din șablon</div>
            <select aria-label="Șablon SMS" className={inputCls} value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
              <option value="">Alege un șablon…</option>{templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            {templates.length === 0 && <p className="mt-1 text-xs text-muted-foreground">Nu există șabloane SMS pe această linie (Marketing → Șabloane).</p>}
            {sms && (
              <div className="mt-2 space-y-2">
                <p className="whitespace-pre-wrap rounded-md bg-muted/50 p-2 text-sm">{sms.text}</p>
                <p className="text-xs text-muted-foreground">{sms.length} caractere{sms.length > 160 ? " (mai mult de un SMS)" : ""}. Linkul real se creează în momentul trimiterii.</p>
                {sms.blockers.length > 0 && <ul className="list-disc pl-5 text-xs text-destructive" role="alert">{sms.blockers.map((b) => <li key={b}>{b}</li>)}</ul>}
                {sms.alreadySent && <p className="text-xs text-amber-600">Linkul acestei firme a fost deja trimis; retrimiterea îl înlocuiește.</p>}
                <Button type="button" size="sm" variant="outline" disabled={sms.blockers.length > 0 || busy === "sms"} onClick={() => sendSms()}>{busy === "sms" ? "Se trimite…" : "Trimite SMS"}</Button>
              </div>
            )}
            {deliveries.length > 0 && (
              <div className="mt-3 border-t border-border pt-2" aria-label="SMS trimise">
                <div className="mb-1 flex items-center justify-between text-xs font-semibold">SMS trimise <button type="button" className="font-normal underline text-muted-foreground" onClick={() => void refreshDelivery()}>Verifică din nou</button></div>
                <ul className="flex flex-col gap-1 text-xs">
                  {deliveries.slice(0, 4).map((d) => (
                    <li key={d.id} className="flex flex-wrap items-center gap-2">
                      <span className="text-muted-foreground">{new Date(d.at).toLocaleString("ro-RO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                      <span className="min-w-0 truncate">{(d.subject ?? "SMS").replace(/^SMS:\s*/, "")}</span>
                      <span className={cn("ml-auto rounded-full px-2 py-0.5", d.state === "delivered" && "bg-green-500/15 text-green-600", d.state === "failed" && "bg-destructive/15 text-destructive", (d.state === "pending" || d.state === "unknown") && "bg-muted text-muted-foreground")}>
                        {d.state === "delivered" ? "Livrat" : d.state === "failed" ? "Eșuat" : d.state === "pending" ? "Trimis, neconfirmat încă" : "Fără urmărire"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p className="mt-2 text-xs text-muted-foreground">SMS-ul se poate trimite doar cu „Acord SMS = da" salvat pe fișă. Salvează întâi apelul dacă tocmai ai primit acordul.</p>
          </section>

          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="ghost" onClick={onClose}>Închide</Button>
            <Button type="button" variant="outline" disabled={!outcome || callbackInvalid || busy === "save"} onClick={() => save(false)}>Salvează apelul</Button>
            {onNext && <Button type="button" disabled={!outcome || callbackInvalid || busy === "save"} onClick={() => save(true)}>Salvează și următoarea</Button>}
          </div>
        </div>
      )}
    </Modal>
  )
}

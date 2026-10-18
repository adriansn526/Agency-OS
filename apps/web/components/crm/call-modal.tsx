"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { MessageSquare, Phone } from "lucide-react"
import { Modal } from "@/components/modal"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { fmtTimer, OUTCOMES, quickCallbacks, telHref, toLocalInput, type OutcomeValue } from "./call-utils"

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
  const [callback, setCallback] = useState("")
  const [notes, setNotes] = useState("")
  const [elapsed, setElapsed] = useState(0)
  const [running, setRunning] = useState(false)
  const [templateId, setTemplateId] = useState("")
  const [sms, setSms] = useState<{ text: string; length: number; blockers: string[]; alreadySent: boolean } | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  // load the lead and the SMS templates each time the modal opens for a lead; start from a clean form
  useEffect(() => {
    if (!open || !leadId) return
    setOutcome(null); setCallback(""); setNotes(""); setElapsed(0); setRunning(false); setSms(null); setTemplateId(""); setLead(null)
    call(`/api/leads/${leadId}`).then((l) => {
      setLead(l)
      const cf = (l.customFields ?? {}) as Record<string, string>
      setConsentSms(cf.acord_sms === "da" || cf.acord_sms === "nu" ? cf.acord_sms : ""); setConsentEmail(cf.acord_email === "da" || cf.acord_email === "nu" ? cf.acord_email : "")
    }).catch(() => toast.error("Nu am putut încărca firma"))
    call(`/api/marketing/templates?businessLine=${encodeURIComponent(lineSlug)}&channel=sms`).then((t: any) => setTemplates(Array.isArray(t) ? t : [])).catch(() => setTemplates([]))
  }, [open, leadId, lineSlug])

  useEffect(() => {
    if (running) timer.current = setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => { if (timer.current) clearInterval(timer.current) }
  }, [running])

  const loadSms = useCallback(async (id: string) => {
    if (!leadId || !id) { setSms(null); return }
    try { setSms(await call(`/api/crm/calls/${leadId}/sms?templateId=${encodeURIComponent(id)}`)) } catch { setSms(null) }
  }, [leadId])
  // the consent may have just changed in this form: the server decides, so refresh the preview after saving the call (see save) and on template change
  useEffect(() => { if (templateId) void loadSms(templateId) }, [templateId, loadSms])

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
      toast.success("SMS trimis"); await loadSms(templateId); onSaved?.()
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
                <Phone size={14} /> Sună {p}
              </a>
            ))}
            <span className="ml-auto text-xs text-muted-foreground" aria-live="polite">Etapă: <b>{lead.status}</b>{lead.customFields?.rezultat_apel ? ` · ultimul rezultat: ${lead.customFields.rezultat_apel}` : ""}</span>
            {(running || elapsed > 0) && <span className="inline-flex items-center gap-1 text-sm font-mono" aria-label="Durata apelului"><span className={cn("h-2 w-2 rounded-full", running ? "bg-red-500 animate-pulse" : "bg-muted-foreground")} />{fmtTimer(elapsed)}
              <button type="button" className="ml-1 text-xs underline text-muted-foreground" onClick={() => setRunning((r) => !r)}>{running ? "Oprește" : "Reia"}</button></span>}
          </div>

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

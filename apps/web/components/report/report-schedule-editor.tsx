"use client"

import { useState } from "react"
import { Calendar, Save, Loader2, Mail, Users, FileText } from "lucide-react"

interface ReportScheduleEditorProps {
  reportId: string
  initialScheduleEnabled: boolean
  initialScheduleDay: number | null
  initialScheduleHour: number | null
  initialScheduleEmails: string | null
  initialScheduleMessage: string | null
  onSave?: (data: {
    scheduleEnabled: boolean
    scheduleDay: number | null
    scheduleHour: number | null
    scheduleEmails: string | null
    scheduleMessage: string | null
  }) => void
}

export function ReportScheduleEditor({
  reportId,
  initialScheduleEnabled,
  initialScheduleDay,
  initialScheduleHour,
  initialScheduleEmails,
  initialScheduleMessage,
  onSave
}: ReportScheduleEditorProps) {
  const [enabled, setEnabled] = useState(initialScheduleEnabled)
  const [day, setDay] = useState(initialScheduleDay || 1)
  const [hour, setHour] = useState(initialScheduleHour ?? 9)
  const [emails, setEmails] = useState(initialScheduleEmails || "")
  const [message, setMessage] = useState(initialScheduleMessage || "")
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/reports/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduleEnabled: enabled,
          scheduleDay: day,
          scheduleHour: hour,
          scheduleEmails: emails,
          scheduleMessage: message
        }),
      })
      if (res.ok) {
        setToast("✅ Setări programare salvate!")
        onSave?.({
          scheduleEnabled: enabled,
          scheduleDay: day,
          scheduleHour: hour,
          scheduleEmails: emails,
          scheduleMessage: message
        })
      } else {
        const json = await res.json()
        setToast(`❌ ${json.error || "Eroare la salvare"}`)
      }
    } catch (err: any) {
      setToast(`❌ ${err.message}`)
    } finally {
      setSaving(false)
      setTimeout(() => setToast(null), 4000)
    }
  }

  return (
    <div className="bg-surface rounded-xl border border-border overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-muted/20">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Calendar size={16} className="text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Programare Trimitere Lunară</h3>
            <p className="text-[10px] text-muted-foreground">
              Raportul se va trimite automat pentru luna anterioară completă.
            </p>
          </div>
        </div>
      </div>

      {toast && (
        <div className="px-5 py-2 bg-muted/30 border-b border-border text-xs text-foreground animate-fade-in">
          {toast}
        </div>
      )}

      <div className="p-5 space-y-4">
        {/* Toggle Switch */}
        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <p className="text-sm font-bold text-foreground">Trimitere Automată</p>
            <p className="text-[11px] text-muted-foreground">
              Activează pentru a trimite un raport lunar pe email.
            </p>
          </div>
          <div className="relative">
            <input
              type="checkbox"
              className="sr-only"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
            />
            <div className={`block w-12 h-6 rounded-full transition-colors ${enabled ? "bg-primary" : "bg-muted"}`}></div>
            <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${enabled ? "transform translate-x-6" : ""}`}></div>
          </div>
        </label>

        {enabled && (
          <div className="animate-fade-in space-y-4 border-t border-border pt-4">
            {/* Day of Month and Hour */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-1.5">
                  <Calendar size={12} /> Ziua din lună
                </label>
                <select
                  value={day}
                  onChange={(e) => setDay(Number(e.target.value))}
                  className="w-full px-3 py-2.5 bg-muted/20 border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>
                      Ziua {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-1.5">
                  <Calendar size={12} /> Ora (0-23)
                </label>
                <select
                  value={hour}
                  onChange={(e) => setHour(Number(e.target.value))}
                  className="w-full px-3 py-2.5 bg-muted/20 border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {Array.from({ length: 24 }, (_, i) => i).map((h) => (
                    <option key={h} value={h}>
                      Ora {h < 10 ? `0${h}:00` : `${h}:00`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              Raportul va fi trimis în ziua {day} a fiecărei luni, în jurul orei {hour < 10 ? `0${hour}:00` : `${hour}:00`}.
            </p>

            {/* Extra Emails */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-1.5">
                <Users size={12} /> Email-uri destinatari
              </label>
              <input
                type="text"
                value={emails}
                onChange={(e) => setEmails(e.target.value)}
                placeholder="client1@email.com, client2@email.com"
                className="w-full px-3 py-2.5 bg-muted/20 border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Dacă lași gol, se va trimite către adresa principală a clientului.
              </p>
            </div>

            {/* Custom Message */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-1.5">
                <FileText size={12} /> Mesaj Predefinit
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                placeholder="Acesta este raportul tău lunar..."
                className="w-full px-3 py-2.5 bg-muted/20 border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
            </div>
          </div>
        )}
      </div>

      <div className="px-5 py-3 bg-muted/10 border-t border-border flex items-center justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:opacity-90 disabled:opacity-50 transition-all"
        >
          {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
          Salvează Programare
        </button>
      </div>
    </div>
  )
}

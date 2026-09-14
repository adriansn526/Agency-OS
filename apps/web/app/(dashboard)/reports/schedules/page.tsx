"use client"

import { useEffect, useState } from "react"
import { Calendar, Loader2, ArrowLeft, RefreshCcw, Edit2, CheckCircle2, XCircle } from "lucide-react"
import Link from "next/link"
import { ReportScheduleEditor } from "@/components/report/report-schedule-editor"
import { cn } from "@/lib/utils"

type Schedule = {
  id: string
  title: string
  domain: string
  scheduleEnabled: boolean
  scheduleDay: number
  scheduleHour: number | null
  scheduleEmails: string
  scheduleMessage: string
  client: { companyName: string }
}

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)

  const fetchSchedules = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/reports/schedules")
      const json = await res.json()
      if (json.success) {
        setSchedules(json.data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSchedules()
  }, [])

  const toggleSchedule = async (id: string, currentStatus: boolean) => {
    setSchedules(s => s.map(sch => sch.id === id ? { ...sch, scheduleEnabled: !currentStatus } : sch))
    try {
      await fetch(`/api/reports/schedules/${id}/toggle`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduleEnabled: !currentStatus })
      })
    } catch (e) {
      // Revert on error
      setSchedules(s => s.map(sch => sch.id === id ? { ...sch, scheduleEnabled: currentStatus } : sch))
    }
  }

  const activeSchedules = schedules.filter(s => s.scheduleEnabled)
  const inactiveSchedules = schedules.filter(s => !s.scheduleEnabled)

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/reports" className="p-2 hover:bg-muted/50 rounded-lg transition-colors border border-transparent hover:border-border">
            <ArrowLeft size={18} className="text-muted-foreground" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Calendar size={22} className="text-primary" />
              Programări Rapoarte
            </h1>
            <p className="text-sm text-muted-foreground">Gestionează automatizările lunare pentru trimiterea rapoartelor</p>
          </div>
        </div>
        <button
          onClick={fetchSchedules}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-surface border border-border rounded-lg text-sm font-semibold hover:bg-muted/30 transition-colors"
        >
          <RefreshCcw size={14} className={loading ? "animate-spin" : ""} />
          Actualizează
        </button>
      </div>

      {loading && schedules.length === 0 ? (
        <div className="bg-surface rounded-xl border border-border p-16 text-center">
          <Loader2 size={32} className="animate-spin text-primary mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Se încarcă programările...</p>
        </div>
      ) : (
        <div className="bg-surface rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  <th className="text-left px-5 py-3 text-muted-foreground font-semibold">Client / Domeniu</th>
                  <th className="text-left px-5 py-3 text-muted-foreground font-semibold">Când se trimite</th>
                  <th className="text-left px-5 py-3 text-muted-foreground font-semibold">Destinatari</th>
                  <th className="text-center px-5 py-3 text-muted-foreground font-semibold">Status</th>
                  <th className="text-right px-5 py-3 text-muted-foreground font-semibold">Acțiuni</th>
                </tr>
              </thead>
              <tbody>
                {schedules.map((schedule) => (
                  <tr key={schedule.id} className="border-b border-border/50 hover:bg-muted/10 transition-colors">
                    <td className="px-5 py-4">
                      <p className="font-bold text-foreground">{schedule.title || "Raport Performanță"}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{schedule.client.companyName} · {schedule.domain}</p>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 text-foreground font-medium">
                        <Calendar size={14} className="text-muted-foreground" />
                        Ziua {schedule.scheduleDay} la {schedule.scheduleHour ? `${schedule.scheduleHour}:00` : "ora 08:00"}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-xs text-foreground max-w-[200px] truncate" title={schedule.scheduleEmails}>
                        {schedule.scheduleEmails.split(",").length} adrese email
                      </p>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <button
                        onClick={() => toggleSchedule(schedule.id, schedule.scheduleEnabled)}
                        className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all border",
                          schedule.scheduleEnabled 
                            ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20" 
                            : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100 dark:bg-gray-500/10 dark:text-gray-400 dark:border-gray-500/20"
                        )}
                      >
                        {schedule.scheduleEnabled ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                        {schedule.scheduleEnabled ? "Activ" : "Inactiv"}
                      </button>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => setEditingId(editingId === schedule.id ? null : schedule.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg text-xs font-semibold transition-colors"
                      >
                        <Edit2 size={14} />
                        Editează
                      </button>
                    </td>
                  </tr>
                ))}
                
                {/* Editing Modal Expansion (Inline) */}
                {schedules.map((schedule) => editingId === schedule.id && (
                  <tr key={`edit-${schedule.id}`} className="bg-muted/10 border-b-2 border-primary/20">
                    <td colSpan={5} className="p-0">
                      <div className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-bold text-foreground">Editare cron: {schedule.domain}</h3>
                          <button onClick={() => setEditingId(null)} className="p-1 hover:bg-muted/50 rounded-lg text-muted-foreground">
                            <XCircle size={18} />
                          </button>
                        </div>
                        <div className="bg-surface rounded-xl border border-border overflow-hidden">
                          <ReportScheduleEditor
                            reportId={schedule.id}
                            initialScheduleEnabled={schedule.scheduleEnabled}
                            initialScheduleDay={schedule.scheduleDay}
                            initialScheduleHour={schedule.scheduleHour}
                            initialScheduleEmails={schedule.scheduleEmails}
                            initialScheduleMessage={schedule.scheduleMessage}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-4 text-center">
                          Atenție: Orice salvare în acest panou se aplică imediat pentru raportul respectiv. Nu uita să reîncarci pagina dacă vrei să vezi noile date în tabel.
                        </p>
                      </div>
                    </td>
                  </tr>
                ))}
                
                {schedules.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-muted-foreground">
                      Nicio programare găsită.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

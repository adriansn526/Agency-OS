"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { X, Phone, Clock, User, Building2, FileText } from "lucide-react"
import type { CallResult } from "@repo/mock-data"

interface CallLogModalProps {
  open: boolean
  onClose: () => void
  onSave: (entry: {
    clientName: string
    phone: string
    callResult: CallResult
    duration: number
    notes: string
  }) => void
}

const callResults: { value: CallResult; label: string; emoji: string }[] = [
  { value: "answered", label: "Răspuns", emoji: "✅" },
  { value: "no_answer", label: "Nu a răspuns", emoji: "❌" },
  { value: "busy", label: "Ocupat", emoji: "⏳" },
  { value: "voicemail", label: "Voicemail", emoji: "📟" },
]

export function CallLogModal({ open, onClose, onSave }: CallLogModalProps) {
  const [clientName, setClientName] = useState("")
  const [phone, setPhone] = useState("")
  const [callResult, setCallResult] = useState<CallResult>("answered")
  const [notes, setNotes] = useState("")
  const [timerRunning, setTimerRunning] = useState(false)
  const [duration, setDuration] = useState(0)

  // Timer
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (timerRunning) {
      interval = setInterval(() => setDuration(d => d + 1), 1000)
    }
    return () => clearInterval(interval)
  }, [timerRunning])

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const handleSave = () => {
    onSave({
      clientName,
      phone,
      callResult,
      duration: Math.round(duration / 60) || 1,
      notes,
    })
    // Reset
    setClientName("")
    setPhone("")
    setCallResult("answered")
    setNotes("")
    setDuration(0)
    setTimerRunning(false)
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface border border-border rounded-2xl w-full max-w-md mx-4 shadow-2xl animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Phone size={14} className="text-emerald-400" />
            Înregistrare Apel
          </h3>
          <button onClick={onClose} className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <X size={12} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Timer */}
          <div className="flex items-center justify-center gap-4">
            <div className="text-center">
              <p className={cn("text-3xl font-mono font-bold", timerRunning ? "text-emerald-400" : "text-foreground")}>{formatTimer(duration)}</p>
              <p className="text-[10px] text-muted-foreground uppercase">Durată</p>
            </div>
            <button
              onClick={() => setTimerRunning(!timerRunning)}
              className={cn("px-4 py-2 rounded-lg text-xs font-bold transition-all",
                timerRunning ? "bg-red-500/10 text-red-400 hover:bg-red-500/20" : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
              )}
            >
              {timerRunning ? "⏸ Stop" : "▶ Start"}
            </button>
          </div>

          {/* Client */}
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase block mb-1">Client</label>
            <div className="relative">
              <Building2 size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={clientName}
                onChange={e => setClientName(e.target.value)}
                placeholder="Nume client..."
                className="w-full pl-8 pr-3 py-2 bg-muted/30 border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase block mb-1">Telefon</label>
            <div className="relative">
              <Phone size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+40..."
                className="w-full pl-8 pr-3 py-2 bg-muted/30 border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
            </div>
          </div>

          {/* Result */}
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase block mb-1">Rezultat</label>
            <div className="grid grid-cols-2 gap-2">
              {callResults.map(r => (
                <button
                  key={r.value}
                  onClick={() => setCallResult(r.value)}
                  className={cn(
                    "px-3 py-2 rounded-lg text-xs font-medium border transition-all flex items-center gap-1.5",
                    callResult === r.value ? "bg-primary/10 text-primary border-primary/30" : "bg-muted/20 text-muted-foreground border-border hover:border-border/80"
                  )}
                >{r.emoji} {r.label}</button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase block mb-1">Note</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Note despre apel..."
              rows={3}
              className="w-full px-3 py-2 bg-muted/30 border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 pt-0 flex items-center gap-2">
          <button onClick={onClose} className="flex-1 px-4 py-2 text-xs font-medium rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 transition-colors">
            Anulează
          </button>
          <button
            onClick={handleSave}
            disabled={!clientName}
            className="flex-1 px-4 py-2 text-xs font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40"
          >
            💾 Salvează Apelul
          </button>
        </div>
      </div>
    </div>
  )
}

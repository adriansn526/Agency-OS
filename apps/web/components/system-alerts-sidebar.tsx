"use client"

import { useEffect, useState } from "react"
import { X, Bell, ExternalLink, Check, Trash2, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface SystemAlert {
  id: string
  title: string
  description: string
  url: string | null
  domain: string | null
  status: string
  severity: string
  createdAt: string
}

export function SystemAlertsSidebar({ open, onClose, onAlertsChange }: { open: boolean; onClose: () => void; onAlertsChange?: (count: number) => void }) {
  const [alerts, setAlerts] = useState<SystemAlert[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      fetchAlerts()
    }
  }, [open])

  const fetchAlerts = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/alerts")
      const data = await res.json()
      if (data.success) {
        setAlerts(data.alerts)
        if (onAlertsChange) onAlertsChange(data.alerts.length)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const markAsResolved = async (id: string) => {
    try {
      await fetch(`/api/alerts/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "resolved" }),
        headers: { "Content-Type": "application/json" }
      })
      fetchAlerts()
    } catch (err) {
      console.error(err)
    }
  }

  if (!open) return null

  return (
    <>
      <div 
        className="fixed inset-0 bg-background/20 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />
      <div className="fixed inset-y-0 right-0 w-full sm:w-[400px] bg-surface border-l border-border shadow-2xl flex flex-col z-50 animate-in slide-in-from-right duration-300">
        <div className="h-14 flex items-center justify-between px-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <Bell size={18} className="text-primary" />
            <h2 className="font-semibold text-foreground">Alerte Sistem</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="text-center text-sm text-muted-foreground mt-10">Se încarcă alertele...</div>
          ) : alerts.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground mt-10 flex flex-col items-center">
              <AlertCircle size={32} className="opacity-20 mb-3" />
              Nu există alerte noi.
            </div>
          ) : (
            alerts.map((alert) => (
              <div key={alert.id} className="p-3 rounded-lg border border-border bg-card shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm text-foreground truncate">{alert.title}</h3>
                    {alert.domain && (
                      <p className="text-xs text-muted-foreground mt-1 font-medium">Domeniu: {alert.domain}</p>
                    )}
                    {alert.description && (
                      <div className="text-xs text-muted-foreground mt-2 leading-relaxed bg-muted/30 p-2 rounded border border-border/50 line-clamp-4">
                        {alert.description}
                      </div>
                    )}
                    <div className="text-[10px] text-muted-foreground mt-3">
                      {new Date(alert.createdAt).toLocaleString("ro-RO")}
                    </div>
                  </div>
                </div>
                
                <div className="mt-3 pt-3 border-t border-border flex items-center justify-between gap-2">
                  {alert.url ? (
                    <a 
                      href={alert.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs flex items-center gap-1 text-primary hover:underline"
                    >
                      Vezi în PostHog <ExternalLink size={12} />
                    </a>
                  ) : <div />}
                  <button 
                    onClick={() => markAsResolved(alert.id)}
                    className="text-xs flex items-center gap-1.5 px-2 py-1 rounded bg-muted hover:bg-emerald-500/10 hover:text-emerald-500 transition-colors"
                  >
                    <Check size={14} /> Resolvă
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  )
}

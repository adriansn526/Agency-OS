import { useState, useEffect } from "react"
import { AlertTriangle, Bug, Loader2, MousePointerClick, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"

export function ClientWebsiteHealthTab({ clientId }: { clientId: string }) {
  const [data, setData] = useState<{
    exceptions: { message: string, count: number, sessionId: string }[],
    rageClicks: { url: string, count: number, sessionId: string }[]
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch(`/api/clients/${clientId}/website-health`)
      .then(r => r.json())
      .then(j => {
        if (j.error) setError(true)
        else setData(j.data)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [clientId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 bg-surface rounded-xl border border-border">
        <Loader2 className="animate-spin text-primary" size={24} />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center bg-surface rounded-xl border border-border">
        <AlertTriangle className="mx-auto text-amber-500 mb-3" size={32} />
        <h3 className="text-foreground font-semibold">Nu am putut încărca datele</h3>
        <p className="text-sm text-muted-foreground">Verifică conexiunea PostHog sau dacă domeniul este configurat.</p>
      </div>
    )
  }

  const hasData = data.exceptions.length > 0 || data.rageClicks.length > 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Bug className="text-red-400" />
          Website Health & UX Issues (Ultimile 7 zile)
        </h2>
      </div>

      {!hasData && (
        <div className="p-8 text-center bg-surface rounded-xl border border-border">
          <p className="text-muted-foreground text-sm">Nu s-au înregistrat erori sau rage clicks în ultimele 7 zile. Site-ul funcționează perfect! 🎉</p>
        </div>
      )}

      {data.exceptions.length > 0 && (
        <div className="bg-surface rounded-xl border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border bg-red-500/5">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Bug size={16} className="text-red-400" /> Erori JavaScript
            </h3>
          </div>
          <div className="divide-y divide-border">
            {data.exceptions.map((err, idx) => (
              <div key={idx} className="p-4 flex items-start justify-between gap-4 hover:bg-muted/30 transition-colors">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate" title={err.message}>
                    {err.message}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    A apărut de <strong className="text-foreground">{err.count} ori</strong>
                  </p>
                </div>
                {err.sessionId && (
                  <a
                    href={`https://eu.posthog.com/project/current/replay/${err.sessionId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors"
                  >
                    <ExternalLink size={12} /> Replay Sesiune
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {data.rageClicks.length > 0 && (
        <div className="bg-surface rounded-xl border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border bg-amber-500/5">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <MousePointerClick size={16} className="text-amber-400" /> Rage Clicks (Probleme UX)
            </h3>
          </div>
          <div className="divide-y divide-border">
            {data.rageClicks.map((click, idx) => (
              <div key={idx} className="p-4 flex items-start justify-between gap-4 hover:bg-muted/30 transition-colors">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate" title={click.url}>
                    {click.url}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Utilizatorii au dat click disperat de <strong className="text-foreground">{click.count} ori</strong>
                  </p>
                </div>
                {click.sessionId && (
                  <a
                    href={`https://eu.posthog.com/project/current/replay/${click.sessionId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors"
                  >
                    <ExternalLink size={12} /> Replay Sesiune
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

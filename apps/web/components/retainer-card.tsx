"use client"

import { useState } from "react"
import Link from "next/link"
import type { Retainer } from "@repo/mock-data"
import { cn, formatCurrency, formatDate } from "@/lib/utils"
import { ChevronDown, ChevronUp, Calendar, Clock, AlertTriangle, ExternalLink } from "lucide-react"

export function RetainerCard({ retainer }: { retainer: Retainer }) {
  const [expanded, setExpanded] = useState(false)

  const statusConfig: Record<string, { label: string; class: string; dot: string }> = {
    activ: { label: "Activ", class: "bg-emerald-500/10 text-emerald-400", dot: "bg-emerald-400" },
    inactiv: { label: "Inactiv", class: "bg-muted text-muted-foreground", dot: "bg-muted-foreground" },
    expirat: { label: "Expirat", class: "bg-red-500/10 text-red-400", dot: "bg-red-400" },
    paused: { label: "Pauzat", class: "bg-amber-500/10 text-amber-400", dot: "bg-amber-400" },
    cancelled: { label: "Anulat", class: "bg-red-500/10 text-red-400", dot: "bg-red-400" },
  }

  const paymentConfig: Record<string, { label: string; class: string; icon: string }> = {
    la_zi: { label: "La zi", class: "text-emerald-400 bg-emerald-500/10", icon: "✓" },
    restanta: { label: "Restanță", class: "text-red-400 bg-red-500/10", icon: "!" },
  }

  const serviceStatusColors: Record<string, string> = {
    active: "bg-emerald-400",
    paused: "bg-amber-400",
    completed: "bg-muted-foreground",
  }

  const sc = statusConfig[retainer.status] ?? statusConfig.activ!
  const pc = paymentConfig[retainer.paymentStatus] ?? paymentConfig.la_zi!
  const activeServices = retainer.includedServices.filter(s => s.status === 'active').length
  const totalServices = retainer.includedServices.length

  return (
    <div className={cn(
      "bg-surface rounded-xl border transition-all",
      retainer.paymentStatus === 'restanta' ? "border-red-500/30" : "border-border",
      "hover:border-primary/20"
    )}>
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-4 flex items-center justify-between cursor-pointer select-none"
      >
        <div className="flex items-center gap-3">
          <div className={cn("w-2 h-2 rounded-full", sc.dot)} />
          <div className="text-left">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              {retainer.name}
              <span className={cn("text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full", sc.class)}>
                {sc.label}
              </span>
            </h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {activeServices}/{totalServices} servicii active • Start: {formatDate(retainer.startDate)}
              {retainer.minimumPeriod && ` • Min: ${retainer.minimumPeriod}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-lg font-bold text-primary">{formatCurrency(retainer.monthlyAmount, false, retainer.currency)}</p>
            <span className="text-[10px] text-muted-foreground">/lună</span>
          </div>
          <span className={cn("text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full", pc.class)}>
            {pc.icon} {pc.label}
          </span>
          {expanded ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
        </div>
      </button>

      {/* Expanded — service details */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-border/30 pt-3 space-y-3">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Servicii incluse</p>
          <div className="space-y-2">
            {retainer.includedServices.map(s => (
              <div key={s.id} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-2">
                  <span className={cn("w-2 h-2 rounded-full", serviceStatusColors[s.status] ?? "bg-muted-foreground")} />
                  <span className="text-sm text-foreground">{s.serviceName}</span>
                  <span className="text-[9px] uppercase font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{s.serviceType.replace('_', ' ')}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-foreground">{formatCurrency(s.individualPrice, false, retainer.currency)}</span>
                  <Link
                    href={`/projects/${s.projectId}`}
                    className="text-[10px] font-medium text-primary hover:underline flex items-center gap-0.5"
                  >
                    Proiect <ExternalLink size={10} />
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Footer details */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t border-border/20">
            <span className="flex items-center gap-1"><Calendar size={10} /> Facturat ziua: {retainer.billingDay || '—'}</span>
            {retainer.nextInvoiceDate && <span className="flex items-center gap-1"><Clock size={10} /> Următoarea: {formatDate(retainer.nextInvoiceDate)}</span>}
            {retainer.paymentStatus === 'restanta' && (
              <span className="flex items-center gap-1 text-red-400"><AlertTriangle size={10} /> Plată restantă!</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/** Grid of retainer cards */
export function RetainerGrid({ retainers }: { retainers: Retainer[] }) {
  const active = retainers.filter(r => r.status === 'activ')
  const inactive = retainers.filter(r => r.status !== 'activ')

  return (
    <div className="space-y-4">
      {active.length > 0 && (
        <div className="space-y-2">
          {active.map(r => <RetainerCard key={r.id} retainer={r} />)}
        </div>
      )}
      {inactive.length > 0 && (
        <>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-2">Inactiv / Expirat</p>
          <div className="space-y-2 opacity-60">
            {inactive.map(r => <RetainerCard key={r.id} retainer={r} />)}
          </div>
        </>
      )}
    </div>
  )
}

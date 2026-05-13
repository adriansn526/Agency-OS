"use client"

import Link from "next/link"
import { X, Mail, Phone, Globe, Calendar, ExternalLink, Building2, ArrowUpRight } from "lucide-react"
import { cn, formatCurrency, formatDate, getInitials } from "@/lib/utils"
import type { Client, Lead } from "@repo/mock-data"

type PanelData =
  | { type: "client"; data: Client }
  | { type: "lead"; data: Lead }
  | null

interface ContextualPanelProps {
  panelData: PanelData
  onClose: () => void
}

export function ContextualPanel({ panelData, onClose }: ContextualPanelProps) {
  if (!panelData) return null

  const fullPageHref = panelData.type === "lead"
    ? `/crm/lead-uri/${panelData.data.id}`
    : `/crm/clienti/${panelData.data.id}`

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 md:hidden"
        onClick={onClose}
      />

      {/* Panel */}
      <aside
        className={cn(
          "fixed md:relative right-0 top-0 h-full z-50 md:z-auto",
          "w-[85vw] sm:w-96 md:w-80 lg:w-96",
          "bg-surface border-l border-border",
          "flex flex-col animate-slide-in-right",
          "shadow-lg md:shadow-none"
        )}
      >
        {/* Panel header */}
        <div className="flex items-center justify-between h-14 px-4 border-b border-border flex-shrink-0">
          <h3 className="text-sm font-semibold text-foreground">
            {panelData.type === "client" ? "Detalii Client" : "Detalii Lead"}
          </h3>
          <div className="flex items-center gap-1">
            <Link
              href={fullPageHref}
              onClick={onClose}
              className="w-7 h-7 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
              title="Deschide pagina completă"
            >
              <ArrowUpRight size={15} />
            </Link>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Închide panoul"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Panel content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {panelData.type === "client" && <ClientDetail client={panelData.data} />}
          {panelData.type === "lead" && <LeadDetail lead={panelData.data} />}
        </div>

        {/* Bottom action bar */}
        <div className="px-4 py-3 border-t border-border flex-shrink-0">
          <Link
            href={fullPageHref}
            onClick={onClose}
            className="flex items-center justify-center gap-1.5 w-full px-3 py-2 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <ArrowUpRight size={13} /> Deschide Pagina Completă
          </Link>
        </div>
      </aside>
    </>
  )
}

function ClientDetail({ client }: { client: Client }) {
  return (
    <div className="space-y-5 animate-fade-in">
      {/* Avatar + Company */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-sm font-bold text-primary border border-primary/10">
          {getInitials(client.companyName)}
        </div>
        <div>
          <h4 className="text-sm font-semibold text-foreground">{client.companyName}</h4>
          <p className="text-xs text-muted-foreground">{client.industry}</p>
        </div>
      </div>

      {/* Status */}
      <div className="flex items-center gap-2">
        <StatusBadgeSmall status={client.status} />
        <span className="text-xs text-muted-foreground">CUI: {client.cui}</span>
      </div>

      {/* Contact info */}
      <div className="space-y-2.5">
        <SectionLabel>Contact</SectionLabel>
        <InfoRow icon={<Building2 size={14} />} label={client.contactPerson} />
        <InfoRow icon={<Mail size={14} />} label={client.email} href={`mailto:${client.email}`} />
        <InfoRow icon={<Phone size={14} />} label={client.phone} href={`tel:${client.phone}`} />
        {client.website && (
          <InfoRow icon={<Globe size={14} />} label={client.website.replace(/https?:\/\//, '')} href={client.website} external />
        )}
      </div>

      {/* Financial */}
      <div className="space-y-2.5">
        <SectionLabel>Financiar</SectionLabel>
        <div className="bg-muted/50 rounded-lg p-3 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Venit lunar</span>
          <span className="text-sm font-semibold text-foreground">{formatCurrency(client.monthlyRevenue)}</span>
        </div>
        <InfoRow icon={<Calendar size={14} />} label={`Contract din ${formatDate(client.contractStartDate)}`} />
      </div>

      {/* Services */}
      {client.services.length > 0 && (
        <div className="space-y-2.5">
          <SectionLabel>Servicii Active</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {client.services.map((s) => (
              <span key={s} className="px-2 py-1 text-[11px] font-medium bg-primary/10 text-primary rounded-md">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {client.notes && (
        <div className="space-y-2.5">
          <SectionLabel>Note</SectionLabel>
          <p className="text-xs text-muted-foreground leading-relaxed bg-muted/30 rounded-lg p-3">
            {client.notes}
          </p>
        </div>
      )}
    </div>
  )
}

function LeadDetail({ lead }: { lead: Lead }) {
  return (
    <div className="space-y-5 animate-fade-in">
      {/* Avatar + Company */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-warning/20 to-destructive/20 flex items-center justify-center text-sm font-bold text-warning border border-warning/10">
          {getInitials(lead.companyName)}
        </div>
        <div>
          <h4 className="text-sm font-semibold text-foreground">{lead.companyName}</h4>
          <p className="text-xs text-muted-foreground">{lead.contactPerson}</p>
        </div>
      </div>

      {/* Status + Priority */}
      <div className="flex items-center gap-2">
        <LeadStatusBadge status={lead.status} />
        <PriorityBadge priority={lead.priority} />
      </div>

      {/* Contact info */}
      <div className="space-y-2.5">
        <SectionLabel>Contact</SectionLabel>
        <InfoRow icon={<Mail size={14} />} label={lead.email} href={`mailto:${lead.email}`} />
        {lead.phone && (
          <InfoRow icon={<Phone size={14} />} label={lead.phone} href={`tel:${lead.phone}`} />
        )}
      </div>

      {/* Deal info */}
      <div className="space-y-2.5">
        <SectionLabel>Deal</SectionLabel>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-[11px] text-muted-foreground">Valoare</p>
            <p className="text-sm font-semibold text-foreground">{formatCurrency(lead.estimatedValue)}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-[11px] text-muted-foreground">Probabilitate</p>
            <p className="text-sm font-semibold text-foreground">{lead.probability}%</p>
          </div>
        </div>
        <div className="bg-muted/50 rounded-lg p-3 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Sursă</span>
          <span className="text-xs font-medium text-foreground capitalize">{lead.source.replace('_', ' ')}</span>
        </div>
        <div className="bg-muted/50 rounded-lg p-3 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Asignat</span>
          <span className="text-xs font-medium text-foreground">{lead.assignedTo}</span>
        </div>
      </div>

      {/* Next action */}
      {lead.nextAction && (
        <div className="space-y-2.5">
          <SectionLabel>Următoarea Acțiune</SectionLabel>
          <div className="bg-primary/5 border border-primary/10 rounded-lg p-3">
            <p className="text-xs font-medium text-foreground">{lead.nextAction}</p>
            {lead.nextActionDate && (
              <p className="text-[11px] text-muted-foreground mt-1">
                📅 {formatDate(lead.nextActionDate)}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Notes */}
      {lead.notes && (
        <div className="space-y-2.5">
          <SectionLabel>Note</SectionLabel>
          <p className="text-xs text-muted-foreground leading-relaxed bg-muted/30 rounded-lg p-3">
            {lead.notes}
          </p>
        </div>
      )}
    </div>
  )
}

/* ============================================================
   Shared micro-components
   ============================================================ */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
      {children}
    </p>
  )
}

function InfoRow({
  icon,
  label,
  href,
  external,
}: {
  icon: React.ReactNode
  label: string
  href?: string
  external?: boolean
}) {
  const content = (
    <div className="flex items-center gap-2.5 text-xs group">
      <span className="text-muted-foreground flex-shrink-0">{icon}</span>
      <span className={cn("text-foreground-secondary", href && "group-hover:text-primary transition-colors")}>
        {label}
      </span>
      {external && <ExternalLink size={10} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />}
    </div>
  )

  if (href) {
    return (
      <a href={href} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined}>
        {content}
      </a>
    )
  }
  return content
}

function StatusBadgeSmall({ status }: { status: string }) {
  const styles: Record<string, string> = {
    activ: "bg-success/10 text-success",
    inactiv: "bg-muted text-muted-foreground",
    prospect: "bg-info/10 text-info",
  }
  return (
    <span className={cn("px-2 py-0.5 text-[11px] font-semibold rounded-full capitalize", styles[status] || "bg-muted text-muted-foreground")}>
      {status}
    </span>
  )
}

function LeadStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    nou: "bg-info/10 text-info",
    contactat: "bg-warning/10 text-warning",
    calificat: "bg-accent/10 text-accent",
    negociere: "bg-primary/10 text-primary",
    castigat: "bg-success/10 text-success",
    pierdut: "bg-destructive/10 text-destructive",
  }
  return (
    <span className={cn("px-2 py-0.5 text-[11px] font-semibold rounded-full capitalize", styles[status])}>
      {status}
    </span>
  )
}

function PriorityBadge({ priority }: { priority: string }) {
  const styles: Record<string, string> = {
    low: "bg-muted text-muted-foreground",
    medium: "bg-warning/10 text-warning",
    high: "bg-destructive/10 text-destructive",
    urgent: "bg-destructive text-white",
  }
  return (
    <span className={cn("px-2 py-0.5 text-[11px] font-semibold rounded-full capitalize", styles[priority])}>
      {priority}
    </span>
  )
}

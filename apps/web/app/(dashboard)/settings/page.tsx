"use client"

import Link from "next/link"
import { Settings, User, Palette, Shield, Database, Bell, Building2, Package, Bot } from "lucide-react"

const settingsSections = [
  { icon: <Building2 size={18} />, title: "Firmă Prestator", desc: "Denumire, CUI, adresă, IBAN, reprezentant legal — date preluate automat în contracte", href: "/settings/company", highlight: true },
  { icon: <Building2 size={18} />, title: "Business Lines", desc: "Gestionează liniile de business, entity types, și pipeline-uri", href: "/settings/business-lines", highlight: true },
  { icon: <Package size={18} />, title: "Catalog Servicii", desc: "Serviciile disponibile per linie de business, utilizate la crearea ofertelor", href: "/settings/services", highlight: true },
  { icon: <Bot size={18} />, title: "Integrări & AI", desc: "Configurare AI Provider (Gemini / OpenAI), chei API, Brand DNA, Content Generation", href: "/settings/integrations", highlight: true },
  { icon: <User size={18} />, title: "Profil", desc: "Informații cont, avatar, preferințe personale", href: "#" },
  { icon: <Palette size={18} />, title: "Aspect", desc: "Temă, layout, densitate informații", href: "#" },
  { icon: <Bell size={18} />, title: "Notificări", desc: "Canale de notificare, frecvență, filtre", href: "#" },
  { icon: <Shield size={18} />, title: "Securitate", desc: "Parolă, 2FA, sesiuni active", href: "#" },
  { icon: <Database size={18} />, title: "Date & Export", desc: "Backup, export CSV, integrări API", href: "#" },
]

export default function SettingsPage() {
  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-foreground">Setări</h1>
        <p className="text-sm text-muted-foreground">Configurare platformă, profil, și preferințe</p>
      </div>

      <div className="max-w-2xl space-y-2">
        {settingsSections.map((s) => (
          <Link
            key={s.title}
            href={s.href}
            className={`flex items-center gap-4 p-4 bg-surface rounded-xl border transition-all cursor-pointer group ${
              s.highlight
                ? "border-primary/30 hover:border-primary/50 hover:shadow-md"
                : "border-border hover:border-primary/20 hover:shadow-sm"
            }`}
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
              s.highlight
                ? "bg-primary/10 text-primary"
                : "bg-muted text-foreground-secondary group-hover:bg-primary/10 group-hover:text-primary"
            }`}>
              {s.icon}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{s.title}</p>
              <p className="text-xs text-muted-foreground">{s.desc}</p>
            </div>
            <svg className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </Link>
        ))}
      </div>
    </div>
  )
}

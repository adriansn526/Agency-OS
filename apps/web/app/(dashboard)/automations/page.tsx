"use client"

import { Zap, GitBranch, Bell, Webhook } from "lucide-react"

const automations = [
  { icon: <GitBranch size={18} />, title: "Lead → Contract", desc: "Când lead-ul devine Câștigat, generează automat contractul SEO", trigger: "Lead Status = Câștigat", active: false },
  { icon: <Bell size={18} />, title: "Contract Expirare", desc: "Alertă cu 30 zile înainte de expirarea oricărui contract", trigger: "Data expirare - 30 zile", active: false },
  { icon: <Bell size={18} />, title: "Factură Restantă", desc: "Notificare automată la >15 zile de la scadență", trigger: "Factură restantă > 15 zile", active: false },
  { icon: <Webhook size={18} />, title: "Webhook SmartBill", desc: "Sincronizare automată a facturilor emise cu SmartBill", trigger: "Factură emisă", active: false },
  { icon: <GitBranch size={18} />, title: "Lead Follow-up", desc: "Email automat de follow-up la 3 zile dacă lead-ul nu a răspuns", trigger: "Lead fără răspuns > 3 zile", active: false },
]

export default function AutomationsPage() {
  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-foreground">Automatizări & Workflows</h1>
        <p className="text-sm text-muted-foreground">Reguli automate, alerte, și webhooks pentru integrări externe</p>
      </div>

      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border bg-muted/30 flex items-center justify-between">
          <span className="text-xs font-semibold text-foreground">Workflows Planificate</span>
          <span className="text-[10px] text-muted-foreground">{automations.length} reguli</span>
        </div>
        <div className="divide-y divide-border/50">
          {automations.map((a) => (
            <div key={a.title} className="flex items-center gap-4 px-4 py-3.5 hover:bg-muted/20 transition-colors">
              <div className="w-9 h-9 rounded-lg bg-warning/10 flex items-center justify-center text-warning flex-shrink-0">{a.icon}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{a.title}</p>
                <p className="text-[11px] text-muted-foreground">{a.desc}</p>
              </div>
              <div className="hidden sm:block">
                <span className="text-[10px] px-2 py-1 bg-muted rounded-md text-muted-foreground font-mono">{a.trigger}</span>
              </div>
              <div className="w-9 h-5 bg-muted rounded-full relative flex-shrink-0 cursor-not-allowed">
                <div className="absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-muted-foreground/30 transition-all" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="text-center py-4">
        <span className="px-4 py-1.5 text-xs font-semibold bg-warning/10 text-warning rounded-full">Coming Soon — Faza 3</span>
      </div>
    </div>
  )
}

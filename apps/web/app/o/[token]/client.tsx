"use client"

import { useState } from "react"
import { formatCurrency, cn } from "@/lib/utils"
import { Check, CheckCircle2, Shield, Calendar, Package } from "lucide-react"

export default function PublicOfferClient({
  delivery,
  offer,
  companySettings,
}: {
  delivery: any
  offer: any
  companySettings: any
}) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [accepting, setAccepting] = useState(false)
  const [accepted, setAccepted] = useState(delivery.clientResponse === "accepted")
  const [error, setError] = useState("")

  const modules = Array.isArray(offer.modules) ? offer.modules : []

  const handleAccept = async () => {
    if (!name.trim() || !email.trim()) {
      setError("Te rugăm să completezi numele și adresa de email.")
      return
    }
    setError("")
    setAccepting(true)

    try {
      const res = await fetch("/api/public/offers/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: delivery.token,
          name,
          email,
        }),
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || "Eroare la acceptarea ofertei.")
      }

      setAccepted(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setAccepting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-surface/80 backdrop-blur-md border-b border-border">
        <div className="max-w-4xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold">
              {companySettings?.legalName?.charAt(0) || offer.businessLine?.name?.charAt(0) || "A"}
            </div>
            <div>
              <p className="text-sm font-bold leading-tight">{companySettings?.legalName || offer.businessLine?.name}</p>
              <p className="text-[10px] text-muted-foreground leading-tight">Ofertă Comercială</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-primary">{formatCurrency(offer.value, offer.currency)}</p>
            <p className="text-[10px] text-muted-foreground">{offer.number}</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 md:px-6 py-8 md:py-12 space-y-8">
        
        {/* Intro */}
        <section className="space-y-4">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Ofertă pentru {offer.entityName}</h1>
          {offer.templateName && (
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-muted rounded-full text-xs font-medium text-muted-foreground">
              <Package size={14} />
              {offer.templateName}
            </div>
          )}
          <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed">
            Aceasta este propunerea noastră detaliată. Te rugăm să o analizezi cu atenție. Dacă ești de acord cu termenii și serviciile incluse, poți accepta oferta în secțiunea de mai jos.
          </p>
        </section>

        {/* Services / Modules */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold flex items-center gap-2">Servicii Incluse</h2>
          <div className="grid gap-3">
            {modules.map((mod: any, idx: number) => (
              <div key={idx} className="bg-surface border border-border rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-sm">{mod.serviceName}</h3>
                  {mod.blocks && mod.blocks.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {mod.blocks.map((b: any, bIdx: number) => (
                        <li key={bIdx} className="text-xs text-muted-foreground flex items-start gap-1.5">
                          <Check size={12} className="text-primary mt-0.5 flex-shrink-0" />
                          <span>{b.title || "Detaliu serviciu"}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="text-right flex-shrink-0 bg-muted/50 p-3 rounded-xl border border-border/50">
                  <p className="text-sm font-bold text-foreground">
                    {formatCurrency(mod.price, offer.currency)}
                    <span className="text-[10px] text-muted-foreground font-normal ml-1">
                      {mod.pricingUnit === 'lunar' ? '/lună' : mod.pricingUnit === 'per_hour' ? '/oră' : ''}
                    </span>
                  </p>
                  {mod.setupFee > 0 && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">+ {formatCurrency(mod.setupFee, offer.currency)} setup</p>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          <div className="bg-surface border-2 border-border/60 rounded-2xl p-4 flex items-center justify-between shadow-sm">
            <span className="font-bold text-muted-foreground">Total Estimativ</span>
            <span className="text-xl font-bold text-primary">{formatCurrency(offer.value, offer.currency)}</span>
          </div>
        </section>

        {/* Action Area */}
        <section className="pt-8 border-t border-border">
          {accepted ? (
            <div className="bg-success/10 border-2 border-success/20 rounded-2xl p-6 text-center space-y-3">
              <CheckCircle2 size={32} className="text-success mx-auto" />
              <h2 className="text-lg font-bold text-success">Oferta a fost acceptată!</h2>
              <p className="text-sm text-success/80">
                Îți mulțumim pentru confirmare. Echipa noastră a fost notificată și te vom contacta în scurt timp cu pașii următori.
              </p>
            </div>
          ) : (
            <div className="bg-surface border border-border rounded-2xl p-6 md:p-8 space-y-6">
              <div className="flex items-start gap-3 text-muted-foreground">
                <Shield size={20} className="text-primary mt-1" />
                <div className="space-y-1">
                  <h3 className="font-bold text-foreground text-sm">Acceptă această ofertă</h3>
                  <p className="text-xs leading-relaxed">
                    Prin completarea datelor și apăsarea butonului de acceptare, confirmi că reprezinți compania <strong>{offer.entityName}</strong> și ești de acord cu implementarea serviciilor conform prețurilor de mai sus.
                  </p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase text-muted-foreground mb-1.5 block">Nume și Prenume *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ion Popescu"
                    className="w-full px-3 py-2.5 text-sm bg-muted/30 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-muted-foreground mb-1.5 block">Email *</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ion@companie.ro"
                    className="w-full px-3 py-2.5 text-sm bg-muted/30 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>

              {error && (
                <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 p-3 rounded-lg font-medium">
                  {error}
                </div>
              )}

              <button
                onClick={handleAccept}
                disabled={accepting}
                className={cn(
                  "w-full py-3 rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2",
                  accepting ? "bg-primary/50 text-primary-foreground cursor-wait" : "bg-primary text-primary-foreground hover:bg-primary-hover"
                )}
              >
                {accepting ? "Se confirmă..." : "Acceptă Oferta Comercială"}
              </button>
            </div>
          )}
        </section>

      </main>
      
      {/* Footer */}
      <footer className="border-t border-border mt-12 py-8 text-center text-xs text-muted-foreground">
        <p>© {new Date().getFullYear()} {companySettings?.legalName || offer.businessLine?.name}. Toate drepturile rezervate.</p>
        <div className="flex justify-center gap-4 mt-2">
          {companySettings?.cif && <span>CUI: {companySettings.cif}</span>}
          {companySettings?.regCom && <span>Reg. Com: {companySettings.regCom}</span>}
        </div>
      </footer>
    </div>
  )
}

"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowLeft, Plus, Trash2, Loader2, Zap, Save, X, Activity } from "lucide-react"

export default function CreditPackagesSettings() {
  const [packages, setPackages] = useState<any[]>([])
  const [rules, setRules] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [resPkg, resRules] = await Promise.all([
        fetch("/api/settings/credit-packages"),
        fetch("/api/settings/pricing-rules")
      ])
      const pkgData = await resPkg.json()
      const rulesData = await resRules.json()
      setPackages(pkgData)
      setRules(rulesData)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Sigur ștergi acest pachet?")) return
    try {
      await fetch(`/api/settings/credit-packages/${id}`, { method: "DELETE" })
      setPackages(packages.filter((p) => p.id !== id))
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/settings"
            className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-foreground">Pachete de Credite</h1>
            <p className="text-sm text-muted-foreground">Definește pachetele de Credite Universale pe care le vinzi tenanților.</p>
          </div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors shadow-sm"
        >
          <Plus size={16} /> Pachet Nou
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center p-8"><Loader2 className="animate-spin text-muted-foreground" /></div>
      ) : packages.length === 0 ? (
        <div className="text-center p-12 bg-surface border border-border rounded-xl">
          <p className="text-sm text-muted-foreground">Niciun pachet definit.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {packages.map((pkg) => (
            <div key={pkg.id} className="bg-surface rounded-xl border border-border p-5 relative group">
              <h3 className="font-bold text-foreground mb-1">{pkg.name}</h3>
              <p className="text-sm font-semibold text-emerald-500 mb-4">{pkg.priceEur} EUR</p>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span className="flex items-center gap-2"><Zap size={14} className="text-amber-500"/> Total Credite:</span>
                  <span className="font-bold text-foreground">{pkg.totalCredits?.toLocaleString() || 0}</span>
                </div>
              </div>

              <button
                onClick={() => handleDelete(pkg.id)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <NewPackageModal
          rules={rules}
          onClose={() => setShowModal(false)}
          onSave={(pkg) => {
            setPackages([pkg, ...packages])
            setShowModal(false)
          }}
        />
      )}
    </div>
  )
}

function NewPackageModal({ rules, onClose, onSave }: { rules: any[], onClose: () => void, onSave: (p: any) => void }) {
  const [formData, setFormData] = useState({
    name: "",
    priceEur: 0,
    totalCredits: 0
  })
  const [saving, setSaving] = useState(false)

  // Find universal credit base cost
  const universalRule = rules.find(r => r.serviceName === "universal_credit")
  const costPerCredit = universalRule ? universalRule.costPerUnitEur : 0.005

  const baseCost = formData.totalCredits * costPerCredit
  const profit = formData.priceEur - baseCost
  const isLoss = profit < 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isLoss) {
      if (!confirm("Atenție! Pachetul generează pierdere. Ești sigur că vrei să îl salvezi?")) return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/settings/credit-packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      })
      if (res.ok) {
        onSave(await res.json())
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-surface rounded-2xl border border-border w-full max-w-md mx-4 overflow-hidden shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/20">
          <h2 className="font-semibold text-foreground">Pachet Nou de Credite</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">Nume Pachet</label>
            <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm" placeholder="ex: Pro 100k Credits"/>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-amber-500 flex items-center gap-1 mb-1">
                <Zap size={12}/> Credite Incluse
              </label>
              <input type="number" required min="1" value={formData.totalCredits || ""} onChange={e => setFormData({...formData, totalCredits: Number(e.target.value)})} className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm" placeholder="10000"/>
            </div>
            <div>
              <label className="text-xs font-semibold text-emerald-500 block mb-1">Preț Vânzare (EUR)</label>
              <input type="number" required step="0.01" min="0" value={formData.priceEur || ""} onChange={e => setFormData({...formData, priceEur: Number(e.target.value)})} className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm" placeholder="50"/>
            </div>
          </div>

          <div className={`p-4 rounded-xl border ${isLoss ? 'bg-red-500/10 border-red-500/20' : 'bg-blue-500/10 border-blue-500/20'} space-y-2`}>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Cost Bază ({costPerCredit} €/credit):</span>
              <span className="font-medium text-foreground">{baseCost.toFixed(2)} EUR</span>
            </div>
            <div className="flex justify-between items-center text-sm font-bold pt-2 border-t border-border/50">
              <span className={isLoss ? 'text-red-500' : 'text-emerald-500'}>Profit / Marjă:</span>
              <span className={isLoss ? 'text-red-500' : 'text-emerald-500'}>{profit.toFixed(2)} EUR</span>
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Anulează</button>
            <button disabled={saving || !formData.name || !formData.totalCredits} type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm flex items-center gap-2 hover:opacity-90">
              {saving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>}
              Salvează Pachet
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

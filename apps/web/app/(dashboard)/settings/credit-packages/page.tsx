"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowLeft, Plus, Trash2, Loader2, AlertTriangle, Zap, MessageSquare, Phone, Save, X } from "lucide-react"

export default function CreditPackagesSettings() {
  const [packages, setPackages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    fetchPackages()
  }, [])

  const fetchPackages = async () => {
    try {
      const res = await fetch("/api/settings/credit-packages")
      const data = await res.json()
      setPackages(data)
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
            <p className="text-sm text-muted-foreground">Definește pachetele ce pot fi alocate tenanților (ex: AI Tokens, SMS)</p>
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
                  <span className="flex items-center gap-2"><Zap size={14} className="text-violet-400"/> AI Tokens:</span>
                  <span className="font-medium text-foreground">{pkg.tokensAi.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span className="flex items-center gap-2"><MessageSquare size={14} className="text-blue-400"/> SMS:</span>
                  <span className="font-medium text-foreground">{pkg.sms.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span className="flex items-center gap-2"><Phone size={14} className="text-amber-400"/> Voice Min:</span>
                  <span className="font-medium text-foreground">{pkg.voiceMin.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span className="flex items-center gap-2"><Phone size={14} className="text-green-400"/> Telefonie:</span>
                  <span className="font-medium text-foreground">{pkg.callsMin.toLocaleString()}</span>
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

function NewPackageModal({ onClose, onSave }: { onClose: () => void, onSave: (p: any) => void }) {
  const [formData, setFormData] = useState({
    name: "",
    priceEur: 0,
    tokensAi: 0,
    sms: 0,
    voiceMin: 0,
    callsMin: 0
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
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
      <div className="bg-surface rounded-2xl border border-border w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-semibold text-foreground">Pachet Nou</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">Nume Pachet</label>
            <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm" placeholder="ex: Boost 50k Tokens"/>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">Preț (EUR)</label>
            <input type="number" value={formData.priceEur} onChange={e => setFormData({...formData, priceEur: Number(e.target.value)})} className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm"/>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-violet-400 block mb-1">AI Tokens</label>
              <input type="number" value={formData.tokensAi} onChange={e => setFormData({...formData, tokensAi: Number(e.target.value)})} className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm"/>
            </div>
            <div>
              <label className="text-xs font-semibold text-blue-400 block mb-1">SMS</label>
              <input type="number" value={formData.sms} onChange={e => setFormData({...formData, sms: Number(e.target.value)})} className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm"/>
            </div>
            <div>
              <label className="text-xs font-semibold text-amber-400 block mb-1">Voice (min)</label>
              <input type="number" value={formData.voiceMin} onChange={e => setFormData({...formData, voiceMin: Number(e.target.value)})} className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm"/>
            </div>
            <div>
              <label className="text-xs font-semibold text-green-400 block mb-1">Telefonie (min)</label>
              <input type="number" value={formData.callsMin} onChange={e => setFormData({...formData, callsMin: Number(e.target.value)})} className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm"/>
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Anulează</button>
            <button disabled={saving || !formData.name} type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm flex items-center gap-2">
              {saving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>}
              Salvează
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

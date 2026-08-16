"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowLeft, Loader2, Save, Activity } from "lucide-react"

export default function PricingRulesSettings() {
  const [rules, setRules] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchRules()
  }, [])

  const fetchRules = async () => {
    try {
      const res = await fetch("/api/settings/pricing-rules")
      const data = await res.json()
      setRules(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/settings/pricing-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rules)
      })
      if (res.ok) alert("Costuri salvate cu succes!")
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  const updateRule = (index: number, field: string, value: string) => {
    const newRules = [...rules]
    newRules[index][field] = Number(value)
    setRules(newRules)
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
            <h1 className="text-xl font-bold text-foreground">Reguli Prețuri & Costuri</h1>
            <p className="text-sm text-muted-foreground">Definește costurile de bază și conversia în Credite Universale.</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors shadow-sm disabled:opacity-50"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Salvează Modificări
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center p-8"><Loader2 className="animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Serviciu</th>
                <th className="px-4 py-3 font-medium">Cost Achiziție (EUR)</th>
                <th className="px-4 py-3 font-medium">Consumă (Credite)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rules.map((rule, idx) => (
                <tr key={rule.id}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground capitalize flex items-center gap-2">
                      <Activity size={14} className="text-primary"/>
                      {rule.serviceName.replace(/_/g, " ")}
                    </div>
                    <div className="text-xs text-muted-foreground">{rule.unitDescription}</div>
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      step="0.001"
                      value={rule.costPerUnitEur}
                      onChange={(e) => updateRule(idx, "costPerUnitEur", e.target.value)}
                      className="w-24 bg-background border border-border rounded px-2 py-1"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      value={rule.creditsPerUnit}
                      onChange={(e) => updateRule(idx, "creditsPerUnit", e.target.value)}
                      className="w-24 bg-background border border-border rounded px-2 py-1"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-sm text-blue-500">
        <h4 className="font-bold mb-1">Cum funcționează Creditele Universale?</h4>
        <p className="opacity-90">
          Clienții tăi cumpără pachete de Credite Universale. Când folosesc o funcționalitate (ex. trimit un SMS), li se vor scădea din cont atâtea credite cât definești în coloana "Consumă (Credite)". Coloana "Cost Achiziție" te ajută să vezi prețul tău de bază atunci când creezi pachetele, pentru a-ți asigura profitul.
        </p>
      </div>
    </div>
  )
}

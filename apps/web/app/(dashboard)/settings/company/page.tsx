"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Building2, Save, Loader2, CheckCircle2 } from "lucide-react"

interface CompanyData {
  name: string
  legalName: string
  regCom: string
  cif: string
  address: string
  iban: string
  bank: string
  representative: string
  representativeRole: string
  email: string
  phone: string
  website: string
}

const FIELDS: { key: keyof CompanyData; label: string; placeholder: string; half?: boolean }[] = [
  { key: "legalName", label: "Denumire completă (legal)", placeholder: "ADVANCED SYSTEMS & NETWORK SOLUTIONS SRL" },
  { key: "name", label: "Denumire scurtă", placeholder: "ASNS", half: true },
  { key: "cif", label: "CUI / CIF", placeholder: "RO18890424", half: true },
  { key: "regCom", label: "Nr. Reg. Comerț", placeholder: "J40/12223/2006", half: true },
  { key: "address", label: "Sediu social", placeholder: "Str. Exemplu, Nr. 1, București" },
  { key: "bank", label: "Banca", placeholder: "BANCA TRANSILVANIA", half: true },
  { key: "iban", label: "IBAN", placeholder: "RO59BTRL...", half: true },
  { key: "representative", label: "Reprezentant legal (nume)", placeholder: "Ion Popescu" },
  { key: "representativeRole", label: "Funcție reprezentant", placeholder: "Administrator", half: true },
  { key: "email", label: "Email firmă", placeholder: "office@example.ro", half: true },
  { key: "phone", label: "Telefon", placeholder: "+40 7XX XXX XXX", half: true },
  { key: "website", label: "Website", placeholder: "https://example.ro", half: true },
]

export default function CompanySettingsPage() {
  const router = useRouter()
  const [data, setData] = useState<CompanyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch("/api/settings/company")
      .then((r) => r.json())
      .then((j) => setData(j.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    if (!data) return
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch("/api/settings/company", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (res.ok) {
        const json = await res.json()
        setData(json.data)
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } catch (err) {
      console.error("Failed to save:", err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="animate-spin text-primary" size={24} />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Nu s-au putut încărca datele firmei.
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
          >
            <ArrowLeft size={14} /> Înapoi la Setări
          </button>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Building2 size={20} className="text-primary" />
            Firmă Prestator
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Aceste date sunt preluate automat la crearea contractelor noi.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {saving ? (
            <Loader2 size={14} className="animate-spin" />
          ) : saved ? (
            <CheckCircle2 size={14} />
          ) : (
            <Save size={14} />
          )}
          {saving ? "Se salvează..." : saved ? "Salvat ✓" : "Salvează"}
        </button>
      </div>

      {/* Form */}
      <div className="bg-surface rounded-2xl border border-border p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {FIELDS.map((f) => (
            <div key={f.key} className={f.half ? "" : "md:col-span-2"}>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                {f.label}
              </label>
              <input
                type="text"
                value={(data as any)[f.key] || ""}
                onChange={(e) => setData({ ...data, [f.key]: e.target.value })}
                placeholder={f.placeholder}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Info */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
        <p className="text-xs text-primary font-medium mb-1">💡 Unde se folosesc aceste date?</p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          La crearea unui contract nou, datele din această secțiune sunt preluate automat ca „Prestator" 
          în header-ul contractului. Reprezentantul legal apare și în secțiunea de semnături.
          Modificările se aplică doar contractelor create <b>după</b> salvare — contractele existente 
          păstrează datele de la momentul creării.
        </p>
      </div>
    </div>
  )
}

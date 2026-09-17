"use client"

import { useState, useEffect } from "react"
import { updateSupplier, type APISupplier } from "@/lib/api"
import { X, Save } from "lucide-react"

interface SupplierEditModalProps {
  supplier: Partial<APISupplier> & { id: string }
  onClose: () => void
  onSuccess: () => void
}

export function SupplierEditModal({ supplier, onClose, onSuccess }: SupplierEditModalProps) {
  const [formData, setFormData] = useState({
    country: supplier.country || "RO",
    vatRegime: supplier.vatRegime || "domestic",
    vatNumber: supplier.vatNumber || "",
    cui: supplier.cui || "",
    invoiceFetchMethod: supplier.invoiceFetchMethod || "efactura",
    invoiceSenderEmails: (supplier.invoiceSenderEmails || []).join(", "),
    category: supplier.category || "",
  })
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<{id: string, name: string}[]>([])

  useEffect(() => {
    fetch('/api/accounting/expense-categories?activeOnly=true')
      .then(res => res.json())
      .then(json => {
        if (json.data) setCategories(json.data)
      })
      .catch(console.error)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = {
        ...formData,
        invoiceSenderEmails: formData.invoiceSenderEmails.split(",").map(s => s.trim()).filter(Boolean)
      }
      await updateSupplier(supplier.id, payload)
      onSuccess()
    } catch (err) {
      console.error(err)
      alert("A apărut o eroare la salvare.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-surface border border-border shadow-2xl rounded-2xl w-full max-w-lg overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-border bg-muted/20">
          <h2 className="text-xl font-bold text-foreground">Editează Fiscalitate</h2>
          <button onClick={onClose} className="p-2 text-muted-foreground hover:bg-muted rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Țară</label>
              <input 
                type="text" 
                value={formData.country} 
                onChange={e => setFormData({ ...formData, country: e.target.value })}
                className="w-full h-10 px-3 bg-background border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                placeholder="Ex: RO, US, IE"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Regim Fiscal</label>
              <select 
                value={formData.vatRegime} 
                onChange={e => setFormData({ ...formData, vatRegime: e.target.value })}
                className="w-full h-10 px-3 bg-background border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              >
                <option value="domestic">Național (RO)</option>
                <option value="intracommunity">Intracomunitar (UE)</option>
                <option value="extracommunity">Extra-comunitar (Non-UE)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">CUI Românesc</label>
              <input 
                type="text" 
                value={formData.cui} 
                onChange={e => setFormData({ ...formData, cui: e.target.value })}
                className="w-full h-10 px-3 bg-background border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                placeholder="Ex: RO123456"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Cod TVA Extern (VIES)</label>
              <input 
                type="text" 
                value={formData.vatNumber} 
                onChange={e => setFormData({ ...formData, vatNumber: e.target.value })}
                className="w-full h-10 px-3 bg-background border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                placeholder="Ex: IE1234567X"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Metodă preluare facturi</label>
              <select 
                value={formData.invoiceFetchMethod} 
                onChange={e => setFormData({ ...formData, invoiceFetchMethod: e.target.value })}
                className="w-full h-10 px-3 bg-background border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              >
                <option value="efactura">SPV e-Factura</option>
                <option value="email_parsing">Email Auto-Fetch</option>
                <option value="manual">Manual</option>
                <option value="api">API / Integrări</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Categorie Cheltuială</label>
              <select 
                value={formData.category} 
                onChange={e => setFormData({ ...formData, category: e.target.value })}
                className="w-full h-10 px-3 bg-background border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              >
                <option value="">-- Fără Categorie --</option>
                {categories.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Email-uri expeditori (separate prin virgulă)</label>
            <textarea 
              value={formData.invoiceSenderEmails} 
              onChange={e => setFormData({ ...formData, invoiceSenderEmails: e.target.value })}
              className="w-full h-20 p-3 bg-background border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
              placeholder="Ex: no-reply@twilio.com, billing@google.com"
            />
            <p className="text-xs text-muted-foreground">Folosite pentru a asocia automat facturile primite pe email.</p>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              Anulează
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="px-4 py-2.5 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-2"
            >
              <Save size={16} /> {loading ? "Se salvează..." : "Salvează Modificările"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

"use client"

import { useState, useEffect } from 'react'
import { FileText, CheckCircle, XCircle, Search, AlertCircle, Building2 } from 'lucide-react'




// Tip local pentru date
type PendingInvoice = {
  id: string
  amount: number
  currency: string
  issueDate: string
  invoiceNumber: string | null
  pdfUrl: string
  extractedSupplierName: string | null
  supplierId: string | null
  supplier?: { id: string, name: string }
}

export default function ReviewInvoicesPage() {
  const [invoices, setInvoices] = useState<PendingInvoice[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Fetch pending
  useEffect(() => {
    fetch('/api/suppliers/review')
      .then(res => res.json())
      .then(data => {
        setInvoices(data.invoices || [])
        if (data.invoices?.length > 0) {
          setSelectedId(data.invoices[0].id)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const selectedInvoice = invoices.find(i => i.id === selectedId)

  const handleConfirm = async () => {
    if (!selectedInvoice) return
    const res = await fetch(`/api/suppliers/review/${selectedInvoice.id}/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        // Aici am trimite supplierId ales sau nou creat din UI
        // Pentru mockup trimitem supplierId existent dacă a fost matched, altfel cere UI (simplificat)
        supplierId: selectedInvoice.supplierId 
      })
    })

    if (res.ok) {
      setInvoices(invoices.filter(i => i.id !== selectedInvoice.id))
      setSelectedId(invoices[1]?.id || null)
    }
  }

  const handleReject = async () => {
    if (!selectedInvoice) return
    const res = await fetch(`/api/suppliers/review/${selectedInvoice.id}/reject`, { method: 'POST' })
    if (res.ok) {
      setInvoices(invoices.filter(i => i.id !== selectedInvoice.id))
      setSelectedId(invoices[1]?.id || null)
    }
  }

  if (loading) return <div className="p-8">Se încarcă facturile în așteptare...</div>
  if (invoices.length === 0) return (
    <div className="p-8 flex flex-col items-center justify-center text-center text-muted-foreground h-[60vh]">
      <CheckCircle size={48} className="mb-4 text-green-500/50" />
      <h2 className="text-xl font-semibold mb-2 text-foreground">Toate bune!</h2>
      <p>Nu există facturi care necesită confirmare manuală.</p>
    </div>
  )

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-background">
      {/* Lista din stânga */}
      <div className="w-1/3 border-r border-border bg-surface overflow-y-auto">
        <div className="p-4 border-b border-border sticky top-0 bg-surface z-10">
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <AlertCircle size={18} className="text-amber-500" /> 
            Necesită Revizuire ({invoices.length})
          </h1>
          <div className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <input className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 pl-9" placeholder="Caută după nume sau sumă..." />
          </div>
        </div>
        
        <div className="divide-y divide-border">
          {invoices.map(inv => (
            <div 
              key={inv.id} 
              onClick={() => setSelectedId(inv.id)}
              className={`p-4 cursor-pointer hover:bg-muted/10 transition-colors ${selectedId === inv.id ? 'bg-primary/5 border-l-2 border-primary' : ''}`}
            >
              <div className="flex justify-between items-start mb-1">
                <span className="font-medium text-sm">
                  {inv.supplier?.name || inv.extractedSupplierName || 'Furnizor Necunoscut'}
                </span>
                <span className="font-semibold text-sm">{inv.amount} {inv.currency}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <FileText size={12} />
                {inv.invoiceNumber || 'Fără Număr'}
                <span className="mx-1">•</span>
                {new Date(inv.issueDate).toLocaleDateString('ro-RO')}
              </div>
              {!inv.supplierId && (
                <div className="mt-2">
                  <Badge variant="outline" className="text-amber-500 border-amber-500/30 bg-amber-500/10">Furnizor Nou Detectat</Badge>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Detalii și PDF dreapta */}
      {selectedInvoice && (
        <div className="flex-1 flex flex-col">
          <div className="p-4 border-b border-border flex justify-between items-center bg-surface">
            <div>
              <h2 className="font-semibold">Confirmare Date Extrase</h2>
              <p className="text-xs text-muted-foreground">Te rugăm să verifici dacă datele extrase corespund cu PDF-ul.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleReject} className="text-red-500 border-red-500/30 hover:bg-red-500/10">
                <XCircle size={16} className="mr-2" /> Respinge
              </Button>
              <Button onClick={handleConfirm} className="bg-green-600 hover:bg-green-700 text-white">
                <CheckCircle size={16} className="mr-2" /> Confirmă Factura
              </Button>
            </div>
          </div>
          
          <div className="flex-1 overflow-hidden flex">
            {/* Formular date pe stânga containerului de detalii */}
            <div className="w-1/3 p-6 overflow-y-auto border-r border-border bg-muted/5">
              <div className="space-y-6">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Furnizor</label>
                  {selectedInvoice.supplierId ? (
                     <div className="flex items-center gap-3 p-3 bg-surface border border-border rounded-lg">
                       <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                         <Building2 size={14} className="text-primary" />
                       </div>
                       <div>
                         <div className="font-medium text-sm">{selectedInvoice.supplier?.name}</div>
                         <div className="text-xs text-muted-foreground">Asociat automat</div>
                       </div>
                     </div>
                  ) : (
                    <div className="p-4 border border-amber-500/30 bg-amber-500/5 rounded-lg space-y-3">
                      <div className="font-medium text-sm text-amber-600 dark:text-amber-400">
                        {selectedInvoice.extractedSupplierName}
                      </div>
                      <p className="text-xs text-muted-foreground">Acest furnizor nu există în sistem.</p>
                      <Button size="sm" variant="outline" className="w-full text-xs">Asociază sau Creează</Button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Sumă</label>
                    <input className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50" defaultValue={selectedInvoice.amount} type="number" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Monedă</label>
                    <input className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50" defaultValue={selectedInvoice.currency} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Data Emiterii</label>
                    <input className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50" defaultValue={new Date(selectedInvoice.issueDate).toISOString().split('T')[0]} type="date" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Nr. Factură</label>
                    <Input defaultValue={selectedInvoice.invoiceNumber || ''} />
                  </div>
                </div>
              </div>
            </div>
            
            {/* PDF Viewer pe dreapta */}
            <div className="flex-1 bg-neutral-900 flex items-center justify-center relative">
              {/* Presupunem generare Signed URL - mock pentru UI */}
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/30 font-semibold text-2xl text-center px-8">
                PDF Viewer <br/> <span className="text-sm">(Signed URL: {selectedInvoice.pdfUrl})</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

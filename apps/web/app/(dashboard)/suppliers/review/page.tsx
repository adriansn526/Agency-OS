"use client"

import { useState, useEffect } from 'react'
import { FileText, CheckCircle, XCircle, Search, AlertCircle, Building2 } from 'lucide-react'

import { Button } from "@/components/ui/button"
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
  const [showSupplierModal, setShowSupplierModal] = useState(false)
  const [searchSupplier, setSearchSupplier] = useState('')
  const [allSuppliers, setAllSuppliers] = useState<any[]>([])

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

  const updateSelectedInvoice = (field: keyof PendingInvoice, value: any) => {
    setInvoices(prev => prev.map(inv => inv.id === selectedId ? { ...inv, [field]: value } : inv))
  }

  const openSupplierModal = async () => {
    setShowSupplierModal(true)
    setSearchSupplier(selectedInvoice?.extractedSupplierName || '')
    const res = await fetch('/api/suppliers')
    const data = await res.json()
    if (data.data) setAllSuppliers(data.data)
  }

  const handleAssociate = (supplier: { id: string, name: string }) => {
    updateSelectedInvoice('supplierId', supplier.id)
    updateSelectedInvoice('supplier', { id: supplier.id, name: supplier.name })
    setShowSupplierModal(false)
  }

  const handleCreateSupplier = async () => {
    const res = await fetch('/api/suppliers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: searchSupplier || selectedInvoice?.extractedSupplierName || 'Furnizor Nou' })
    })
    const data = await res.json()
    if (data.data) handleAssociate(data.data)
  }

  const handleConfirm = async () => {
    if (!selectedInvoice) return
    const res = await fetch(`/api/suppliers/review/${selectedInvoice.id}/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        supplierId: selectedInvoice.supplierId,
        amount: selectedInvoice.amount,
        currency: selectedInvoice.currency,
        issueDate: selectedInvoice.issueDate,
        invoiceNumber: selectedInvoice.invoiceNumber
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
                  <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-500 border border-amber-500/30 px-2 py-0.5 rounded-full text-xs font-medium">Furnizor Nou Detectat</span>
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
                      <Button size="sm" variant="outline" className="w-full text-xs" onClick={openSupplierModal}>Asociază sau Creează</Button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Sumă</label>
                    <input className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50" value={selectedInvoice.amount} onChange={e => updateSelectedInvoice('amount', Number(e.target.value))} type="number" step="0.01" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Monedă</label>
                    <input className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50" value={selectedInvoice.currency} onChange={e => updateSelectedInvoice('currency', e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Data Emiterii</label>
                    <input className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50" value={selectedInvoice.issueDate ? new Date(selectedInvoice.issueDate).toISOString().split('T')[0] : ''} onChange={e => updateSelectedInvoice('issueDate', e.target.value)} type="date" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Nr. Factură</label>
                    <input className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50" value={selectedInvoice.invoiceNumber || ''} onChange={e => updateSelectedInvoice('invoiceNumber', e.target.value)} />
                  </div>
                </div>
              </div>
            </div>
            
            {/* PDF Viewer pe dreapta */}
            <div className="flex-1 bg-neutral-900 relative">
              <iframe 
                src={`/api/accounting/files/${selectedInvoice.pdfUrl}`}
                className="w-full h-full border-0"
                title="PDF Viewer"
              />
            </div>
          </div>
        </div>
      )}
      
      {/* Supplier Modal Overlay */}
      {showSupplierModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-lg shadow-xl w-full max-w-md p-6 relative">
            <h3 className="text-lg font-semibold mb-4">Asociază sau Creează Furnizor</h3>
            <input 
              autoFocus
              className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary mb-4" 
              placeholder="Caută furnizor..." 
              value={searchSupplier}
              onChange={e => setSearchSupplier(e.target.value)}
            />
            <div className="max-h-60 overflow-y-auto mb-4 border border-border rounded-md divide-y divide-border">
              {allSuppliers.filter(s => s.name.toLowerCase().includes(searchSupplier.toLowerCase())).map(s => (
                <div key={s.id} onClick={() => handleAssociate(s)} className="p-3 hover:bg-muted/10 cursor-pointer text-sm">
                  {s.name} <span className="text-xs text-muted-foreground block">{s.cui ? `CUI: ${s.cui}` : ''}</span>
                </div>
              ))}
              {allSuppliers.filter(s => s.name.toLowerCase().includes(searchSupplier.toLowerCase())).length === 0 && (
                <div className="p-3 text-sm text-muted-foreground text-center">Niciun furnizor găsit.</div>
              )}
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowSupplierModal(false)}>Anulează</Button>
              <Button onClick={handleCreateSupplier}>Creează Nou</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

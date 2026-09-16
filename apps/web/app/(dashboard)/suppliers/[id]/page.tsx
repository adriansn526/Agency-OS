"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { fetchSupplier, type APISupplierDetails } from "@/lib/api"
import { ArrowLeft, Building2, Calendar, FileText, Upload, Plus, CreditCard, ArrowDownRight, ArrowUpRight } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils"

interface LedgerEntry {
  id: string
  date: Date
  type: 'debit' | 'credit' // debit = invoice (we owe them), credit = payment (we paid them)
  description: string
  amount: number
  currency: string
  balance?: number
  status?: string
  source?: string
  extractionStatus?: string
}

export default function SupplierDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const [supplier, setSupplier] = useState<APISupplierDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [showUploadModal, setShowUploadModal] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetchSupplier(params.id as string)
      setSupplier(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [params.id])

  useEffect(() => {
    loadData()
  }, [loadData])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
        <p>Se încarcă detaliile furnizorului...</p>
      </div>
    )
  }

  if (!supplier) {
    return (
      <div className="p-8">
        <p className="text-red-500">Furnizorul nu a fost găsit.</p>
        <button onClick={() => router.back()} className="mt-4 text-primary hover:underline">Înapoi</button>
      </div>
    )
  }

  // Build ledger entries
  const ledgerEntries: LedgerEntry[] = []
  if (supplier.invoices) {
    supplier.invoices.forEach(inv => {
      // Add Invoice (Debit)
      ledgerEntries.push({
        id: `inv-${inv.id}`,
        date: new Date(inv.issueDate),
        type: 'debit',
        description: `Factură ${inv.invoiceNumber || 'F.N.'}`,
        amount: Number(inv.amount),
        currency: inv.currency,
        status: inv.status,
        source: inv.source,
        extractionStatus: inv.extractionStatus
      })

      // Add Payments (Credit)
      if (inv.payments) {
        inv.payments.forEach(p => {
          ledgerEntries.push({
            id: `pay-${p.id}`,
            date: new Date(p.paidAt),
            type: 'credit',
            description: `Plată factură ${inv.invoiceNumber || 'F.N.'}${p.method ? ` (${p.method})` : ''}`,
            amount: Number(p.amount),
            currency: inv.currency
          })
        })
      }
    })
  }

  // Sort chronological (oldest to newest)
  ledgerEntries.sort((a, b) => a.date.getTime() - b.date.getTime())

  // Calculate running balance (Debit - Credit)
  let currentBalance = 0
  ledgerEntries.forEach(entry => {
    if (entry.type === 'debit') {
      currentBalance += entry.amount
    } else {
      currentBalance -= entry.amount
    }
    entry.balance = currentBalance
  })

  // We probably want to show newest first in the UI, but balance must be calculated oldest to newest
  const displayEntries = [...ledgerEntries].reverse()

  return (
    <div className="flex flex-col h-full bg-background overflow-auto">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border bg-surface px-6 py-6">
        <button 
          onClick={() => router.push("/suppliers")}
          className="flex items-center text-xs text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft size={14} className="mr-1" /> Înapoi la listă
        </button>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-primary border border-primary/10">
              <Building2 size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{supplier.name}</h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mt-1">
                {supplier.cui && <span>CUI: <span className="text-foreground">{supplier.cui}</span></span>}
                {supplier.iban && <span>IBAN: <span className="text-foreground font-mono">{supplier.iban}</span></span>}
                <span className="px-2 py-0.5 rounded-full bg-muted text-xs uppercase font-bold">
                  {supplier.status}
                </span>
                {supplier.isRecurring && (
                  <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 text-xs font-bold uppercase">
                    Recurent {supplier.expectedDay ? `(Ziua ${supplier.expectedDay})` : ""}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowUploadModal(true)}
              className="h-9 px-4 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2 shadow-sm"
            >
              <Upload size={16} /> Încarcă Factură
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-foreground">Fișă Furnizor (Ledger)</h2>
          <div className="text-sm font-medium">
            Sold Curent: <span className={currentBalance > 0 ? "text-destructive" : "text-success"}>{formatCurrency(currentBalance, false, "RON")}</span>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
          {displayEntries.length === 0 ? (
            <div className="p-8 text-center flex flex-col items-center justify-center">
              <FileText className="w-10 h-10 text-muted-foreground/30 mb-3" />
              <p className="text-foreground font-medium mb-1">Nicio înregistrare pe fișă</p>
              <p className="text-sm text-muted-foreground max-w-sm mb-4">
                Nu există facturi sau plăți atașate acestui furnizor.
              </p>
              <button 
                onClick={() => setShowUploadModal(true)}
                className="text-sm font-medium text-primary bg-primary/10 px-4 py-2 rounded-lg hover:bg-primary/20 transition-colors"
              >
                Încarcă prima factură
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dată</th>
                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tranzacție</th>
                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Debit (Facturat)</th>
                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Credit (Plătit)</th>
                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Sold</th>
                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Extra</th>
                  </tr>
                </thead>
                <tbody>
                  {displayEntries.map(entry => (
                    <tr key={entry.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 text-sm text-foreground-secondary whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className="text-muted-foreground" />
                          {formatDate(entry.date.toISOString())}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium flex items-center gap-2">
                        {entry.type === 'debit' ? (
                          <ArrowUpRight size={16} className="text-destructive shrink-0" />
                        ) : (
                          <ArrowDownRight size={16} className="text-success shrink-0" />
                        )}
                        {entry.description}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-right tabular-nums text-destructive">
                        {entry.type === 'debit' ? formatCurrency(entry.amount, false, entry.currency) : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-right tabular-nums text-success">
                        {entry.type === 'credit' ? formatCurrency(entry.amount, false, entry.currency) : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-right tabular-nums">
                        {formatCurrency(entry.balance || 0, false, entry.currency)}
                      </td>
                      <td className="px-4 py-3">
                        {entry.type === 'debit' && entry.status && (
                          <div className="flex flex-col gap-1 items-start">
                            <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full ${
                              entry.status === 'paid' ? 'bg-success/10 text-success' :
                              entry.status === 'partial' ? 'bg-warning/10 text-warning' :
                              'bg-destructive/10 text-destructive'
                            }`}>
                              {entry.status === 'paid' ? 'Plătit' : entry.status === 'partial' ? 'Parțial' : 'Neplătit'}
                            </span>
                            {entry.extractionStatus === 'pending_review' && (
                              <span className="text-[10px] text-warning font-semibold">Necesită Review</span>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Manual Upload Modal - Dummy implementation for phase 1 visually */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface border border-border rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="font-bold text-lg">Încarcă Factură</h3>
              <button onClick={() => setShowUploadModal(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:border-primary/50 transition-colors bg-muted/30">
                <Upload className="w-8 h-8 text-primary/60 mb-2" />
                <p className="text-sm font-medium">Click sau drag & drop fisier PDF</p>
                <p className="text-xs text-muted-foreground mt-1">Extracția manuală (Faza 1)</p>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-2">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Nr. Factură</label>
                  <input type="text" className="w-full h-9 bg-background border border-border rounded-lg px-3 text-sm" placeholder="F-2024-..." />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Dată Emitere</label>
                  <input type="date" className="w-full h-9 bg-background border border-border rounded-lg px-3 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Sumă</label>
                  <input type="number" className="w-full h-9 bg-background border border-border rounded-lg px-3 text-sm" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Monedă</label>
                  <select className="w-full h-9 bg-background border border-border rounded-lg px-3 text-sm">
                    <option>RON</option>
                    <option>EUR</option>
                    <option>USD</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-border bg-muted/20 flex justify-end gap-3">
              <button onClick={() => setShowUploadModal(false)} className="px-4 py-2 text-sm font-medium hover:bg-muted rounded-lg">Anulează</button>
              <button className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">Salvează Factura</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

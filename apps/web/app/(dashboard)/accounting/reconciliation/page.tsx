"use client"

import { useState, useEffect } from 'react'
import { FileText, CheckCircle, AlertCircle, Link as LinkIcon, Search, Check, Info } from 'lucide-react'

type BankTransaction = {
  id: string
  date: string
  description: string
  debit: string
  credit: string
  category: string
  extractedMerchant: string | null
  matchStatus: string
  extractionStatus: string
}

type SupplierInvoice = {
  id: string
  invoiceNumber: string | null
  amount: string
  issueDate: string
  status: string
  supplier?: { id: string, name: string, cui: string | null }
}

export default function ReconciliationPage() {
  const [transactions, setTransactions] = useState<BankTransaction[]>([])
  const [invoices, setInvoices] = useState<SupplierInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTx, setSelectedTx] = useState<BankTransaction | null>(null)
  
  const [searchQuery, setSearchQuery] = useState('')
  const [matchAmount, setMatchAmount] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [filterCategory, setFilterCategory] = useState<string>('all')

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/accounting/reconciliation/pending')
      const data = await res.json()
      if (data.transactions) setTransactions(data.transactions)
      if (data.candidateInvoices) setInvoices(data.candidateInvoices)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Auto-set the match amount when selecting a transaction
  useEffect(() => {
    if (selectedTx) {
      const isIncome = selectedTx.category === 'incoming_payment' || parseFloat(selectedTx.credit) > 0
      setMatchAmount(isIncome ? selectedTx.credit : selectedTx.debit)
    }
  }, [selectedTx])

  const handleMatch = async (invoice: SupplierInvoice) => {
    if (!selectedTx || !matchAmount) return

    setIsProcessing(true)
    try {
      const res = await fetch('/api/accounting/reconciliation/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: selectedTx.id,
          invoiceId: invoice.id,
          matchAmount: matchAmount
        })
      })

      if (res.ok) {
        setSelectedTx(null)
        await fetchData()
      } else {
        const err = await res.json()
        alert('Eroare: ' + err.error)
      }
    } catch (err) {
      console.error(err)
      alert('Eroare rețea')
    } finally {
      setIsProcessing(false)
    }
  }

  // Sort invoices: first those matching the name, then by amount closeness
  const getSortedInvoices = () => {
    if (!selectedTx) return []
    
    const txAmount = parseFloat(selectedTx.debit) || 0
    let filtered = invoices

    if (searchQuery) {
      filtered = filtered.filter(inv => 
        inv.supplier?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.invoiceNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.amount.toString().includes(searchQuery)
      )
    }

    return filtered.sort((a, b) => {
      // Prioritize name match if extractedMerchant exists
      const aNameMatch = selectedTx.extractedMerchant && a.supplier?.name.toLowerCase().includes(selectedTx.extractedMerchant.toLowerCase().substring(0, 5))
      const bNameMatch = selectedTx.extractedMerchant && b.supplier?.name.toLowerCase().includes(selectedTx.extractedMerchant.toLowerCase().substring(0, 5))
      
      if (aNameMatch && !bNameMatch) return -1
      if (!aNameMatch && bNameMatch) return 1

      // Then sort by amount difference
      const aDiff = Math.abs(parseFloat(a.amount) - txAmount)
      const bDiff = Math.abs(parseFloat(b.amount) - txAmount)
      return aDiff - bDiff
    })
  }

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-background">
      {/* Lista Tranzactii pe stanga */}
      <div className="w-1/3 border-r border-border bg-surface overflow-y-auto flex flex-col">
        <div className="p-4 border-b border-border sticky top-0 bg-surface z-10 flex items-center justify-between">
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <AlertCircle size={18} className="text-amber-500" /> 
            Necesită Reconciliere ({transactions.length})
          </h1>
          <select 
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="text-xs bg-background border border-border rounded px-2 py-1 outline-none focus:border-primary"
          >
            <option value="all">Toate</option>
            <option value="supplier_payment">Plăți Furnizori</option>
            <option value="incoming_payment">Încasări</option>
            <option value="bank_fee">Comisioane Bancare</option>
          </select>
        </div>
        
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Se încarcă...</div>
        ) : transactions.length === 0 ? (
          <div className="p-8 flex flex-col items-center justify-center text-center text-muted-foreground flex-1">
            <CheckCircle size={48} className="mb-4 text-green-500/50" />
            <h2 className="text-xl font-semibold mb-2 text-foreground">Toate bune!</h2>
            <p>Nu există tranzacții bancare care necesită reconciliere manuală.</p>
          </div>
        ) : (
          <div className="divide-y divide-border flex-1">
            {transactions.filter(t => filterCategory === 'all' || t.category === filterCategory).map(t => {
               const isIncome = t.category === 'incoming_payment' || parseFloat(t.credit) > 0
               const amountStr = isIncome ? `+${parseFloat(t.credit).toFixed(2)}` : `-${parseFloat(t.debit).toFixed(2)}`
               const amountColor = isIncome ? 'text-green-500' : 'text-destructive'

               return (
                 <div 
                    key={t.id} 
                    onClick={() => setSelectedTx(t)}
                    className={`p-4 cursor-pointer hover:bg-muted/30 transition-colors ${selectedTx?.id === t.id ? 'bg-muted/50 border-l-4 border-primary' : ''}`}
                 >
                   <div className="flex justify-between items-start mb-1">
                      <div className="font-medium text-sm line-clamp-2 pr-2">{t.description}</div>
                      <div className={`font-bold shrink-0 ${amountColor}`}>{amountStr} RON</div>
                   </div>
                   <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{new Date(t.date).toLocaleDateString('ro-RO')}</span>
                      {t.extractionStatus === 'pending_review' && (
                        <span className="bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded flex items-center gap-1">
                          <Info size={12} /> Review
                        </span>
                      )}
                   </div>
                   {t.extractedMerchant && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Detectat: <span className="font-medium text-foreground">{t.extractedMerchant}</span>
                      </div>
                   )}
                 </div>
               )
            })}
          </div>
        )}
      </div>

      {/* Detalii facturi dreapta */}
      <div className="w-2/3 bg-background flex flex-col">
        {!selectedTx ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground/50 font-semibold text-xl text-center px-8">
             Selectează o tranzacție din stânga <br/> pentru a vizualiza facturile candidate
          </div>
        ) : (
          <>
            {/* Header Tranzactie Selectata */}
            <div className="p-6 border-b border-border bg-surface">
              <h2 className="text-sm text-muted-foreground mb-1">Tranzacție Selectată</h2>
              <div className="flex justify-between items-end">
                <div>
                  <div className="text-xl font-semibold">{selectedTx.description}</div>
                  <div className="text-muted-foreground mt-1">{new Date(selectedTx.date).toLocaleDateString('ro-RO')}</div>
                </div>
                <div className={`text-2xl font-bold shrink-0 ${(selectedTx.category === 'incoming_payment' || parseFloat(selectedTx.credit) > 0) ? 'text-green-500' : 'text-destructive'}`}>
                  {(selectedTx.category === 'incoming_payment' || parseFloat(selectedTx.credit) > 0) 
                    ? `+${parseFloat(selectedTx.credit).toFixed(2)}` 
                    : `-${parseFloat(selectedTx.debit).toFixed(2)}`} RON
                </div>
              </div>
            </div>

            {/* Lista Facturi */}
            <div className="p-6 flex-1 overflow-y-auto">
               <div className="flex justify-between items-center mb-4">
                 <h3 className="font-semibold text-lg">Facturi Furnizor Candidate ({invoices.length})</h3>
                 <div className="relative">
                   <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                   <input 
                     type="text" 
                     placeholder="Caută factură/furnizor..." 
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
                     className="pl-9 pr-4 py-2 bg-muted/30 border border-border rounded-md text-sm outline-none focus:border-primary transition-colors"
                   />
                 </div>
               </div>

               <div className="grid gap-3">
                 {getSortedInvoices().map(inv => {
                   const txVal = parseFloat((selectedTx.category === 'incoming_payment' || parseFloat(selectedTx.credit) > 0) ? selectedTx.credit : selectedTx.debit) || 0
                   const diff = Math.abs(parseFloat(inv.amount) - txVal)
                   const isExactMatch = diff <= 1

                   return (
                     <div key={inv.id} className="border border-border rounded-lg p-4 flex justify-between items-center bg-surface hover:border-primary/50 transition-colors">
                       <div>
                         <div className="font-semibold text-lg">{inv.supplier?.name || 'Furnizor Necunoscut'}</div>
                         <div className="text-sm text-muted-foreground flex gap-3 mt-1">
                           <span>Factura: #{inv.invoiceNumber || '-'}</span>
                           <span>Data: {new Date(inv.issueDate).toLocaleDateString('ro-RO')}</span>
                           <span className={inv.status === 'partial' ? 'text-amber-500 font-medium' : ''}>Status: {inv.status}</span>
                         </div>
                       </div>
                       
                       <div className="flex items-center gap-6">
                         <div className="text-right">
                            <div className="font-bold text-lg">{parseFloat(inv.amount).toFixed(2)} RON</div>
                            {isExactMatch && (
                              <div className="text-xs text-green-500 font-medium flex items-center justify-end gap-1">
                                <Check size={12} /> Match Perfect
                              </div>
                            )}
                         </div>

                         <div className="flex flex-col gap-2">
                           <input 
                             type="number" 
                             className="w-24 px-2 py-1 bg-background border border-border rounded text-sm outline-none text-right"
                             value={matchAmount}
                             onChange={(e) => setMatchAmount(e.target.value)}
                             step="0.01"
                             placeholder="Sumă match"
                           />
                           <button 
                             disabled={isProcessing}
                             onClick={() => handleMatch(inv)}
                             className="bg-primary text-primary-foreground px-4 py-1.5 rounded text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                           >
                             <LinkIcon size={14} /> 
                             {isProcessing ? 'Procesare...' : 'Asociază'}
                           </button>
                         </div>
                       </div>
                     </div>
                   )
                 })}
                 
                 {getSortedInvoices().length === 0 && (
                   <div className="text-center text-muted-foreground p-8 border border-dashed border-border rounded-lg">
                     Nu s-a găsit nicio factură care să corespundă criteriilor.
                   </div>
                 )}
               </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

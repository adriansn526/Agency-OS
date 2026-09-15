"use client"

import { useState, useEffect } from 'react'
import { FileText, CheckCircle, AlertCircle, Link as LinkIcon } from 'lucide-react'

// Mock types
type BankTransaction = {
  id: string
  date: string
  description: string
  debit: number
  credit: number
  category: string
  extractedMerchant: string | null
  matchedSupplierId: string | null
  matchStatus: string
  extractionStatus: string
  supplier?: { id: string, name: string }
}

type SupplierInvoice = {
  id: string
  invoiceNumber: string | null
  amount: number
  issueDate: string
  supplierId: string | null
}

export default function ReconciliationPage() {
  const [transactions, setTransactions] = useState<BankTransaction[]>([])
  const [loading, setLoading] = useState(true)

  // Aici în mod normal am face fetch către /api/bank-statements/pending
  // Simulăm date statice pt momentul UI
  useEffect(() => {
    // In a real app we fetch this from API
    setLoading(false)
  }, [])

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-background">
      {/* Lista Tranzactii pe stanga */}
      <div className="w-1/2 border-r border-border bg-surface overflow-y-auto">
        <div className="p-4 border-b border-border sticky top-0 bg-surface z-10">
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <AlertCircle size={18} className="text-amber-500" /> 
            Necesită Reconciliere (0)
          </h1>
        </div>
        
        {loading ? (
          <div className="p-8">Se încarcă...</div>
        ) : transactions.length === 0 ? (
          <div className="p-8 flex flex-col items-center justify-center text-center text-muted-foreground h-[60vh]">
            <CheckCircle size={48} className="mb-4 text-green-500/50" />
            <h2 className="text-xl font-semibold mb-2 text-foreground">Toate bune!</h2>
            <p>Nu există tranzacții bancare care necesită reconciliere manuală.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {transactions.map(t => (
               <div key={t.id} className="p-4 cursor-pointer hover:bg-muted/10 transition-colors">
                 <div className="font-semibold">{t.description}</div>
               </div>
            ))}
          </div>
        )}
      </div>

      {/* Detalii facturi dreapta */}
      <div className="w-1/2 bg-neutral-900 flex items-center justify-center relative">
        <div className="text-muted-foreground/30 font-semibold text-2xl text-center px-8">
           Selectează o tranzacție din stânga <br/> pentru a vizualiza facturile candidate
        </div>
      </div>
    </div>
  )
}

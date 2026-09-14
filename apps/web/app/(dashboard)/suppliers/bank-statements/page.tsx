"use client"

import { useState } from 'react'
import { UploadCloud, FileText, CheckCircle, AlertCircle } from 'lucide-react'

export default function BankStatementsUploadPage() {
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<{ success: boolean, savedCount?: number, autoMatchedCount?: number, error?: string } | null>(null)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setResult(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/bank-statements/upload', {
        method: 'POST',
        body: formData
      })
      const data = await res.json()
      
      if (res.ok) {
        setResult({ success: true, savedCount: data.savedCount, autoMatchedCount: data.autoMatchedCount })
      } else {
        setResult({ success: false, error: data.error })
      }
    } catch (error: any) {
      setResult({ success: false, error: error.message || 'A apărut o eroare necunoscută.' })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-2">Extrase de Cont (BT)</h1>
        <p className="text-muted-foreground">Încarcă extrasul de cont PDF cu parolă. Sistemul îl va decripta automat (folosind parola salvată) și va reconcilia facturile de furnizor.</p>
      </div>

      <div className="border-2 border-dashed border-border rounded-xl p-12 bg-surface text-center flex flex-col items-center justify-center relative hover:bg-muted/5 transition-colors">
        <input 
          type="file" 
          accept="application/pdf"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
          onChange={handleUpload}
          disabled={uploading}
        />
        <UploadCloud size={48} className="text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-1">
          {uploading ? 'Procesare PDF cu LLM...' : 'Drag & Drop PDF Extras'}
        </h3>
        <p className="text-sm text-muted-foreground">
          {uploading ? 'Această operațiune poate dura câteva zeci de secunde.' : 'sau dă click pentru a alege fișierul'}
        </p>
      </div>

      {result && (
        <div className={`p-4 rounded-lg border flex items-start gap-4 ${result.success ? 'bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400'}`}>
          {result.success ? <CheckCircle className="mt-0.5" /> : <AlertCircle className="mt-0.5" />}
          <div>
            <h4 className="font-semibold">{result.success ? 'Procesare Finalizată' : 'Eroare la procesare'}</h4>
            <p className="text-sm mt-1">
              {result.success 
                ? `Au fost salvate ${result.savedCount} tranzacții în baza de date. Dintre acestea, ${result.autoMatchedCount} au fost auto-reconciliate perfect.` 
                : result.error
              }
            </p>
            {result.success && result.savedCount! > result.autoMatchedCount! && (
              <p className="text-sm mt-2 font-medium">
                Sunt tranzacții care necesită reconciliere manuală. Mergi la tab-ul Reconciliere.
              </p>
            )}
          </div>
        </div>
      )}

    </div>
  )
}

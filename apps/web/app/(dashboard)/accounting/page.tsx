'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, CheckCircle2, FileText, Send, Download } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { format, subMonths } from 'date-fns'

export default function AccountingPage() {
  const [month, setMonth] = useState(format(subMonths(new Date(), 1), 'yyyy-MM')) // default last month
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<any>(null)
  const [sending, setSending] = useState(false)
  const [success, setSuccess] = useState(false)

  const handlePreview = async () => {
    setLoading(true)
    setPreview(null)
    setSuccess(false)
    try {
      const res = await fetch(`/api/accounting/preview?month=${month}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Eroare la preluare preview')
      setPreview(data)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSend = async () => {
    if (!confirm('Ești sigur că vrei să trimiți pachetul contabil?')) return
    
    setSending(true)
    try {
      const res = await fetch('/api/accounting/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Eroare la trimitere')
      setSuccess(true)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Contabilitate</h1>
        <p className="text-muted-foreground mt-2">
          Generează și trimite automat arhiva cu facturi și extrase de cont către contabil.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Generare Pachet</CardTitle>
          <CardDescription>Selectează luna pentru care dorești să generezi arhiva (an-lună).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <input 
              type="month" 
              value={month} 
              onChange={(e) => setMonth(e.target.value)} 
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background max-w-[200px]"
            />
            <Button onClick={handlePreview} disabled={loading}>
              {loading ? 'Se încarcă...' : 'Generează preview pachet'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {success && (
        <Alert variant="default" className="border-green-500 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Succes!</AlertTitle>
          <AlertDescription className="text-green-700">
            Pachetul contabil pentru luna {month} a fost trimis cu succes prin email.
          </AlertDescription>
        </Alert>
      )}

      {preview && !success && (
        <Card>
          <CardHeader>
            <CardTitle>Preview Pachet: {month}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-muted rounded-lg border">
                <p className="text-sm text-muted-foreground">Facturi Validate</p>
                <p className="text-2xl font-bold">{preview.invoiceCount}</p>
              </div>
              <div className="p-4 bg-muted rounded-lg border">
                <p className="text-sm text-muted-foreground">Total Facturi</p>
                <p className="text-2xl font-bold">{preview.totalAmount} RON</p>
              </div>
              <div className="p-4 bg-muted rounded-lg border">
                <p className="text-sm text-muted-foreground">Status Pachet</p>
                <p className="text-2xl font-bold">
                  {preview.hasPending ? (
                    <span className="text-red-500">Incomplet</span>
                  ) : (
                    <span className="text-green-500">Pregătit</span>
                  )}
                </p>
              </div>
            </div>

            {preview.hasPending && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Atenție: Există documente în Pending Review!</AlertTitle>
                <AlertDescription>
                  Ai {preview.pendingInvoices} facturi și {preview.pendingTransactions} tranzacții bancare neconfirmate în această lună. 
                  Nu poți trimite pachetul până nu le revizuiești pe toate.
                </AlertDescription>
              </Alert>
            )}

            {preview.missingRecurring?.length > 0 && (
              <Alert variant="default" className="border-amber-500 bg-amber-50">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-800">Avertisment: Lipsesc facturi recurente</AlertTitle>
                <AlertDescription className="text-amber-700">
                  Nu au fost găsite facturi în această lună pentru următorii furnizori cu abonament:
                  <ul className="list-disc ml-5 mt-2">
                    {preview.missingRecurring.map((sup: string) => <li key={sup}>{sup}</li>)}
                  </ul>
                  Acest avertisment nu blochează trimiterea.
                </AlertDescription>
              </Alert>
            )}

            {!preview.hasPending && (
              <div className="flex justify-end pt-4 border-t">
                <Button size="lg" onClick={handleSend} disabled={sending}>
                  <Send className="w-4 h-4 mr-2" />
                  {sending ? 'Se trimite...' : 'Trimite la contabilitate'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

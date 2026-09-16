'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, CheckCircle2, FileText, Send, Loader2, ArrowUpRight, ArrowDownRight, Calculator } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { format, subMonths } from 'date-fns'
import Link from 'next/link'

export default function AccountingPage() {
  const [month, setMonth] = useState(format(subMonths(new Date(), 1), 'yyyy-MM')) // default last month
  
  // Dashboard state
  const [loadingDashboard, setLoadingDashboard] = useState(false)
  const [dashboardData, setDashboardData] = useState<any>(null)

  // Generator state
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<any>(null)
  const [sending, setSending] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    fetchDashboard()
    // reset generator when month changes
    setPreview(null)
    setSuccess(false)
  }, [month])

  const fetchDashboard = async () => {
    setLoadingDashboard(true)
    try {
      const res = await fetch(`/api/accounting/dashboard?month=${month}`)
      const json = await res.json()
      if (res.ok && json.data) {
        setDashboardData(json.data)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingDashboard(false)
    }
  }

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
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contabilitate & P&L</h1>
          <p className="text-muted-foreground mt-2">
            Situația financiară estimativă și generarea pachetului lunar pentru contabil.
          </p>
        </div>
        <div className="flex gap-4">
          <input 
            type="month" 
            value={month} 
            onChange={(e) => setMonth(e.target.value)} 
            className="flex h-10 w-[200px] rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <Link href="/accounting/settings">
            <Button variant="outline">Setări Fiscale</Button>
          </Link>
        </div>
      </div>


      {/* DASHBOARD P&L */}
      {loadingDashboard ? (
        <div className="h-32 flex items-center justify-center border rounded-xl bg-card">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : dashboardData ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Venituri Facturate</CardTitle>
              <ArrowUpRight className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData.venituriTotal.toLocaleString('ro-RO')} RON</div>
              <p className="text-xs text-muted-foreground mt-1">Facturi emise luna {month}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cheltuieli Recunoscute</CardTitle>
              <ArrowDownRight className="h-4 w-4 text-rose-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData.cheltuieliRecunoscute.toLocaleString('ro-RO')} RON</div>
              <p className="text-xs text-muted-foreground mt-1">
                Ajustate prin regulile de deducere 
                {dashboardData.tvaDeductibil > 0 && ` (+${dashboardData.tvaDeductibil.toLocaleString('ro-RO')} TVA)`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cashflow Real</CardTitle>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(dashboardData.cashIn - dashboardData.cashOut).toLocaleString('ro-RO')} RON
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                In: {dashboardData.cashIn.toLocaleString()} / Out: {dashboardData.cashOut.toLocaleString()}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-primary">Estimator Taxe</CardTitle>
              <Calculator className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{dashboardData.estimatedTax.toLocaleString('ro-RO')} RON</div>
              <p className="text-xs text-primary/80 mt-1">{dashboardData.taxDisclaimer}</p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <div className="h-8"></div>

      {/* PACHET CONTABIL */}
      <Card>
        <CardHeader>
          <CardTitle>Arhivă și Pachet Contabil</CardTitle>
          <CardDescription>Validează și trimite extrasele și facturile aferente lunii {month}.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handlePreview} disabled={loading} size="lg">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
            {loading ? 'Se verifică documentele...' : 'Analizează și Validează Pachetul'}
          </Button>
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
        <Card className="border-primary">
          <CardHeader>
            <CardTitle>Raport Verificare Pachet ({month})</CardTitle>
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
                  Ai {preview.pendingInvoices} facturi și {preview.pendingTransactions} tranzacții bancare neconfirmate. 
                  Nu poți trimite pachetul până nu finalizezi verificarea acestora.
                </AlertDescription>
              </Alert>
            )}

            {/* Informative yellow warnings (non-blocking) */}
            {preview.unmatchedTransactions > 0 && (
              <Alert className="border-amber-500 bg-amber-50">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-800">Atenționare: Tranzacții nereconciliate</AlertTitle>
                <AlertDescription className="text-amber-700">
                  Ai {preview.unmatchedTransactions} tranzacții bancare fără factură asociată sau motiv de respingere. 
                  Acest lucru nu blochează trimiterea pachetului.
                </AlertDescription>
              </Alert>
            )}

            {preview.invoicesWithoutDeductibility > 0 && (
              <Alert className="border-amber-500 bg-amber-50">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-800">Atenționare: Reguli de deductibilitate lipsă</AlertTitle>
                <AlertDescription className="text-amber-700">
                  Ai {preview.invoicesWithoutDeductibility} facturi fără regulă de deductibilitate setată.
                  Acest lucru nu blochează trimiterea pachetului.
                </AlertDescription>
              </Alert>
            )}

            {!preview.hasPending && (
              <div className="flex justify-end pt-4 border-t">
                <Button size="lg" onClick={handleSend} disabled={sending}>
                  <Send className="w-4 h-4 mr-2" />
                  {sending ? 'Se trimite...' : 'Trimite Arhiva Contabilului'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

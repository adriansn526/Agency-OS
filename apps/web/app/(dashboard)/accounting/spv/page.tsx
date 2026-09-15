'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Loader2, KeyRound, CheckCircle2, AlertCircle, Link as LinkIcon, Download, Copy } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

export default function SpvSettingsPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isConnected, setIsConnected] = useState(false)
  const [expiresAt, setExpiresAt] = useState<string | null>(null)

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search)
    if (searchParams.get('success') === 'true') {
      toast.success('Autentificare ANAF reușită!')
      window.history.replaceState(null, '', '/accounting/spv')
    }
    if (searchParams.get('error')) {
      toast.error(`Eroare ANAF: ${searchParams.get('error')}`)
      window.history.replaceState(null, '', '/accounting/spv')
    }

    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/accounting/spv/settings')
      const json = await res.json()
      if (json.data && json.data.accessToken) {
        setIsConnected(true)
        setExpiresAt(json.data.expiresAt)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const loginUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/accounting/spv/auth` : ''

  const handleCopyLink = () => {
    navigator.clipboard.writeText(loginUrl)
    toast.success('Link-ul a fost copiat! Trimite-l contabilului.')
  }

  if (isLoading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin w-8 h-8 text-muted-foreground" /></div>

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Integrare e-Factura (SPV)</h1>
        <p className="text-muted-foreground mt-2">
          Automatizează descărcarea facturilor de la furnizori (AP) conectând aplicația la Spațiul Privat Virtual ANAF.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* PASUL 1: Configurarea in sistem */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-primary" />
              1. Credențiale Aplicație
            </CardTitle>
            <CardDescription>
              Cheile API pentru ANAF (Client ID / Secret) sunt stocate securizat în variabilele de mediu ale serverului. 
              Contactează administratorul dacă apar erori de conectare.
            </CardDescription>
          </CardHeader>
          <CardContent>
             <Alert className="bg-slate-50">
               <AlertTitle>Configurație Server</AlertTitle>
               <AlertDescription>
                 Autentificarea este pregătită. Poți continua la pasul următor.
               </AlertDescription>
             </Alert>
          </CardContent>
        </Card>

        {/* PASUL 2: Autentificare cu Token */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LinkIcon className="w-5 h-5 text-primary" />
              2. Autentificare Utilizator SPV
            </CardTitle>
            <CardDescription>
              Apasă pe butonul de mai jos pentru a autoriza accesul folosind certificatul digital (stick-ul USB).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isConnected ? (
              <Alert className="bg-emerald-50 border-emerald-200 text-emerald-800">
                <CheckCircle2 className="h-4 w-4 stroke-emerald-600" />
                <AlertTitle>Conectat la SPV</AlertTitle>
                <AlertDescription>
                  Sistemul are un token activ. Expiră la: {expiresAt ? new Date(expiresAt).toLocaleString('ro-RO') : '-'}
                  <br/>
                  (Token-ul se va reînnoi automat în background).
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="bg-amber-50 border-amber-200 text-amber-800">
                <AlertCircle className="h-4 w-4 stroke-amber-600" />
                <AlertTitle>Neconectat</AlertTitle>
                <AlertDescription>
                  Trebuie să autorizezi aplicația accesând link-ul ANAF.
                </AlertDescription>
              </Alert>
            )}

            <Button asChild className="w-full bg-[#105C9C] hover:bg-[#0c467a] text-white">
              <a href="/api/accounting/spv/auth">
                Conectează-te cu ANAF
              </a>
            </Button>
            
            <div className="pt-4 border-t space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Alternativ: Trimite acest link contabilului</p>
              <div className="flex gap-2">
                <input readOnly value={loginUrl} className="flex h-9 w-full rounded-md border border-input bg-muted px-3 py-1 text-xs shadow-sm" />
                <Button variant="outline" size="icon" onClick={handleCopyLink} className="shrink-0">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {isConnected && (
        <Card className="border-emerald-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="w-5 h-5 text-emerald-600" />
              Sincronizare Manuală
            </CardTitle>
            <CardDescription>
              Descarcă instant cele mai noi mesaje e-Factura de la ANAF.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={async () => {
                const toastId = toast.loading('Sincronizare în curs...')
                try {
                  const res = await fetch('/api/accounting/spv/sync', { method: 'POST' })
                  const data = await res.json()
                  if (res.ok) {
                    toast.success(data.message, { id: toastId })
                  } else {
                    toast.error(data.error, { id: toastId })
                  }
                } catch (e) {
                  toast.error('Eroare rețea.', { id: toastId })
                }
              }} 
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Forțează Sincronizarea Acum
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

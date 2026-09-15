'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Loader2, Save } from 'lucide-react'

export function SettingsForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  
  const [settings, setSettings] = useState({
    accountantEmail: '',
    taxRegime: 'micro_1',
    taxRate: '1',
    isVatPayer: false,
    defaultVatRate: '19'
  })

  useEffect(() => {
    fetch('/api/accounting/settings')
      .then(res => res.json())
      .then(res => {
        if (res.data) {
          setSettings({
            accountantEmail: res.data.accountantEmail || '',
            taxRegime: res.data.taxRegime || 'micro_1',
            taxRate: res.data.taxRate?.toString() || '',
            isVatPayer: res.data.isVatPayer || false,
            defaultVatRate: res.data.defaultVatRate?.toString() || ''
          })
        }
      })
      .catch(err => console.error(err))
      .finally(() => setIsLoading(false))
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      const response = await fetch('/api/accounting/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })

      if (!response.ok) throw new Error('Failed to save settings')
      
      toast.success('Setările au fost salvate și istoricizate!')
      router.refresh()
    } catch (error) {
      toast.error('Eroare la salvarea setărilor')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return <div className="flex h-32 items-center justify-center border rounded-lg"><Loader2 className="animate-spin text-muted-foreground" /></div>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configurare Fiscală Curentă</CardTitle>
        <CardDescription>
          Salvează profilul actual. Va genera o nouă versiune istorică începând de azi.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-6">
          <div className="space-y-2 flex flex-col">
            <label className="text-sm font-medium leading-none">Email Contabil</label>
            <input 
              type="email" 
              required
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              value={settings.accountantEmail}
              onChange={(e: any) => setSettings(s => ({ ...s, accountantEmail: e.target.value }))}
              placeholder="contabil@exemplu.ro"
            />
            <p className="text-xs text-muted-foreground">La această adresă se vor trimite pachetele contabile lunare.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 flex flex-col">
              <label className="text-sm font-medium leading-none">Regim Fiscal</label>
              <select 
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                value={settings.taxRegime} 
                onChange={(e: any) => setSettings(s => ({ ...s, taxRegime: e.target.value }))}
              >
                <option value="micro_1">Microîntreprindere</option>
                <option value="profit_16">Impozit pe Profit</option>
                <option value="other">Altul</option>
              </select>
            </div>
            
            <div className="space-y-2 flex flex-col">
              <label className="text-sm font-medium leading-none">Cota de Impozitare (%)</label>
              <input 
                type="number" 
                step="0.1"
                required
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                value={settings.taxRate}
                onChange={(e: any) => setSettings(s => ({ ...s, taxRate: e.target.value }))}
                placeholder="Ex: 1 sau 16"
              />
            </div>
          </div>

          <div className="rounded-lg border p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label className="text-sm font-medium leading-none">Plătitor de TVA</label>
                <p className="text-sm text-muted-foreground">Activează calculul TVA pe extrase și facturi.</p>
              </div>
              <input 
                type="checkbox"
                className="h-4 w-4"
                checked={settings.isVatPayer}
                onChange={(e: any) => setSettings(s => ({ ...s, isVatPayer: e.target.checked }))}
              />
            </div>
            
            {settings.isVatPayer && (
              <div className="space-y-2 pt-2 border-t flex flex-col">
                <label className="text-sm font-medium leading-none">Cota Standard TVA (%)</label>
                <input 
                  type="number" 
                  step="1"
                  required={settings.isVatPayer}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  value={settings.defaultVatRate}
                  onChange={(e: any) => setSettings(s => ({ ...s, defaultVatRate: e.target.value }))}
                  placeholder="Ex: 19"
                />
              </div>
            )}
          </div>

          <Button type="submit" disabled={isSaving} className="w-full">
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Salvează Setările Noi
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

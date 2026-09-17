'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Loader2, Plus, Trash2, Pencil } from 'lucide-react'

type Rule = {
  id: string
  name: string
  supplierId?: string | null
  expenseCategory?: string | null
  vatDeductiblePercent: string
  expenseDeductiblePercent: string
  priority: number
  validFrom?: string
}

export function RulesTable() {
  const [rules, setRules] = useState<Rule[]>([])
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<Partial<Rule>>({
    name: '',
    supplierId: '',
    expenseCategory: '',
    vatDeductiblePercent: '100',
    expenseDeductiblePercent: '100',
    priority: 0,
    validFrom: new Date().toISOString().split('T')[0]
  })

  const loadData = async () => {
    try {
      const [rulesRes, catsRes] = await Promise.all([
        fetch('/api/accounting/rules'),
        fetch('/api/accounting/expense-categories?activeOnly=true')
      ])
      const rulesJson = await rulesRes.json()
      const catsJson = await catsRes.json()
      if (rulesJson.data) setRules(rulesJson.data)
      if (catsJson.data) setCategories(catsJson.data)
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const url = editingId ? `/api/accounting/rules/${editingId}` : '/api/accounting/rules'
      const method = editingId ? 'PUT' : 'POST'
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      if (!res.ok) throw new Error('Failed to save')
      
      toast.success(`Regulă ${editingId ? 'actualizată' : 'adăugată'} cu succes!`)
      setIsDialogOpen(false)
      setEditingId(null)
      loadData()
      setFormData({
        name: '', supplierId: '', expenseCategory: '',
        vatDeductiblePercent: '100', expenseDeductiblePercent: '100', priority: 0,
        validFrom: new Date().toISOString().split('T')[0]
      })
    } catch (error) {
      toast.error('Eroare la salvarea regulii')
    }
  }

  const handleEdit = (rule: Rule) => {
    setFormData({
      ...rule,
      validFrom: rule.validFrom ? new Date(rule.validFrom).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
    })
    setEditingId(rule.id)
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Ești sigur că vrei să invalidezi această regulă? Istoricul facturilor nu va fi afectat.')) return
    
    try {
      const res = await fetch(`/api/accounting/rules/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      
      toast.success('Regula a fost invalidată')
      loadData()
    } catch (error) {
      toast.error('Eroare la invalidare')
    }
  }

  if (isLoading) {
    return <div className="flex h-32 items-center justify-center border bg-background rounded-lg"><Loader2 className="animate-spin text-muted-foreground" /></div>
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Reguli Active</CardTitle>
          <CardDescription>Regulile sunt evaluate în ordinea priorității (cea mai mare câștigă).</CardDescription>
        </div>
        <Button size="sm" onClick={() => {
          setEditingId(null)
          setFormData({
            name: '', supplierId: '', expenseCategory: '',
            vatDeductiblePercent: '100', expenseDeductiblePercent: '100', priority: 0,
            validFrom: new Date().toISOString().split('T')[0]
          })
          setIsDialogOpen(!isDialogOpen)
        }}><Plus className="w-4 h-4 mr-2" /> Adaugă Regulă</Button>
      </CardHeader>
      
      {isDialogOpen && (
        <CardContent className="border-b bg-muted/30">
          <form onSubmit={handleSave} className="space-y-4 pt-4">
            <h3 className="font-medium">{editingId ? 'Editare Regulă' : 'Formular Regulă Nouă'}</h3>
            <div className="space-y-2 flex flex-col">
              <label className="text-sm font-medium">Nume Regulă (ex: Protocol 50%)</label>
              <input required className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm" value={formData.name} onChange={(e: any) => setFormData(f => ({...f, name: e.target.value}))} />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 flex flex-col">
                <label className="text-sm font-medium">Deducere Cheltuială (%)</label>
                <input type="number" required max="100" min="0" className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm" value={formData.expenseDeductiblePercent} onChange={(e: any) => setFormData(f => ({...f, expenseDeductiblePercent: e.target.value}))} />
              </div>
              <div className="space-y-2 flex flex-col">
                <label className="text-sm font-medium">Deducere TVA (%)</label>
                <input type="number" required max="100" min="0" className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm" value={formData.vatDeductiblePercent} onChange={(e: any) => setFormData(f => ({...f, vatDeductiblePercent: e.target.value}))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 flex flex-col">
                <label className="text-sm font-medium">Categorie Cheltuială</label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  value={formData.expenseCategory || ''}
                  onChange={(e: any) => setFormData(f => ({...f, expenseCategory: e.target.value}))}
                >
                  <option value="">-- Toate categoriile --</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2 flex flex-col">
                <label className="text-sm font-medium">Prioritate (mai mare = primul)</label>
                <input type="number" required className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm" value={formData.priority} onChange={(e: any) => setFormData(f => ({...f, priority: parseInt(e.target.value) || 0}))} />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 flex flex-col">
                <label className="text-sm font-medium">Valabil de la</label>
                <input type="date" required className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm" value={formData.validFrom as string} onChange={(e: any) => setFormData(f => ({...f, validFrom: e.target.value}))} />
                <span className="text-[10px] text-muted-foreground">Pentru a aplica regulilor facturilor istorice, setează o dată în trecut (ex: 01.01.2024).</span>
              </div>
              <div className="space-y-2 flex flex-col">
                <label className="text-sm font-medium">Furnizor ID (Opțional)</label>
                <input placeholder="CUID-ul furnizorului" className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm" value={formData.supplierId || ''} onChange={(e: any) => setFormData(f => ({...f, supplierId: e.target.value}))} />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="outline" onClick={() => {
                setIsDialogOpen(false)
                setEditingId(null)
              }}>Anulează</Button>
              <Button type="submit">Salvează Regula</Button>
            </div>
          </form>
        </CardContent>
      )}

      <CardContent className="pt-6">
        {rules.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">Nu ai configurat nicio regulă. Toate cheltuielile vor fi deduse 100%.</div>
        ) : (
          <div className="relative w-full overflow-auto">
            <table className="w-full caption-bottom text-sm">
              <thead className="[&_tr]:border-b">
                <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Nume / Condiție</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Prioritate</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Cheltuială Deductibilă</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">TVA Deductibil</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground"></th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {rules.map(rule => (
                  <tr key={rule.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                    <td className="p-4 align-middle">
                      <div className="font-medium">{rule.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {rule.expenseCategory ? `Cat: ${rule.expenseCategory}` : 'Toate categoriile'}
                      </div>
                    </td>
                    <td className="p-4 align-middle">{rule.priority}</td>
                    <td className="p-4 align-middle">{rule.expenseDeductiblePercent}%</td>
                    <td className="p-4 align-middle">{rule.vatDeductiblePercent}%</td>
                    <td className="p-4 align-middle text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(rule)} title="Editează">
                        <Pencil className="w-4 h-4 text-primary" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(rule.id)} title="Invalidează">
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

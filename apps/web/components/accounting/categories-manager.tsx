"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import { Plus, Edit2, Trash2, CheckSquare, Square, Merge, AlertCircle, Save, X } from "lucide-react"

type Category = {
  id: string
  name: string
  accountCode: string | null
  isActive: boolean
  _count: {
    rules: number
    suppliers: number
    invoices: number
  }
}

export function CategoriesManager() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  
  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Create
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState("")
  const [newCode, setNewCode] = useState("")

  // Edit
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editCode, setEditCode] = useState("")
  
  // Merge Mode
  const [showMergeModal, setShowMergeModal] = useState(false)
  const [mergeTargetId, setMergeTargetId] = useState<string>("")

  const loadCategories = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/accounting/expense-categories')
      const json = await res.json()
      if (json.data) setCategories(json.data)
    } catch (err) {
      toast.error('Eroare la încărcarea categoriilor')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCategories()
  }, [loadCategories])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    try {
      const res = await fetch('/api/accounting/expense-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, accountCode: newCode })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      toast.success('Categorie adăugată')
      setShowAdd(false)
      setNewName("")
      setNewCode("")
      loadCategories()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleSaveEdit = async () => {
    if (!editingId || !editName.trim()) return
    try {
      const res = await fetch(`/api/accounting/expense-categories/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, accountCode: editCode })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      toast.success('Categorie actualizată')
      setEditingId(null)
      loadCategories()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleToggleActive = async (cat: Category) => {
    try {
      const res = await fetch(`/api/accounting/expense-categories/${cat.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !cat.isActive })
      })
      if (!res.ok) throw new Error("Eroare")
      toast.success(cat.isActive ? 'Dezactivată' : 'Activată')
      loadCategories()
    } catch (err: any) {
      toast.error('Eroare la actualizare status')
    }
  }

  const handleDelete = async (cat: Category) => {
    if (!confirm(`Ștergi definitiv ${cat.name}?`)) return
    try {
      const res = await fetch(`/api/accounting/expense-categories/${cat.id}`, {
        method: 'DELETE'
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      toast.success('Ștearsă cu succes')
      loadCategories()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds)
    if (newSet.has(id)) newSet.delete(id)
    else newSet.add(id)
    setSelectedIds(newSet)
  }

  const handleMerge = async () => {
    if (!mergeTargetId) return
    const sourceIds = Array.from(selectedIds).filter(id => id !== mergeTargetId)
    if (sourceIds.length === 0) {
      toast.error('Selectează cel puțin o altă categorie sursă')
      return
    }

    try {
      const res = await fetch('/api/accounting/expense-categories/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetId: mergeTargetId, sourceIds })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      toast.success(`Categoriile au fost îmbinate în ${json.mergedInto}`)
      setShowMergeModal(false)
      setSelectedIds(new Set())
      loadCategories()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  if (loading) return <div className="p-4">Se încarcă...</div>

  return (
    <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden flex flex-col h-[500px]">
      <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Categorii de Cheltuieli</h3>
          <p className="text-xs text-muted-foreground mt-1">Gestionează nomenclatorul pentru deductibilitate</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 1 && (
            <button
              onClick={() => setShowMergeModal(true)}
              className="h-8 px-3 bg-primary/10 text-primary rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors flex items-center gap-2"
            >
              <Merge size={14} /> Merge ({selectedIds.size})
            </button>
          )}
          <button 
            onClick={() => setShowAdd(!showAdd)}
            className="h-8 px-3 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <Plus size={14} /> Adaugă
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-muted/50 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 font-medium text-muted-foreground w-10">
                <div 
                  className="cursor-pointer"
                  onClick={() => {
                    if (selectedIds.size === categories.length) setSelectedIds(new Set())
                    else setSelectedIds(new Set(categories.map(c => c.id)))
                  }}
                >
                  {selectedIds.size > 0 && selectedIds.size === categories.length ? <CheckSquare className="text-primary w-4 h-4" /> : <Square className="text-muted-foreground w-4 h-4" />}
                </div>
              </th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Nume</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Cont Sintetic</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Utilizare</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 font-medium text-muted-foreground text-right">Acțiuni</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {showAdd && (
              <tr className="bg-muted/10">
                <td className="px-4 py-3"></td>
                <td className="px-4 py-3">
                  <input 
                    autoFocus
                    placeholder="Nume categorie..."
                    className="h-8 px-2 w-full text-sm border rounded"
                    value={newName} onChange={e => setNewName(e.target.value)}
                  />
                </td>
                <td className="px-4 py-3">
                  <input 
                    placeholder="Ex: 628"
                    className="h-8 px-2 w-24 text-sm border rounded"
                    value={newCode} onChange={e => setNewCode(e.target.value)}
                  />
                </td>
                <td colSpan={3} className="px-4 py-3 text-right">
                  <button onClick={handleAdd} className="text-primary text-sm font-medium mr-3">Salvează</button>
                  <button onClick={() => setShowAdd(false)} className="text-muted-foreground text-sm">Anulează</button>
                </td>
              </tr>
            )}

            {categories.map(cat => (
              <tr key={cat.id} className={`hover:bg-muted/30 transition-colors ${selectedIds.has(cat.id) ? 'bg-primary/5' : ''}`}>
                <td className="px-4 py-3">
                  <div className="cursor-pointer" onClick={() => toggleSelect(cat.id)}>
                    {selectedIds.has(cat.id) ? <CheckSquare className="text-primary w-4 h-4" /> : <Square className="text-muted-foreground w-4 h-4" />}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {editingId === cat.id ? (
                    <input 
                      autoFocus
                      className="h-8 px-2 w-full text-sm border rounded"
                      value={editName} onChange={e => setEditName(e.target.value)}
                    />
                  ) : (
                    <span className="font-medium">{cat.name}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {editingId === cat.id ? (
                    <input 
                      className="h-8 px-2 w-24 text-sm border rounded"
                      value={editCode} onChange={e => setEditCode(e.target.value)}
                    />
                  ) : (
                    cat.accountCode || '-'
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2 text-xs">
                    <span className="px-2 py-0.5 bg-muted rounded-full" title="Facturi">{cat._count.invoices} fact</span>
                    <span className="px-2 py-0.5 bg-muted rounded-full" title="Furnizori">{cat._count.suppliers} furn</span>
                    <span className="px-2 py-0.5 bg-muted rounded-full" title="Reguli">{cat._count.rules} reg</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <button 
                    onClick={() => handleToggleActive(cat)}
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${cat.isActive ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}
                  >
                    {cat.isActive ? 'Activ' : 'Inactiv'}
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  {editingId === cat.id ? (
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={handleSaveEdit} className="p-1.5 text-success hover:bg-success/10 rounded"><Save size={14} /></button>
                      <button onClick={() => setEditingId(null)} className="p-1.5 text-muted-foreground hover:bg-muted rounded"><X size={14} /></button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-end gap-1">
                      <button 
                        onClick={() => {
                          setEditingId(cat.id)
                          setEditName(cat.name)
                          setEditCode(cat.accountCode || '')
                        }}
                        className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={() => handleDelete(cat)}
                        className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showMergeModal && (
        <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-surface w-full max-w-md rounded-xl p-6 shadow-xl">
            <h3 className="text-lg font-bold mb-4">Îmbină Categorii (Merge)</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Ai selectat {selectedIds.size} categorii. Alege categoria de destinație. Toate referințele din facturi, furnizori și reguli vor fi mutate pe ea, iar restul vor fi șterse.
            </p>

            <div className="space-y-2 mb-6">
              <label className="text-sm font-medium">Categoria Principală (Destinație)</label>
              <select
                value={mergeTargetId}
                onChange={e => setMergeTargetId(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm"
              >
                <option value="">-- Alege Destinația --</option>
                {Array.from(selectedIds).map(id => {
                  const c = categories.find(cat => cat.id === id)
                  if (!c) return null
                  return <option key={id} value={id}>{c.name}</option>
                })}
              </select>
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => setShowMergeModal(false)} className="px-4 py-2 text-sm font-medium hover:bg-muted rounded-lg">Anulează</button>
              <button onClick={handleMerge} disabled={!mergeTargetId} className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg disabled:opacity-50">Îmbină Acum</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
